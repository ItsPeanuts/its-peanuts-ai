"""
Virtuele AI Recruiter — Avatar interview via D-ID Streaming + WebRTC

Flow:
1. POST /virtual-interview/session/{app_id}/start
   → Maakt D-ID streaming sessie aan (WebRTC)
   → Geeft SDP offer + ICE servers terug aan browser
   → Browser bouwt RTCPeerConnection op

2. POST /virtual-interview/session/{app_id}/sdp-answer
   → Stuurt SDP answer van browser door naar D-ID

3. POST /virtual-interview/session/{app_id}/ice-candidate
   → Stuurt ICE candidate door naar D-ID (WebRTC handshake)

4. POST /virtual-interview/session/{app_id}/speak
   → D-ID laat de avatar een tekst uitspreken
   → Gebruikt bij intro + na elke kandidaat-reactie

5. POST /virtual-interview/session/{app_id}/answer
   → Kandidaat stuurt STT-transcript van zijn antwoord
   → AI genereert de volgende vraag of sluitingstekst
   → Geeft volgende tekst + ended-flag terug

6. POST /virtual-interview/session/{app_id}/complete
   → Sluit het interview af
   → AI scoort volledig transcript
   → Als score >= threshold én MS Graph geconfigureerd: plan Teams-vervolgafspraak
   → Slaat AIResult op

7. GET /virtual-interview/session/{app_id}
   → Geeft status + transcript terug

Premium feature: alleen beschikbaar als employer.plan == "premium"
"""

import base64
import io
import json
import os
from datetime import datetime, timedelta, timezone
from typing import List, Optional

import requests as http
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from openai import OpenAI

from backend.db import get_db
from backend import models
from backend.routers.auth import get_current_user
from backend.routers.interview_scheduler import (
    _create_teams_online_meeting,
    _send_calendar_invite,
    MS_ORGANIZER_EMAIL,
)

router = APIRouter(prefix="/virtual-interview", tags=["virtual-interview"])

# ── Config ────────────────────────────────────────────────────────────────────

DID_API_KEY = os.getenv("DID_API_KEY", "")
# D-ID Studio avatar (bijv. Amber):
#   DID_PRESENTER_NAME = Amber
#   DID_PRESENTER_ID   = IVHRp0a96W  (uit talkingPreview URL)
#   DID_DRIVER_ID      = rrGsQrSVpu  (uit talkingPreview URL)
# → image URL: https://clips-presenters.d-id.com/v2/{NAME}/{ID}/{DRIVER}/image
# Of een eigen foto:
#   DID_PRESENTER_URL = publieke jpg/png URL (heeft voorrang)
DID_PRESENTER_NAME = os.getenv("DID_PRESENTER_NAME", "Amber")
DID_PRESENTER_ID = os.getenv("DID_PRESENTER_ID", "")
DID_DRIVER_ID = os.getenv("DID_DRIVER_ID", "")
DID_PRESENTER_URL = os.getenv("DID_PRESENTER_URL", "")
SCORE_THRESHOLD = int(os.getenv("VIRTUAL_INTERVIEW_THRESHOLD", "60"))
MAX_QUESTIONS = 4

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
_ai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

DID_BASE = "https://api.d-id.com"


def _did_headers() -> dict:
    """Basic auth header voor D-ID API (api_key:)."""
    encoded = base64.b64encode(f"{DID_API_KEY}:".encode()).decode()
    return {
        "Authorization": f"Basic {encoded}",
        "Content-Type": "application/json",
    }


# ── Schemas ───────────────────────────────────────────────────────────────────

class StartSessionOut(BaseModel):
    session_id: int          # VirtualInterviewSession.id
    did_stream_id: str
    did_session_id: str
    offer: dict              # SDP offer van D-ID
    ice_servers: List[dict]
    tts_mode: bool = False   # True als D-ID niet geconfigureerd → browser TTS


class SdpAnswerIn(BaseModel):
    sdp: str
    type: str = "answer"


class IceCandidateIn(BaseModel):
    candidate: str
    sdpMid: str
    sdpMLineIndex: int


class SpeakIn(BaseModel):
    text: str


class AnswerIn(BaseModel):
    transcript: str          # STT tekst van kandidaat


