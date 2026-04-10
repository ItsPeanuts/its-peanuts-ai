"""
AI Recruiter Chat — "Lisa"

Flow:
1. POST /ai/recruiter/{app_id}/start
   → Laadt CV + vacature + gaps uit AIResult
   → AI stelt zich voor en stelt de eerste vraag over een gap
   → Sla recruiter bericht op in DB

2. POST /ai/recruiter/{app_id}/message
   → Kandidaat stuurt antwoord
   → Sla kandidaat bericht op
   → AI leest volledige conversatiegeschiedenis + context
   → Genereert vervolgvraag of sluitingsbericht
   → Sla recruiter antwoord op

3. GET /ai/recruiter/{app_id}/messages
   → Geeft volledige chatgeschiedenis terug
"""

import os
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from openai import OpenAI

from backend.db import get_db
from backend import models
from backend.routers.auth import get_current_user

router = APIRouter(prefix="/ai/recruiter", tags=["recruiter-chat"])

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

MAX_QUESTIONS = 3  # Lisa stelt 3 vragen, bericht 4 is het sluitingsbericht

LANG_NAMES = {"nl": "Dutch", "en": "English", "de": "German", "fr": "French", "es": "Spanish"}

def _get_language(request: Request) -> str:
    """Lees de voorkeurstaal uit de Accept-Language header."""
    header = request.headers.get("accept-language", "nl")
    lang = header.split(",")[0].strip().split("-")[0].lower()
    return lang if lang in LANG_NAMES else "nl"


# ── Schemas ─────────────────────────────────────────────────────────────

class ChatMessageOut(BaseModel):
    id: int
    role: str       # "recruiter" | "candidate"
    content: str
    created_at: str

    class Config:
        from_attributes = True


class SendMessageIn(BaseModel):
    content: str


# ── Helpers ─────────────────────────────────────────────────────────────

def _get_application_context(app_id: int, db: Session) -> dict:
    """Haal alle relevante context op voor de AI recruiter."""
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Sollicitatie niet gevonden")

    candidate = db.query(models.User).filter(models.User.id == app.candidate_id).first()
    vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == app.vacancy_id).first()
    ai_result = (
        db.query(models.AIResult)
        .filter(models.AIResult.application_id == app_id)
        .first()
    )
    cv = (
        db.query(models.CandidateCV)
        .filter(models.CandidateCV.candidate_id == app.candidate_id)
        .order_by(models.CandidateCV.id.desc())
        .first()
    )

    employer = (
        db.query(models.User).filter(models.User.id == vacancy.employer_id).first()
        if vacancy else None
    )

    return {
        "app": app,
        "candidate_name": candidate.full_name if candidate else "Kandidaat",
        "vacancy_title": vacancy.title if vacancy else "Vacature",
        "vacancy_description": vacancy.description or "" if vacancy else "",
        "employer_name": employer.full_name if employer else "It's Peanuts AI",
        "match_score": ai_result.match_score if ai_result else None,
        "gaps": ai_result.gaps if ai_result else "",
        "strengths": ai_result.strengths if ai_result else "",
        "suggested_questions": ai_result.suggested_questions if ai_result else "",
        "cv_text": cv.extracted_text or "" if cv else "",
    }


