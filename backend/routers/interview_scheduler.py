"""
Interview Scheduler — Teams + Agenda integratie

Endpoints:
  POST   /interviews/schedule                    Werkgever plant een interview
  GET    /interviews/application/{app_id}        Haal interview op voor een sollicitatie
  PATCH  /interviews/{id}/cancel                 Annuleer interview
  POST   /interviews/{id}/create-teams-meeting   Maak Teams meeting aan via Microsoft Graph
  GET    /interviews/my                          Kandidaat: mijn geplande gesprekken

Microsoft Graph API vereisten (in environment variables):
  MS_TENANT_ID      - Azure AD tenant ID
  MS_CLIENT_ID      - App registration client ID
  MS_CLIENT_SECRET  - App registration client secret
  MS_ORGANIZER_EMAIL- E-mailadres waarmee meetings worden aangemaakt (bijv. lisa@itspeanuts.ai)
"""

import json
import os
from datetime import datetime, timedelta, timezone
from typing import List, Optional

import requests
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.db import get_db
from backend import models
from backend.routers.auth import get_current_user, require_role

router = APIRouter(prefix="/interviews", tags=["interviews"])


# ── Microsoft Graph credentials ─────────────────────────────────────────────

MS_TENANT_ID = os.getenv("MS_TENANT_ID", "")
MS_CLIENT_ID = os.getenv("MS_CLIENT_ID", "")
MS_CLIENT_SECRET = os.getenv("MS_CLIENT_SECRET", "")
MS_ORGANIZER_EMAIL = os.getenv("MS_ORGANIZER_EMAIL", "")  # bijv. lisa@itspeanuts.ai


# ── Schemas ──────────────────────────────────────────────────────────────────

class ScheduleInterviewIn(BaseModel):
    application_id: int
    scheduled_at: str          # ISO 8601: "2026-03-15T14:00:00+01:00"
    duration_minutes: int = 30
    interview_type: str = "teams"   # "teams" | "phone" | "in_person"
    notes: Optional[str] = None


class InterviewSessionOut(BaseModel):
    id: int
    application_id: int
    scheduled_at: str
    duration_minutes: int
    interview_type: str
    teams_join_url: Optional[str] = None
    teams_organizer_email: Optional[str] = None
    status: str
    notes: Optional[str] = None
    created_at: str

    # Verrijkt vanuit gerelateerde tabellen
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    vacancy_title: Optional[str] = None

    class Config:
        from_attributes = True


class CancelInterviewIn(BaseModel):
    reason: Optional[str] = None


# ── Microsoft Graph helpers ───────────────────────────────────────────────────

def _get_graph_token() -> str:
    """Haal een Microsoft Graph access token op via client credentials."""
    if not all([MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET]):
        raise HTTPException(
            status_code=503,
            detail=(
                "Microsoft Graph is niet geconfigureerd. "
                "Stel MS_TENANT_ID, MS_CLIENT_ID en MS_CLIENT_SECRET in als omgevingsvariabelen."
            ),
        )
    url = f"https://login.microsoftonline.com/{MS_TENANT_ID}/oauth2/v2.0/token"
    resp = requests.post(
        url,
        data={
            "grant_type": "client_credentials",
            "client_id": MS_CLIENT_ID,
            "client_secret": MS_CLIENT_SECRET,
            "scope": "https://graph.microsoft.com/.default",
        },
        timeout=10,
    )
    if not resp.ok:
        raise HTTPException(
            status_code=502,
            detail=f"Microsoft Graph token ophalen mislukt: {resp.text}",
        )
    return resp.json()["access_token"]


def _create_teams_online_meeting(
    subject: str,
    start_dt: datetime,
    end_dt: datetime,
    organizer_email: str,
) -> dict:
    """
    Maakt een Microsoft Teams online meeting aan via de Graph API.
    Vereist: Calendars.ReadWrite + OnlineMeetings.ReadWrite app permissions.
    Geeft terug: { joinUrl, id, ... }
    """
    token = _get_graph_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    # Gebruik /onlineMeetings endpoint
    url = f"https://graph.microsoft.com/v1.0/users/{organizer_email}/onlineMeetings"
    body = {
        "subject": subject,
        "startDateTime": start_dt.strftime("%Y-%m-%dT%H:%M:%S"),
        "endDateTime": end_dt.strftime("%Y-%m-%dT%H:%M:%S"),
    }

    resp = requests.post(url, json=body, headers=headers, timeout=15)
    if not resp.ok:
        raise HTTPException(
            status_code=502,
            detail=f"Teams meeting aanmaken mislukt: {resp.text}",
        )
    return resp.json()


