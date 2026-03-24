"""
Sales Agent + Marketing Agent — Uitsluitend toegankelijk vanuit Admin portaal

Endpoints:
  POST   /admin/agents/sales          Genereer gepersonaliseerde sales outreach
  GET    /admin/agents/sales          Lijst van leads (filter op status)
  PATCH  /admin/agents/sales/{id}     Pas status + notities aan
  DELETE /admin/agents/sales/{id}     Verwijder lead

  POST   /admin/agents/marketing      Genereer social media content
  GET    /admin/agents/marketing      Lijst van content (filter op platform/status)
  PATCH  /admin/agents/marketing/{id} Pas status aan
  DELETE /admin/agents/marketing/{id} Verwijder content

BELANGRIJK: Werkgevers en kandidaten zien deze endpoints NOOIT.
Alle endpoints vereisen role=admin.
"""

import json
import os
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.db import get_db
from backend import models
from backend.routers.auth import get_current_user, require_role
from openai import OpenAI

router = APIRouter(tags=["admin-agents"])

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
_ai = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

# ── VorzaIQ kennisbank ─────────────────────────────────────────────────────────

VORZAIQ_CONTEXT = """
VorzaIQ is een AI recruitment platform dat werkgevers en kandidaten slimmer samenbrengt.
Website: vorzaiq.com

USP'S VOOR WERKGEVERS:
• AI pre-screening — elke sollicitant krijgt automatisch een matchscore (0-100) met sterkte/zwakte analyse
• Lisa AI Recruiter — virtuele AI-avatar voert het eerste videointerview automatisch af, 24/7 beschikbaar
• AI vacatureschrijver — geef je website URL, AI schrijft een professionele vacaturetekst in seconden
• Microsoft Teams-integratie — 2e gesprek automatisch ingepland als kandidaat voldoende scoort
• Smart analytics — inzicht in conversie, matchscores en kandidaatstromen per vacature
• Team beheer — collega's van hetzelfde bedrijfsdomein toevoegen aan je account
• CRM-koppeling — sync met HubSpot
• Tijdsbesparing — gemiddeld 70% minder handmatig werk in de eerste selectieronde
• Drie plannen: Gratis, Normaal, Premium — details op vorzaiq.com

USP'S VOOR KANDIDATEN:
• Slimme sollicitatiewizard — 4-staps proces: CV, motivatiebrief, intake, matchscore
• AI CV-herschrijver — upload je CV, AI maakt het professioneel en ATS-geoptimaliseerd
• AI motivatiebrief generator — gepersonaliseerd per vacature in seconden
• Matchscore — transparant zien hoe goed je past bij een vacature vóór je solliciteert
• Lisa AI Recruiter — laagdrempelig voorgesprek met AI, 24/7 beschikbaar
• Videointerview vanuit huis — comfortabel, geen reistijd
• Eerlijk selectieproces — AI beoordeelt op vaardigheden, niet op naam of achtergrond
""".strip()


# ── Schemas ────────────────────────────────────────────────────────────────────

class SalesRequest(BaseModel):
    company_name: str
    sector: str
    company_size: Literal["small", "medium", "large"] = "medium"
    contact_name: Optional[str] = None
    contact_role: Optional[str] = None
    channel: Literal["email", "linkedin", "phone_script"] = "email"
    language: Literal["nl", "en"] = "nl"
    custom_notes: Optional[str] = None


class SalesLeadOut(BaseModel):
    id: int
    company_name: str
    sector: Optional[str]
    company_size: Optional[str]
    contact_name: Optional[str]
    contact_role: Optional[str]
    channel: Optional[str]
    language: Optional[str]
    subject: Optional[str]
    message: Optional[str]
    follow_up: Optional[str]
    key_usps: Optional[List[str]]
    status: str
    internal_notes: Optional[str]
    created_at: Optional[str]

    class Config:
        from_attributes = True


class PatchSalesLeadRequest(BaseModel):
    status: Optional[Literal["generated", "sent", "replied", "converted", "archived"]] = None
    internal_notes: Optional[str] = None