class AnswerOut(BaseModel):
    next_text: str           # Tekst die de avatar moet uitspreken
    ended: bool              # True als het interview klaar is
    question_number: int     # Vraagnummer (1-based)


class CompleteOut(BaseModel):
    score: int
    summary: str
    followup_scheduled: bool
    teams_join_url: Optional[str] = None
    scheduled_at: Optional[str] = None


class SessionStatusOut(BaseModel):
    id: int
    status: str
    score: Optional[int] = None
    transcript: Optional[list] = None
    followup_interview_id: Optional[int] = None


# ── D-ID helpers ──────────────────────────────────────────────────────────────

def _parse_clip_ids() -> tuple[str, str]:
    """
    Extraheer presenter_id en driver_id.
    Als de gebruiker de volledige talkingPreview URL heeft geplakt,
    worden de IDs automatisch uit de URL geëxtraheerd.
    """
    from urllib.parse import urlparse

    presenter_id = DID_PRESENTER_ID
    driver_id = DID_DRIVER_ID

    if presenter_id and presenter_id.startswith("http"):
        try:
            parts = urlparse(presenter_id).path.strip("/").split("/")
            # patroon: v2/{name}/{presenter_id}/{driver_id}/talkingPreview.mp4
            if len(parts) >= 4 and parts[0] == "v2":
                presenter_id = parts[2]
                driver_id = parts[3]
        except Exception:
            pass

    return presenter_id, driver_id


TTS_FALLBACK_STREAM_ID = "tts-fallback"


def _did_create_stream() -> dict:
    """Maak een nieuwe D-ID streaming sessie aan. Geeft offer + ice_servers terug.

    Body prioriteit:
    1. DID_PRESENTER_URL → {"source_url": url}  (eigen publieke foto)
    2. DID_PRESENTER_ID + DID_DRIVER_ID → {"presenter_type": "clip", "presenter_id": ..., "driver_id": ...}
       (D-ID Studio avatar zoals Amber — IDs worden ook uit talkingPreview URL gehaald)

    Als D-ID niet geconfigureerd is: retourneer tts_mode=True zodat de browser
    Web Speech API (SpeechSynthesis) gebruikt voor TTS.
    """
    if not DID_API_KEY:
        # TTS modus: geen D-ID, browser doet de spraaksynthese
        return {
            "id": TTS_FALLBACK_STREAM_ID,
            "session_id": TTS_FALLBACK_STREAM_ID,
            "offer": {"sdp": "", "type": "offer"},
            "ice_servers": [],
            "tts_mode": True,
        }

    if DID_PRESENTER_URL:
        body: dict = {"source_url": DID_PRESENTER_URL}
    else:
        presenter_id, driver_id = _parse_clip_ids()
        if presenter_id and driver_id:
            body = {
                "presenter_type": "clip",
                "presenter_id": presenter_id,
                "driver_id": driver_id,
            }
        else:
            raise HTTPException(
                status_code=503,
                detail=(
                    "D-ID avatar niet geconfigureerd. Stel in via Render dashboard → Environment:\n"
                    "  DID_PRESENTER_ID  (talkingPreview URL of alleen het ID uit D-ID Studio)\n"
                    "  DID_DRIVER_ID     (driver ID, of automatisch uit talkingPreview URL)\n"
                    "Of: DID_PRESENTER_URL = publieke URL naar een eigen foto."
                ),
            )

    try:
        resp = http.post(
            f"{DID_BASE}/talks/streams",
            json=body,
            headers=_did_headers(),
            timeout=15,
        )
    except Exception:
        resp = None

    if resp is None or not resp.ok:
        # D-ID API mislukt (ongeldige key, avatar-config niet ingesteld, netwerk) →
        # val terug op browser TTS zodat het interview toch werkt.
        return {
            "id": TTS_FALLBACK_STREAM_ID,
            "session_id": TTS_FALLBACK_STREAM_ID,
            "offer": {"sdp": "", "type": "offer"},
            "ice_servers": [],
            "tts_mode": True,
        }

    return resp.json()