def _send_calendar_invite(
    organizer_email: str,
    attendee_emails: List[str],
    subject: str,
    body_html: str,
    start_dt: datetime,
    end_dt: datetime,
    teams_join_url: Optional[str] = None,
) -> None:
    """
    Stuurt een agenda-uitnodiging via Microsoft Graph (Outlook calendar event).
    Vereist: Calendars.ReadWrite app permission voor organizer_email.
    """
    token = _get_graph_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    location = {}
    if teams_join_url:
        body_html += f'<br><br><a href="{teams_join_url}">Deelnemen aan Microsoft Teams-vergadering</a>'
        location = {
            "displayName": "Microsoft Teams",
            "locationType": "default",
            "uniqueId": teams_join_url,
        }

    event = {
        "subject": subject,
        "body": {"contentType": "HTML", "content": body_html},
        "start": {"dateTime": start_dt.strftime("%Y-%m-%dT%H:%M:%S"), "timeZone": "Europe/Amsterdam"},
        "end": {"dateTime": end_dt.strftime("%Y-%m-%dT%H:%M:%S"), "timeZone": "Europe/Amsterdam"},
        "location": location,
        "attendees": [
            {"emailAddress": {"address": email}, "type": "required"}
            for email in attendee_emails
        ],
        "isOnlineMeeting": bool(teams_join_url),
        "onlineMeetingProvider": "teamsForBusiness" if teams_join_url else "unknown",
    }

    url = f"https://graph.microsoft.com/v1.0/users/{organizer_email}/events"
    resp = requests.post(url, json=event, headers=headers, timeout=15)
    if not resp.ok:
        # Niet-fataal: meeting is al aangemaakt, kalender-invite mislukt
        print(f"[WARN] Kalender-uitnodiging mislukt: {resp.text}")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _enrich_session(session: models.InterviewSession, db: Session) -> InterviewSessionOut:
    """Voeg kandidaatinfo en vacaturetitel toe aan een InterviewSession."""
    app = db.query(models.Application).filter(models.Application.id == session.application_id).first()
    candidate = db.query(models.User).filter(models.User.id == app.candidate_id).first() if app else None
    vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == app.vacancy_id).first() if app else None

    return InterviewSessionOut(
        id=session.id,
        application_id=session.application_id,
        scheduled_at=str(session.scheduled_at),
        duration_minutes=session.duration_minutes,
        interview_type=session.interview_type,
        teams_join_url=session.teams_join_url,
        teams_organizer_email=session.teams_organizer_email,
        status=session.status,
        notes=session.notes,
        created_at=str(session.created_at),
        candidate_name=candidate.full_name if candidate else None,
        candidate_email=candidate.email if candidate else None,
        vacancy_title=vacancy.title if vacancy else None,
    )


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/schedule", response_model=InterviewSessionOut)
def schedule_interview(
    payload: ScheduleInterviewIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Werkgever plant een interview voor een sollicitatie.
    Bij type 'teams' wordt automatisch een Teams meeting aangemaakt (als Graph geconfigureerd).
    """
    require_role(current_user, "employer")

    app = db.query(models.Application).filter(models.Application.id == payload.application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Sollicitatie niet gevonden")

    # Verificeer dat de vacature bij deze werkgever hoort
    vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == app.vacancy_id).first()
    if not vacancy or vacancy.employer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Geen toegang tot deze sollicitatie")

    try:
        scheduled_dt = datetime.fromisoformat(payload.scheduled_at)
    except ValueError:
        raise HTTPException(status_code=400, detail="Ongeldige datumnotatie, gebruik ISO 8601")

    # Maak de InterviewSession aan
    session = models.InterviewSession(
        application_id=payload.application_id,
        scheduled_at=scheduled_dt,
        duration_minutes=payload.duration_minutes,
        interview_type=payload.interview_type,
        status="scheduled",
        notes=payload.notes,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Als Teams: probeer meteen een meeting aan te maken
    if payload.interview_type == "teams" and MS_ORGANIZER_EMAIL and MS_CLIENT_ID:
        try:
            candidate = db.query(models.User).filter(models.User.id == app.candidate_id).first()
            end_dt = scheduled_dt + timedelta(minutes=payload.duration_minutes)
            subject = f"Gesprek: {candidate.full_name if candidate else 'Kandidaat'} — {vacancy.title}"

            meeting = _create_teams_online_meeting(
                subject=subject,
                start_dt=scheduled_dt,
                end_dt=end_dt,
                organizer_email=MS_ORGANIZER_EMAIL,
            )
            session.teams_meeting_id = meeting.get("id")
            session.teams_join_url = meeting.get("joinWebUrl") or meeting.get("joinUrl")
            session.teams_organizer_email = MS_ORGANIZER_EMAIL
            db.commit()
            db.refresh(session)

            # Stuur kalender-uitnodiging naar kandidaat + werkgever
            attendees = [current_user.email]
            if candidate:
                attendees.append(candidate.email)
            body_html = (
                f"<p>Beste {candidate.full_name if candidate else 'Kandidaat'},</p>"
                f"<p>Je bent uitgenodigd voor een gesprek over de functie <strong>{vacancy.title}</strong>.</p>"
                f"<p>Lisa van It&apos;s Peanuts AI begeleidt het eerste deel van het gesprek.</p>"
            )
            _send_calendar_invite(
                organizer_email=MS_ORGANIZER_EMAIL,
                attendee_emails=attendees,
                subject=subject,
                body_html=body_html,
                start_dt=scheduled_dt,
                end_dt=end_dt,
                teams_join_url=session.teams_join_url,
            )
        except HTTPException:
            pass  # Teams niet geconfigureerd — interview is wel opgeslagen

    return _enrich_session(session, db)


@router.get("/application/{app_id}", response_model=List[InterviewSessionOut])
def get_interviews_for_application(
    app_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Haal alle interviews op voor een sollicitatie (werkgever of kandidaat)."""
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Sollicitatie niet gevonden")

    vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == app.vacancy_id).first()
    is_candidate = app.candidate_id == current_user.id
    is_employer = vacancy and vacancy.employer_id == current_user.id
    if not is_candidate and not is_employer:
        raise HTTPException(status_code=403, detail="Geen toegang")

    sessions = (
        db.query(models.InterviewSession)
        .filter(models.InterviewSession.application_id == app_id)
        .order_by(models.InterviewSession.scheduled_at.asc())
        .all()
    )
    return [_enrich_session(s, db) for s in sessions]