def _build_system_prompt(ctx: dict, language: str = "nl") -> str:
    lang_instruction = f"Always respond in {LANG_NAMES.get(language, 'Dutch')}."
    return f"""Je bent Lisa, HR-recruiter bij {ctx['employer_name']}.

Je hebt {ctx['candidate_name']} uitgenodigd voor een eerste kennismakingsgesprek over de functie {ctx['vacancy_title']}.
Dit is een informeel maar professioneel gesprek. Je bent nieuwsgierig, warm en direct.

ACHTERGROND (intern — niet letterlijk noemen):
- Vacature: {ctx['vacancy_title']} bij {ctx['employer_name']}
- Functiebeschrijving: {ctx['vacancy_description'][:600] if ctx['vacancy_description'] else 'niet beschikbaar'}
- Sterke punten kandidaat: {ctx['strengths'] or 'nog niet bekend'}
- Aandachtspunten: {ctx['gaps'] or 'geen specifieke gaps'}
- CV highlights: {ctx['cv_text'][:800] if ctx['cv_text'] else 'CV niet beschikbaar'}
- Interviewvragen om te stellen: {ctx['suggested_questions'] or 'gebruik je eigen oordeel'}

GESPREKSSTIJL:
- Praat zoals een echte HR-recruiter: warm, betrokken, nieuwsgierig
- Reageer altijd eerst kort op wat de kandidaat zegt voordat je een nieuwe vraag stelt
- Gebruik de voornaam van de kandidaat af en toe, maar niet bij elk bericht
- Stel 1 vraag per keer — nooit meerdere vragen tegelijk
- Maximaal 3 zinnen per bericht
- Geen bullet points, geen opsommingen

GESPREKSDOEL:
- Stel {MAX_QUESTIONS} gerichte vragen over de aandachtspunten en motivatie van de kandidaat
- Diep door op interessante antwoorden ("Interessant, kun je daar een voorbeeld van geven?")
- Als een antwoord onduidelijk is, vraag vriendelijk om verduidelijking
- Sluit het gesprek na {MAX_QUESTIONS} vragen positief af zonder nieuwe vragen te stellen

{lang_instruction}
"""


def _count_recruiter_messages(app_id: int, db: Session) -> int:
    return (
        db.query(models.RecruiterChatMessage)
        .filter(
            models.RecruiterChatMessage.application_id == app_id,
            models.RecruiterChatMessage.role == "recruiter",
        )
        .count()
    )


def _get_conversation_history(app_id: int, db: Session) -> list:
    messages = (
        db.query(models.RecruiterChatMessage)
        .filter(models.RecruiterChatMessage.application_id == app_id)
        .order_by(models.RecruiterChatMessage.created_at.asc())
        .all()
    )
    return [
        {"role": "assistant" if m.role == "recruiter" else "user", "content": m.content}
        for m in messages
    ]