def _did_send_sdp(stream_id: str, session_id: str, sdp: str, sdp_type: str) -> None:
    """Stuur SDP answer naar D-ID om WebRTC verbinding te voltooien."""
    resp = http.post(
        f"{DID_BASE}/talks/streams/{stream_id}/sdp",
        json={"answer": {"sdp": sdp, "type": sdp_type}, "session_id": session_id},
        headers=_did_headers(),
        timeout=10,
    )
    if not resp.ok:
        raise HTTPException(status_code=502, detail=f"D-ID SDP mislukt: {resp.text}")


def _did_send_ice(stream_id: str, session_id: str, candidate: str, sdp_mid: str, sdp_mline_index: int) -> None:
    """Stuur ICE candidate naar D-ID."""
    resp = http.post(
        f"{DID_BASE}/talks/streams/{stream_id}/ice",
        json={
            "candidate": candidate,
            "sdpMid": sdp_mid,
            "sdpMLineIndex": sdp_mline_index,
            "session_id": session_id,
        },
        headers=_did_headers(),
        timeout=10,
    )
    if not resp.ok:
        raise HTTPException(status_code=502, detail=f"D-ID ICE mislukt: {resp.text}")


def _did_speak(stream_id: str, session_id: str, text: str) -> None:
    """Laat de D-ID avatar een tekst uitspreken."""
    resp = http.post(
        f"{DID_BASE}/talks/streams/{stream_id}/videos",
        json={
            "script": {
                "type": "text",
                "input": text,
                "provider": {
                    "type": "microsoft",
                    "voice_id": "nl-NL-ColetteNeural",
                },
            },
            "session_id": session_id,
            "config": {"fluent": True, "pad_audio": 0.0},
        },
        headers=_did_headers(),
        timeout=15,
    )
    if not resp.ok:
        raise HTTPException(status_code=502, detail=f"D-ID speak mislukt: {resp.text}")


def _did_close_stream(stream_id: str, session_id: str) -> None:
    """Sluit de D-ID stream netjes af."""
    try:
        http.delete(
            f"{DID_BASE}/talks/streams/{stream_id}",
            json={"session_id": session_id},
            headers=_did_headers(),
            timeout=10,
        )
    except Exception:
        pass  # Niet fataal


# ── AI helpers ────────────────────────────────────────────────────────────────

def _get_context(app_id: int, db: Session) -> dict:
    """Laad sollicitatie-context (kandidaat, vacature, CV, AIResult)."""
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Sollicitatie niet gevonden")
    candidate = db.query(models.User).filter(models.User.id == app.candidate_id).first()
    vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == app.vacancy_id).first()
    ai_result = (
        db.query(models.AIResult).filter(models.AIResult.application_id == app_id).first()
    )
    cv = (
        db.query(models.CandidateCV)
        .filter(models.CandidateCV.candidate_id == app.candidate_id)
        .order_by(models.CandidateCV.id.desc())
        .first()
    )
    return {
        "app": app,
        "candidate_name": candidate.full_name if candidate else "Kandidaat",
        "candidate_email": candidate.email if candidate else "",
        "vacancy_title": vacancy.title if vacancy else "Vacature",
        "vacancy_description": vacancy.description or "" if vacancy else "",
        "employer_id": vacancy.employer_id if vacancy else None,
        "match_score": ai_result.match_score if ai_result else None,
        "gaps": ai_result.gaps if ai_result else "",
        "strengths": ai_result.strengths if ai_result else "",
        "suggested_questions": ai_result.suggested_questions if ai_result else "",
        "cv_text": cv.extracted_text or "" if cv else "",
    }


def _build_avatar_system_prompt(ctx: dict) -> str:
    return f"""Je bent Lisa, enthousiaste HR-recruiter bij VorzaIQ.

Je voert een gesproken video-interview met {ctx['candidate_name']} voor de positie {ctx['vacancy_title']}.
Je bent warm, nieuwsgierig en direct. Praat alsof je echt tegenover iemand zit — energiek en vriendelijk.

SPREEKTAALREGELS (strikt volgen):
- Maximaal 2 zinnen per beurt, NOOIT meer
- Reageer eerst in één zin op wat de kandidaat zei (kort, menselijk: "Interessant!", "Goed punt.", "Mooi!")
- Stel dan exact 1 vervolgvraag
- Gebruik altijd "je" en "jij", nooit "u"
- Geen opsommingen, bullets, nummers of haakjes
- Schrijf zoals je praat: vloeiend, informeel maar professioneel

CONTEXT (intern — niet letterlijk noemen):
- Functie: {ctx['vacancy_title']}
- Sterke punten kandidaat: {ctx['strengths'] or 'niet bekend'}
- Aandachtspunten: {ctx['gaps'] or 'geen specifieke gaps'}
- CV samenvatting: {ctx['cv_text'][:300] if ctx['cv_text'] else 'niet beschikbaar'}
- Suggesties voor vragen: {ctx['suggested_questions'] or 'gebruik je eigen oordeel'}

DOEL: stel precies {MAX_QUESTIONS} gerichte vragen, eindig warm en kort."""