@router.get("/my", response_model=List[InterviewSessionOut])
def get_my_interviews(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Kandidaat: haal al mijn geplande gesprekken op."""
    require_role(current_user, "candidate")

    # Haal alle sollicitaties van deze kandidaat op
    apps = db.query(models.Application).filter(models.Application.candidate_id == current_user.id).all()
    app_ids = [a.id for a in apps]

    if not app_ids:
        return []

    sessions = (
        db.query(models.InterviewSession)
        .filter(
            models.InterviewSession.application_id.in_(app_ids),
            models.InterviewSession.status != "cancelled",
        )
        .order_by(models.InterviewSession.scheduled_at.asc())
        .all()
    )
    return [_enrich_session(s, db) for s in sessions]


@router.patch("/{session_id}/cancel", response_model=InterviewSessionOut)
def cancel_interview(
    session_id: int,
    payload: CancelInterviewIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Annuleer een gepland interview (werkgever of kandidaat)."""
    session = db.query(models.InterviewSession).filter(models.InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview niet gevonden")

    app = db.query(models.Application).filter(models.Application.id == session.application_id).first()
    vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == app.vacancy_id).first() if app else None
    is_candidate = app and app.candidate_id == current_user.id
    is_employer = vacancy and vacancy.employer_id == current_user.id
    if not is_candidate and not is_employer:
        raise HTTPException(status_code=403, detail="Geen toegang")

    session.status = "cancelled"
    if payload.reason:
        session.notes = (session.notes or "") + f"\n[Geannuleerd: {payload.reason}]"
    db.commit()
    db.refresh(session)

    return _enrich_session(session, db)


@router.post("/{session_id}/create-teams-meeting", response_model=InterviewSessionOut)
def create_teams_meeting_for_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Maak (opnieuw) een Teams meeting aan voor een bestaand interview.
    Handig als de meeting nog niet aangemaakt was (bijv. credentials niet ingesteld bij inplannen).
    """
    require_role(current_user, "employer")

    session = db.query(models.InterviewSession).filter(models.InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview niet gevonden")

    app = db.query(models.Application).filter(models.Application.id == session.application_id).first()
    vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == app.vacancy_id).first() if app else None
    if not vacancy or vacancy.employer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Geen toegang")

    candidate = db.query(models.User).filter(models.User.id == app.candidate_id).first() if app else None
    scheduled_dt = session.scheduled_at
    end_dt = scheduled_dt + timedelta(minutes=session.duration_minutes)
    subject = f"Gesprek: {candidate.full_name if candidate else 'Kandidaat'} — {vacancy.title if vacancy else 'Vacature'}"

    meeting = _create_teams_online_meeting(
        subject=subject,
        start_dt=scheduled_dt,
        end_dt=end_dt,
        organizer_email=MS_ORGANIZER_EMAIL or current_user.email,
    )
    session.teams_meeting_id = meeting.get("id")
    session.teams_join_url = meeting.get("joinWebUrl") or meeting.get("joinUrl")
    session.teams_organizer_email = MS_ORGANIZER_EMAIL or current_user.email
    db.commit()
    db.refresh(session)

    return _enrich_session(session, db)