def _save_message(app_id: int, role: str, content: str, db: Session) -> models.RecruiterChatMessage:
    msg = models.RecruiterChatMessage(
        application_id=app_id,
        role=role,
        content=content,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def _call_ai(system_prompt: str, history: list) -> str:
    if not client:
        return "De AI recruiter is momenteel niet beschikbaar. Zorg dat OPENAI_API_KEY is ingesteld."
    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": system_prompt}] + history,
            max_tokens=300,
            temperature=0.7,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        return f"Er ging iets mis: {str(e)}"


# ── Endpoints ────────────────────────────────────────────────────────────

@router.post("/{app_id}/start", response_model=ChatMessageOut)
def start_conversation(
    app_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Start de AI recruiter chat voor een sollicitatie."""
    # Verificeer dat de kandidaat eigenaar is van deze sollicitatie
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Sollicitatie niet gevonden")
    if app.candidate_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Geen toegang tot deze sollicitatie")

    # Controleer plan-limiet voor chatbot Lisa (gratis = max 2 nieuwe chats)
    vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == app.vacancy_id).first()
    if vacancy:
        employer = db.query(models.User).filter(models.User.id == vacancy.employer_id).first()
        if employer and (employer.plan or "gratis") == "gratis":
            # Tel unieke chats voor deze werkgever (via vacatures)
            employer_app_ids = (
                db.query(models.Application.id)
                .join(models.Vacancy, models.Application.vacancy_id == models.Vacancy.id)
                .filter(models.Vacancy.employer_id == employer.id)
                .subquery()
            )
            started_chats = (
                db.query(models.RecruiterChatMessage)
                .filter(
                    models.RecruiterChatMessage.application_id.in_(employer_app_ids),
                    models.RecruiterChatMessage.role == "recruiter",
                )
                .with_entities(models.RecruiterChatMessage.application_id)
                .distinct()
                .count()
            )
            if started_chats >= 2:
                raise HTTPException(
                    status_code=403,
                    detail=(
                        "Je Gratis-abonnement staat maximaal 2 chatgesprekken toe. "
                        "Upgrade naar Normaal voor onbeperkt gebruik van chatbot Lisa."
                    ),
                )

    # Controleer of de chat al gestart is
    existing = (
        db.query(models.RecruiterChatMessage)
        .filter(models.RecruiterChatMessage.application_id == app_id)
        .first()
    )
    if existing:
        # Geef het eerste bericht terug als de chat al gestart is
        first_msg = (
            db.query(models.RecruiterChatMessage)
            .filter(models.RecruiterChatMessage.application_id == app_id)
            .order_by(models.RecruiterChatMessage.created_at.asc())
            .first()
        )
        return ChatMessageOut(
            id=first_msg.id,
            role=first_msg.role,
            content=first_msg.content,
            created_at=str(first_msg.created_at),
        )

    # Bouw context en genereer openingsbericht
    language = _get_language(request)
    ctx = _get_application_context(app_id, db)
    system_prompt = _build_system_prompt(ctx, language)

    opening_instruction = (
        f"Stel jezelf voor als Lisa en bedank {ctx['candidate_name']} kort voor de sollicitatie "
        f"op {ctx['vacancy_title']}. Vertel dat je een paar vragen hebt. "
        f"Stel dan meteen je eerste vraag over de gevonden aandachtspunten."
    )

    response = _call_ai(system_prompt, [{"role": "user", "content": opening_instruction}])
    msg = _save_message(app_id, "recruiter", response, db)

    return ChatMessageOut(
        id=msg.id,
        role=msg.role,
        content=msg.content,
        created_at=str(msg.created_at),
    )


@router.post("/{app_id}/message", response_model=ChatMessageOut)
def send_message(
    app_id: int,
    payload: SendMessageIn,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Stuur een bericht naar de AI recruiter."""
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Sollicitatie niet gevonden")
    if app.candidate_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Geen toegang tot deze sollicitatie")

    if not payload.content.strip():
        raise HTTPException(status_code=400, detail="Bericht mag niet leeg zijn")

    # Sla kandidaat bericht op
    _save_message(app_id, "candidate", payload.content.strip(), db)

    # Tel hoeveel recruiter berichten er al zijn
    recruiter_count = _count_recruiter_messages(app_id, db)

    # Bouw context + conversatiegeschiedenis
    language = _get_language(request)
    ctx = _get_application_context(app_id, db)
    system_prompt = _build_system_prompt(ctx, language)
    history = _get_conversation_history(app_id, db)

    # Sluit af na MAX_QUESTIONS recruiter berichten
    if recruiter_count >= MAX_QUESTIONS:
        closing = (
            f"Dit is je LAATSTE bericht. Bedank {ctx['candidate_name']} hartelijk voor de antwoorden. "
            f"Zeg dat de werkgever zo snel mogelijk contact opneemt. Sluit vriendelijk af. "
            f"BELANGRIJK: Stel ABSOLUUT GEEN nieuwe vragen meer. Eindig het gesprek definitief."
        )
        history.append({"role": "user", "content": closing})

    response = _call_ai(system_prompt, history)
    msg = _save_message(app_id, "recruiter", response, db)

    return ChatMessageOut(
        id=msg.id,
        role=msg.role,
        content=msg.content,
        created_at=str(msg.created_at),
    )


@router.get("/{app_id}/messages", response_model=List[ChatMessageOut])
def get_messages(
    app_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Haal de volledige chatgeschiedenis op (kandidaat + werkgever)."""
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Sollicitatie niet gevonden")

    # Zowel kandidaat als werkgever mag de chat lezen
    vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == app.vacancy_id).first()
    is_candidate = app.candidate_id == current_user.id
    is_employer = vacancy and vacancy.employer_id == current_user.id
    if not is_candidate and not is_employer:
        raise HTTPException(status_code=403, detail="Geen toegang")

    messages = (
        db.query(models.RecruiterChatMessage)
        .filter(models.RecruiterChatMessage.application_id == app_id)
        .order_by(models.RecruiterChatMessage.created_at.asc())
        .all()
    )

    return [
        ChatMessageOut(
            id=m.id,
            role=m.role,
            content=m.content,
            created_at=str(m.created_at),
        )
        for m in messages
    ]