def _call_ai(system_prompt: str, history: list) -> str:
    if not _ai_client:
        return "De AI is momenteel niet beschikbaar."
    try:
        resp = _ai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": system_prompt}] + history,
            max_tokens=250,
            temperature=0.75,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        return f"Er ging iets mis: {str(e)}"


def _score_transcript(ctx: dict, transcript: list) -> tuple[int, str]:
    """Analyseer het volledige transcript en geef een score (0-100) + samenvatting."""
    if not _ai_client:
        return 50, "AI niet beschikbaar voor scoring."

    convo = "\n".join(
        f"{'Lisa' if t['role'] == 'recruiter' else ctx['candidate_name']}: {t['content']}"
        for t in transcript
    )

    prompt = f"""Analyseer dit video interview transcript voor de functie {ctx['vacancy_title']}.

Kandidaat: {ctx['candidate_name']}
CV sterktes: {ctx['strengths'] or 'onbekend'}
Aandachtspunten: {ctx['gaps'] or 'onbekend'}

Transcript:
{convo}

Geef een JSON antwoord met:
- score: integer 0-100 (hoe geschikt is de kandidaat op basis van de antwoorden)
- summary: 2-3 zinnen samenvatting in het Nederlands

Reageer ALLEEN met geldige JSON, geen tekst ernaast."""

    try:
        resp = _ai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
            temperature=0.3,
        )
        raw = resp.choices[0].message.content.strip()
        # Verwijder eventuele markdown code fences
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)
        return int(data.get("score", 50)), data.get("summary", "Interview afgerond.")
    except Exception as e:
        return 50, f"Score niet berekend ({str(e)})"


def _get_transcript(vi_session: models.VirtualInterviewSession) -> list:
    if not vi_session.transcript:
        return []
    try:
        return json.loads(vi_session.transcript)
    except Exception:
        return []


