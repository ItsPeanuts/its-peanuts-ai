from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import OpenAI
import os
import json

router = APIRouter()

# =========================
# OpenAI client
# =========================

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    print("WAARSCHUWING: OPENAI_API_KEY is niet ingesteld.")

client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None


# =========================
# Pydantic modellen
# =========================

class RewriteCVRequest(BaseModel):
    cv_text: str
    target_role: Optional[str] = None
    language: str = "nl"


class RewriteCVResponse(BaseModel):
    rewritten_cv: str


class MotivationLetterRequest(BaseModel):
    cv_text: str
    job_description: str
    company_name: Optional[str] = None
    language: str = "nl"
    tone: str = "professioneel"


class MotivationLetterResponse(BaseModel):
    letter: str


class MatchJobRequest(BaseModel):
    candidate_profile_text: str
    job_description: str


class MatchJobResponse(BaseModel):
    match_score: int
    explanation: str


# =========================
# Helpers
# =========================

def ensure_client():
    if client is None:
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY is niet ingesteld in de omgeving."
        )
    return client


# =========================
# Endpoint: CV herschrijven
# =========================

@router.post("/rewrite-cv", response_model=RewriteCVResponse)
def rewrite_cv(payload: RewriteCVRequest) -> RewriteCVResponse:
    """
    Herschrijf een CV netjes voor recruiters.
    """
    c = ensure_client()

    system_prompt = (
        "Je bent een Nederlandse recruitment-copywriter. "
        "Je herschrijft CV-tekst netjes, duidelijk en professioneel, "
        "zodat recruiters het makkelijk kunnen scannen. "
        "Gebruik duidelijke kopjes (Profiel, Werkervaring, Opleiding, Vaardigheden) "
        "en bulletpoints. Houd de toon zakelijk maar menselijk."
    )

    if payload.target_role:
        user_extra = (
            f"De kandidaat wil solliciteren als: {payload.target_role}. "
            "Benadruk ervaring en vaardigheden die daarbij passen."
        )
    else:
        user_extra = "Herschrijf de CV-tekst professioneel, zonder iets te verzinnen."

    user_content = (
        f"{user_extra}\n\n"
        f"CV-tekst:\n{payload.cv_text}"
    )

    try:
        resp = c.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ]
        )
        rewritten = resp.choices[0].message.content.strip()
        return RewriteCVResponse(rewritten_cv=rewritten)
    except Exception as e:
        # Fout netjes teruggeven i.p.v. 500 naar frontend
        msg = (
            "ER GING IETS MIS BIJ OPENAI: "
            f"{str(e)}"
        )
        return RewriteCVResponse(rewritten_cv=msg)


# =========================
# Endpoint: Motivatiebrief
# =========================

@router.post("/motivation-letter", response_model=MotivationLetterResponse)
def motivation_letter(payload: MotivationLetterRequest) -> MotivationLetterResponse:
    """
    Schrijf een motivatiebrief op basis van CV + vacaturetekst.
    """
    c = ensure_client()

    company_line = (
        f"De brief is gericht aan: {payload.company_name}.\n"
        if payload.company_name
        else "Noem het bedrijf algemeen (bijvoorbeeld 'uw organisatie').\n"
    )

    system_prompt = (
        "Je bent een Nederlandse recruiter die sterke motivatiebrieven schrijft. "
        "Je schrijft in de ik-vorm, professioneel en concreet. "
        "Maximaal ongeveer 3/4 A4, duidelijke opbouw: intro, waarom de functie/organisatie, "
        "wat breng ik mee, afronding met call-to-action."
    )

    user_content = (
        f"{company_line}"
        f"Toon: {payload.tone}.\n\n"
        f"CV-tekst:\n{payload.cv_text}\n\n"
        f"Vacaturetekst:\n{payload.job_description}"
    )

    try:
        resp = c.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ]
        )
        letter = resp.choices[0].message.content.strip()
        return MotivationLetterResponse(letter=letter)
    except Exception as e:
        msg = (
            "ER GING IETS MIS BIJ OPENAI BIJ HET MAKEN VAN DE MOTIVATIEBRIEF: "
            f"{str(e)}"
        )
        return MotivationLetterResponse(letter=msg)


# =========================
# Endpoint: Matchscore kandidaat <-> vacature
# =========================

@router.post("/match-job", response_model=MatchJobResponse)
def match_job(payload: MatchJobRequest) -> MatchJobResponse:
    """
    Laat AI een matchscore (0-100) geven tussen kandidaatprofiel en vacature.
    """
    c = ensure_client()

    system_prompt = (
        "Je bent een ervaren recruiter. "
        "Je krijgt een samenvatting van een kandidaat en een vacaturetekst. "
        "Je beoordeelt hoe goed de kandidaat past bij de vacature.\n\n"
        "Geef:\n"
        "- Een matchscore tussen 0 en 100 (alleen hele getallen).\n"
        "- Een korte uitleg in het Nederlands waarom je deze score geeft.\n\n"
        "Geef ALLEEN een JSON-object terug met de keys 'match_score' (int) en 'explanation' (string)."
    )

    user_content = (
        "KANDIDAATPROFIEL:\n"
        f"{payload.candidate_profile_text}\n\n"
        "VACATURETEKST:\n"
        f"{payload.job_description}"
    )

    try:
        resp = c.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            response_format={"type": "json_object"}
        )

        raw = resp.choices[0].message.content
        data = json.loads(raw)

        score = int(data.get("match_score", 0))
        explanation = data.get("explanation", "").strip() or "Geen uitleg ontvangen."

        # Zorg dat score altijd netjes tussen 0 en 100 blijft
        if score < 0:
            score = 0
        if score > 100:
            score = 100

        return MatchJobResponse(match_score=score, explanation=explanation)
    except Exception as e:
        # Geen harde 500 naar de voorkant, maar een nette fallback
        fallback_explanation = (
            "Er ging iets mis bij het berekenen van de matchscore met OpenAI. "
            f"Technische fout: {str(e)}"
        )
        return MatchJobResponse(match_score=0, explanation=fallback_explanation)