class MarketingRequest(BaseModel):
    platform: Literal["linkedin", "instagram", "twitter", "facebook"]
    audience: Literal["employers", "candidates", "both"] = "both"
    topic: str
    tone: Literal["professional", "casual", "inspiring"] = "professional"
    count: int = 3
    language: Literal["nl", "en"] = "nl"


class MarketingPost(BaseModel):
    content: str
    hashtags: List[str]
    image_prompt: str


class MarketingContentOut(BaseModel):
    id: int
    platform: Optional[str]
    audience: Optional[str]
    topic: Optional[str]
    tone: Optional[str]
    language: Optional[str]
    posts: Optional[List[MarketingPost]]
    calendar_tip: Optional[str]
    status: str
    created_at: Optional[str]

    class Config:
        from_attributes = True


class PatchMarketingRequest(BaseModel):
    status: Optional[Literal["draft", "scheduled", "published"]] = None


# ── Helpers ────────────────────────────────────────────────────────────────────

def _call_ai(prompt: str, system: str) -> str:
    if not _ai:
        raise HTTPException(status_code=503, detail="OpenAI niet geconfigureerd (OPENAI_API_KEY ontbreekt)")
    try:
        resp = _ai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            max_tokens=1200,
            temperature=0.8,
            response_format={"type": "json_object"},
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI-generatie mislukt: {str(e)}")


def _parse_lead(lead: models.SalesLead) -> SalesLeadOut:
    key_usps = []
    if lead.key_usps:
        try:
            key_usps = json.loads(lead.key_usps)
        except Exception:
            key_usps = [lead.key_usps]
    return SalesLeadOut(
        id=lead.id,
        company_name=lead.company_name,
        sector=lead.sector,
        company_size=lead.company_size,
        contact_name=lead.contact_name,
        contact_role=lead.contact_role,
        channel=lead.channel,
        language=lead.language,
        subject=lead.subject,
        message=lead.message,
        follow_up=lead.follow_up,
        key_usps=key_usps,
        status=lead.status or "generated",
        internal_notes=lead.internal_notes,
        created_at=str(lead.created_at) if lead.created_at else None,
    )


def _parse_marketing(mc: models.MarketingContent) -> MarketingContentOut:
    posts = []
    if mc.posts:
        try:
            raw = json.loads(mc.posts)
            posts = [MarketingPost(**p) for p in raw]
        except Exception:
            pass
    return MarketingContentOut(
        id=mc.id,
        platform=mc.platform,
        audience=mc.audience,
        topic=mc.topic,
        tone=mc.tone,
        language=mc.language,
        posts=posts,
        calendar_tip=mc.calendar_tip,
        status=mc.status or "draft",
        created_at=str(mc.created_at) if mc.created_at else None,
    )


# ── Sales Agent endpoints ──────────────────────────────────────────────────────