def _append_transcript(vi_session: models.VirtualInterviewSession, role: str, content: str, db: Session) -> None:
    transcript = _get_transcript(vi_session)
    transcript.append({
        "role": role,
        "content": content,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    vi_session.transcript = json.dumps(transcript, ensure_ascii=False)
    db.commit()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/session/{app_id}/start", response_model=StartSessionOut)
def start_session(
    app_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Start een nieuw video interview. Maakt D-ID stream aan en geeft WebRTC credentials terug.
    Alleen beschikbaar voor de kandidaat die bij deze sollicitatie hoort.
    """
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Sollicitatie niet gevonden")
    if app.candidate_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Geen toegang")

    # Controleer of werkgever een Premium abonnement heeft
    vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == app.vacancy_id).first()
    if vacancy and current_user.role != "admin":
        employer = db.query(models.User).filter(models.User.id == vacancy.employer_id).first()
        if not employer or (employer.plan or "gratis") != "premium":
            raise HTTPException(
                status_code=403,
                detail="Virtueel interview vereist een Premium abonnement van de werkgever",
            )

    # Controleer of er al een actieve sessie is
    existing = (
        db.query(models.VirtualInterviewSession)
        .filter(models.VirtualInterviewSession.application_id == app_id)
        .first()
    )
    if existing and existing.status == "completed":
        raise HTTPException(status_code=409, detail="Dit interview is al afgerond.")

    # Maak D-ID stream aan (of TTS fallback als D-ID niet geconfigureerd is)
    stream_data = _did_create_stream()
    did_stream_id = stream_data["id"]
    did_session_id = stream_data.get("session_id", "")
    offer = stream_data.get("offer", {})
    ice_servers = stream_data.get("ice_servers", [])
    tts_mode = stream_data.get("tts_mode", False)

    if existing:
        # Herstart bestaande sessie
        existing.did_stream_id = did_stream_id
        existing.did_session_id = did_session_id
        existing.status = "in_progress"
        db.commit()
        db.refresh(existing)
        return StartSessionOut(
            session_id=existing.id,
            did_stream_id=did_stream_id,
            did_session_id=did_session_id,
            offer=offer,
            ice_servers=ice_servers,
            tts_mode=tts_mode,
        )

    # Nieuwe sessie aanmaken
    vi_session = models.VirtualInterviewSession(
        application_id=app_id,
        status="in_progress",
        did_stream_id=did_stream_id,
        did_session_id=did_session_id,
    )
    db.add(vi_session)
    db.commit()
    db.refresh(vi_session)

    return StartSessionOut(
        session_id=vi_session.id,
        did_stream_id=did_stream_id,
        did_session_id=did_session_id,
        offer=offer,
        ice_servers=ice_servers,
        tts_mode=tts_mode,
    )


@router.post("/session/{app_id}/sdp-answer")
def submit_sdp_answer(
    app_id: int,
    payload: SdpAnswerIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Stuur de SDP answer van de browser door naar D-ID om WebRTC te voltooien."""
    vi_session = (
        db.query(models.VirtualInterviewSession)
        .filter(models.VirtualInterviewSession.application_id == app_id)
        .first()
    )
    if not vi_session or not vi_session.did_stream_id:
        raise HTTPException(status_code=404, detail="Geen actieve interview sessie")
    _did_send_sdp(vi_session.did_stream_id, vi_session.did_session_id or "", payload.sdp, payload.type)
    return {"ok": True}


@router.post("/session/{app_id}/ice-candidate")
def submit_ice_candidate(
    app_id: int,
    payload: IceCandidateIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Stuur een ICE candidate door naar D-ID (onderdeel van WebRTC handshake)."""
    vi_session = (
        db.query(models.VirtualInterviewSession)
        .filter(models.VirtualInterviewSession.application_id == app_id)
        .first()
    )
    if not vi_session or not vi_session.did_stream_id:
        raise HTTPException(status_code=404, detail="Geen actieve interview sessie")
    _did_send_ice(
        vi_session.did_stream_id,
        vi_session.did_session_id or "",
        payload.candidate,
        payload.sdpMid,
        payload.sdpMLineIndex,
    )
    return {"ok": True}


@router.post("/session/{app_id}/speak")
def speak(
    app_id: int,
    payload: SpeakIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Laat de avatar een tekst uitspreken via D-ID.
    Wordt gebruikt voor de intro en na elke AI-gegenereerde vraag.
    Sla de tekst ook op in het transcript.
    """
    vi_session = (
        db.query(models.VirtualInterviewSession)
        .filter(models.VirtualInterviewSession.application_id == app_id)
        .first()
    )
    if not vi_session or not vi_session.did_stream_id:
        raise HTTPException(status_code=404, detail="Geen actieve interview sessie")
    # TTS modus: browser doet de spraak, alleen transcript opslaan
    if vi_session.did_stream_id != TTS_FALLBACK_STREAM_ID:
        _did_speak(vi_session.did_stream_id, vi_session.did_session_id or "", payload.text)
    _append_transcript(vi_session, "recruiter", payload.text, db)
    return {"ok": True}


@router.post("/session/{app_id}/answer", response_model=AnswerOut)
def submit_answer(
    app_id: int,
    payload: AnswerIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Kandidaat stuurt het STT-transcript van zijn antwoord.
    AI genereert de volgende vraag of het sluitingsbericht.
    Geeft de volgende spreektekst + ended-flag terug.
    """
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Sollicitatie niet gevonden")
    if app.candidate_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Geen toegang")

    vi_session = (
        db.query(models.VirtualInterviewSession)
        .filter(models.VirtualInterviewSession.application_id == app_id)
        .first()
    )
    if not vi_session:
        raise HTTPException(status_code=404, detail="Geen actieve interview sessie")

    # Sla kandidaat antwoord op
    _append_transcript(vi_session, "candidate", payload.transcript.strip(), db)

    # Huidige status: hoeveel recruiter-beurten zijn er al?
    transcript = _get_transcript(vi_session)
    recruiter_turns = sum(1 for t in transcript if t["role"] == "recruiter")

    ctx = _get_context(app_id, db)
    system_prompt = _build_avatar_system_prompt(ctx)
    history = [
        {"role": "assistant" if t["role"] == "recruiter" else "user", "content": t["content"]}
        for t in transcript
    ]

    if recruiter_turns >= MAX_QUESTIONS:
        # Sluitingsbericht — geen nieuwe vragen meer
        closing_instruction = (
            f"Dit is het LAATSTE bericht. Bedank {ctx['candidate_name']} hartelijk "
            f"voor het gesprek. Zeg dat de werkgever spoedig contact opneemt. "
            f"Spreek 1 à 2 zinnen, geen nieuwe vragen."
        )
        history.append({"role": "user", "content": closing_instruction})
        next_text = _call_ai(system_prompt, history)
        _append_transcript(vi_session, "recruiter", next_text, db)
        return AnswerOut(next_text=next_text, ended=True, question_number=recruiter_turns)

    # Volgende vraag genereren
    next_text = _call_ai(system_prompt, history)
    _append_transcript(vi_session, "recruiter", next_text, db)
    return AnswerOut(
        next_text=next_text,
        ended=False,
        question_number=recruiter_turns + 1,
    )


@router.post("/session/{app_id}/complete", response_model=CompleteOut)
def complete_interview(
    app_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Finaliseer het interview:
    1. Markeer sessie als voltooid
    2. AI scoort het transcript
    3. Sla score op in AIResult
    4. Als score >= threshold én MS Graph geconfigureerd: plan automatisch een Teams-vervolgafspraak
    5. Sluit D-ID stream
    """
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Sollicitatie niet gevonden")
    if app.candidate_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Geen toegang")

    vi_session = (
        db.query(models.VirtualInterviewSession)
        .filter(models.VirtualInterviewSession.application_id == app_id)
        .first()
    )
    if not vi_session:
        raise HTTPException(status_code=404, detail="Geen interview sessie gevonden")

    transcript = _get_transcript(vi_session)
    ctx = _get_context(app_id, db)

    # Score berekenen
    score, summary = _score_transcript(ctx, transcript)

    # Sla score op
    vi_session.score = score
    vi_session.score_summary = summary
    vi_session.status = "completed"
    db.commit()

    # Verrijk of maak AIResult aan
    ai_result = (
        db.query(models.AIResult).filter(models.AIResult.application_id == app_id).first()
    )
    if ai_result:
        # Update bestaand resultaat met interview-score
        ai_result.match_score = max(ai_result.match_score or 0, score)
        ai_result.summary = (ai_result.summary or "") + f"\n\n[Video interview score: {score}/100]\n{summary}"
    else:
        ai_result = models.AIResult(
            application_id=app_id,
            match_score=score,
            summary=f"[Video interview score: {score}/100]\n{summary}",
        )
        db.add(ai_result)
    db.commit()

    # D-ID stream sluiten
    if vi_session.did_stream_id:
        _did_close_stream(vi_session.did_stream_id, vi_session.did_session_id or "")

    # Auto-plan vervolgafspraak als score hoog genoeg + MS Graph geconfigureerd
    followup_scheduled = False
    teams_join_url = None
    scheduled_at_str = None

    if score >= SCORE_THRESHOLD and MS_ORGANIZER_EMAIL:
        try:
            employer = db.query(models.User).filter(
                models.User.id == ctx["employer_id"]
            ).first() if ctx["employer_id"] else None

            # Plan 3 werkdagen vanaf nu, om 10:00
            now = datetime.now(timezone.utc)
            followup_dt = now + timedelta(days=3)
            followup_dt = followup_dt.replace(hour=9, minute=0, second=0, microsecond=0)
            end_dt = followup_dt + timedelta(minutes=45)

            subject = f"2e gesprek: {ctx['candidate_name']} — {ctx['vacancy_title']}"

            meeting = _create_teams_online_meeting(
                subject=subject,
                start_dt=followup_dt,
                end_dt=end_dt,
                organizer_email=MS_ORGANIZER_EMAIL,
            )
            join_url = meeting.get("joinWebUrl") or meeting.get("joinUrl")

            # Sla op als InterviewSession
            interview_session = models.InterviewSession(
                application_id=app_id,
                scheduled_at=followup_dt,
                duration_minutes=45,
                interview_type="teams",
                status="scheduled",
                teams_meeting_id=meeting.get("id"),
                teams_join_url=join_url,
                teams_organizer_email=MS_ORGANIZER_EMAIL,
                notes=f"Automatisch ingepland na video interview. Score: {score}/100",
            )
            db.add(interview_session)
            db.commit()
            db.refresh(interview_session)

            vi_session.followup_interview_id = interview_session.id
            db.commit()

            # Kalender-uitnodigingen sturen
            attendees = []
            if employer:
                attendees.append(employer.email)
            if ctx["candidate_email"]:
                attendees.append(ctx["candidate_email"])

            body_html = (
                f"<p>Beste {ctx['candidate_name']},</p>"
                f"<p>Gefeliciteerd! Op basis van uw video interview nodigen we u uit "
                f"voor een 2e gesprek over de functie <strong>{ctx['vacancy_title']}</strong>.</p>"
                f"<p>Score video interview: <strong>{score}/100</strong></p>"
            )
            _send_calendar_invite(
                organizer_email=MS_ORGANIZER_EMAIL,
                attendee_emails=attendees,
                subject=subject,
                body_html=body_html,
                start_dt=followup_dt,
                end_dt=end_dt,
                teams_join_url=join_url,
            )

            followup_scheduled = True
            teams_join_url = join_url
            scheduled_at_str = followup_dt.isoformat()

        except Exception:
            pass  # Vervolgafspraak mislukt — niet fataal

    return CompleteOut(
        score=score,
        summary=summary,
        followup_scheduled=followup_scheduled,
        teams_join_url=teams_join_url,
        scheduled_at=scheduled_at_str,
    )


@router.post("/session/{app_id}/tts")
def text_to_speech(
    app_id: int,
    payload: SpeakIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    OpenAI TTS: zet tekst om naar MP3 audio.
    Wordt gebruikt als vervanger voor browser Web Speech API — klinkt veel natuurlijker.
    Vereist OPENAI_API_KEY geconfigureerd op de server.
    """
    if not _ai_client:
        raise HTTPException(status_code=503, detail="OpenAI niet geconfigureerd")

    # Autorisatie: alleen de kandidaat van deze sollicitatie (of admin)
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Sollicitatie niet gevonden")
    if app.candidate_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Geen toegang")

    try:
        response = _ai_client.audio.speech.create(
            model="tts-1",         # Sneller dan tts-1-hd, aanvaardbare kwaliteit voor gesprek
            voice="nova",          # Natuurlijke vrouwenstem (klinkt goed in het Nederlands)
            input=payload.text,
            speed=1.05,            # Iets sneller — gesprekstempo
            response_format="mp3",
        )
        audio_bytes = response.content
        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type="audio/mpeg",
            headers={"Cache-Control": "no-cache", "Content-Length": str(len(audio_bytes))},
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"TTS mislukt: {str(e)}")


@router.get("/session/{app_id}", response_model=SessionStatusOut)
def get_session(
    app_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Haal de status en het transcript op van een video interview sessie."""
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Sollicitatie niet gevonden")

    vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == app.vacancy_id).first()
    is_candidate = app.candidate_id == current_user.id
    is_employer = vacancy and vacancy.employer_id == current_user.id
    is_admin = current_user.role == "admin"
    if not is_candidate and not is_employer and not is_admin:
        raise HTTPException(status_code=403, detail="Geen toegang")

    vi_session = (
        db.query(models.VirtualInterviewSession)
        .filter(models.VirtualInterviewSession.application_id == app_id)
        .first()
    )
    if not vi_session:
        raise HTTPException(status_code=404, detail="Geen interview sessie gevonden")

    return SessionStatusOut(
        id=vi_session.id,
        status=vi_session.status,
        score=vi_session.score,
        transcript=_get_transcript(vi_session),
        followup_interview_id=vi_session.followup_interview_id,
    )