@router.post("/admin/agents/sales", response_model=SalesLeadOut, status_code=201)
def generate_sales_lead(
    payload: SalesRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Laat de Sales Agent gepersonaliseerde outreach genereren voor een potentiële klant.
    Slaat het resultaat op als SalesLead.
    """
    require_role(current_user, "admin")

    size_label = {"small": "klein (<25 medewerkers)", "medium": "middelgroot (25-200)", "large": "groot (>200 medewerkers)"}
    channel_label = {"email": "zakelijke e-mail", "linkedin": "LinkedIn Direct Message", "phone_script": "belscript"}

    system_prompt = f"""Je bent een B2B sales expert voor VorzaIQ.

{VORZAIQ_CONTEXT}

Schrijf gepersonaliseerde outreach voor {channel_label.get(payload.channel, payload.channel)}.
Taal: {"Nederlands" if payload.language == "nl" else "Engels"}.

Kanaal-specifieke regels:
- email: pakkende subject (max 60 tekens), body max 150 woorden, directe opening, 1 concrete CTA
- linkedin: max 100 woorden, persoonlijker en informeler dan e-mail, direct aanspreken
- phone_script: gespreksstructuur met: openingszin, 3 gespreksopeners (open vragen), bezwaarbehandeling, CTA
- Noem NOOIT specifieke prijzen → verwijs naar vorzaiq.com voor details
- CTA = gratis demo aanvragen of een kort gesprek van 15 minuten inplannen
- Schrijf in de opgegeven taal

Geef UITSLUITEND geldige JSON terug (geen markdown, geen extra tekst):
{{"subject": "...", "message": "...", "follow_up": "...", "key_usps": ["...", "..."]}}
- subject: e-mailonderwerp of lege string bij andere kanalen
- message: het hoofdbericht (klaar om te versturen)
- follow_up: opvolgbericht 3-5 dagen later
- key_usps: lijst van 2-4 VorzaIQ-voordelen die het meest relevant zijn voor dit bedrijf"""

    user_prompt = f"""Bedrijf: {payload.company_name}
Sector: {payload.sector}
Grootte: {size_label.get(payload.company_size, payload.company_size)}
Contactpersoon: {payload.contact_name or "onbekend"} ({payload.contact_role or "onbekende rol"})
Extra context: {payload.custom_notes or "geen"}"""

    raw = _call_ai(user_prompt, system_prompt)

    try:
        data = json.loads(raw)
    except Exception:
        raise HTTPException(status_code=502, detail="AI gaf geen geldige JSON terug")

    lead = models.SalesLead(
        company_name=payload.company_name,
        sector=payload.sector,
        company_size=payload.company_size,
        contact_name=payload.contact_name,
        contact_role=payload.contact_role,
        channel=payload.channel,
        language=payload.language,
        custom_notes=payload.custom_notes,
        subject=data.get("subject", ""),
        message=data.get("message", ""),
        follow_up=data.get("follow_up", ""),
        key_usps=json.dumps(data.get("key_usps", []), ensure_ascii=False),
        status="generated",
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)

    return _parse_lead(lead)


@router.get("/admin/agents/sales", response_model=List[SalesLeadOut])
def list_sales_leads(
    status: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Lijst van sales leads, optioneel gefilterd op status."""
    require_role(current_user, "admin")
    q = db.query(models.SalesLead).order_by(models.SalesLead.created_at.desc())
    if status:
        q = q.filter(models.SalesLead.status == status)
    return [_parse_lead(l) for l in q.limit(limit).all()]


@router.patch("/admin/agents/sales/{lead_id}", response_model=SalesLeadOut)
def patch_sales_lead(
    lead_id: int,
    payload: PatchSalesLeadRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Pas de status en/of interne notities van een lead aan."""
    require_role(current_user, "admin")
    lead = db.query(models.SalesLead).filter(models.SalesLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead niet gevonden")
    if payload.status is not None:
        lead.status = payload.status
    if payload.internal_notes is not None:
        lead.internal_notes = payload.internal_notes
    db.commit()
    db.refresh(lead)
    return _parse_lead(lead)


@router.delete("/admin/agents/sales/{lead_id}", status_code=204)
def delete_sales_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Verwijder een sales lead."""
    require_role(current_user, "admin")
    lead = db.query(models.SalesLead).filter(models.SalesLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead niet gevonden")
    db.delete(lead)
    db.commit()


# ── Marketing Agent endpoints ──────────────────────────────────────────────────

@router.post("/admin/agents/marketing", response_model=MarketingContentOut, status_code=201)
def generate_marketing_content(
    payload: MarketingRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Laat de Marketing Agent social media content genereren.
    Slaat het resultaat op als MarketingContent.
    """
    require_role(current_user, "admin")

    count = max(1, min(5, payload.count))
    platform_rules = {
        "linkedin":  "max 1200 tekens, professionele toon, eindig altijd met een open vraag aan de lezers",
        "instagram": "levendige caption met 3-5 relevante emojis, alle hashtags (10-15 stuks) in het hashtags veld",
        "twitter":   "max 270 tekens, krachtige openingszin, 2-3 hashtags in de tekst",
        "facebook":  "verhalend en toegankelijk, 3-5 hashtags, informele toon",
    }
    audience_label = {"employers": "werkgevers (HR managers, directeuren)", "candidates": "werkzoekenden en kandidaten", "both": "zowel werkgevers als kandidaten"}
    tone_label = {"professional": "professioneel en zakelijk", "casual": "casual en toegankelijk", "inspiring": "inspirerend en motiverend"}

    system_prompt = f"""Je bent een social media content expert voor VorzaIQ.

{VORZAIQ_CONTEXT}

Platform: {payload.platform} — {platform_rules.get(payload.platform, "")}
Doelgroep: {audience_label.get(payload.audience, payload.audience)}
Toon: {tone_label.get(payload.tone, payload.tone)}
Taal: {"Nederlands" if payload.language == "nl" else "Engels"}

Regels:
- Maak {count} unieke posts die NIET op elkaar lijken
- Elke post focust op een ander aspect van VorzaIQ
- image_prompt: Engelse beschrijving voor DALL-E/Midjourney (professioneel, realistisch)
- Geen prijzen noemen — verwijs naar vorzaiq.com
- Alle hashtags in het hashtags-array, niet in content (behalve Twitter)

Geef UITSLUITEND geldige JSON (geen markdown):
{{"posts": [{{"content": "...", "hashtags": ["#VorzaIQ", ...], "image_prompt": "..."}}], "calendar_tip": "..."}}
calendar_tip: beste dag en tijdstip om te posten op dit platform"""

    user_prompt = f"Maak {count} social media posts over het onderwerp: {payload.topic}"

    raw = _call_ai(user_prompt, system_prompt)

    try:
        data = json.loads(raw)
    except Exception:
        raise HTTPException(status_code=502, detail="AI gaf geen geldige JSON terug")

    posts_list = data.get("posts", [])
    if not isinstance(posts_list, list):
        raise HTTPException(status_code=502, detail="AI-respons heeft geen geldige posts lijst")

    mc = models.MarketingContent(
        platform=payload.platform,
        audience=payload.audience,
        topic=payload.topic,
        tone=payload.tone,
        language=payload.language,
        posts=json.dumps(posts_list, ensure_ascii=False),
        calendar_tip=data.get("calendar_tip", ""),
        status="draft",
    )
    db.add(mc)
    db.commit()
    db.refresh(mc)

    return _parse_marketing(mc)


@router.get("/admin/agents/marketing", response_model=List[MarketingContentOut])
def list_marketing_content(
    platform: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Lijst van gegenereerde marketing content, optioneel gefilterd."""
    require_role(current_user, "admin")
    q = db.query(models.MarketingContent).order_by(models.MarketingContent.created_at.desc())
    if platform:
        q = q.filter(models.MarketingContent.platform == platform)
    if status:
        q = q.filter(models.MarketingContent.status == status)
    return [_parse_marketing(mc) for mc in q.limit(limit).all()]


@router.patch("/admin/agents/marketing/{mc_id}", response_model=MarketingContentOut)
def patch_marketing_content(
    mc_id: int,
    payload: PatchMarketingRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Pas de status van marketing content aan."""
    require_role(current_user, "admin")
    mc = db.query(models.MarketingContent).filter(models.MarketingContent.id == mc_id).first()
    if not mc:
        raise HTTPException(status_code=404, detail="Marketing content niet gevonden")
    if payload.status is not None:
        mc.status = payload.status
    db.commit()
    db.refresh(mc)
    return _parse_marketing(mc)


@router.delete("/admin/agents/marketing/{mc_id}", status_code=204)
def delete_marketing_content(
    mc_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Verwijder marketing content."""
    require_role(current_user, "admin")
    mc = db.query(models.MarketingContent).filter(models.MarketingContent.id == mc_id).first()
    if not mc:
        raise HTTPException(status_code=404, detail="Marketing content niet gevonden")
    db.delete(mc)
    db.commit()
