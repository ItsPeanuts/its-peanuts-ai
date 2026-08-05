"""
Job Alerts — match kandidaten met nieuwe vacatures en stuur e-mails.

Wordt getriggerd wanneer een werkgever een vacature op "actief" zet.
Filtert op afstand (< RADIUS_KM), dan AI matchscore (>= MIN_MATCH_SCORE).
"""
import json
import logging
import os
from typing import Optional

from openai import OpenAI
from sqlalchemy.orm import Session

from backend import models
from backend.services.geocoding import geocode, haversine_km

logger = logging.getLogger(__name__)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
_ai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

RADIUS_KM = 25.0
MIN_MATCH_SCORE = 45


def extract_city_from_cv(cv_text: str) -> Optional[str]:
    """Gebruik AI om de woonplaats uit CV-tekst te halen."""
    if not _ai_client or not cv_text:
        return None
    try:
        resp = _ai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{
                "role": "user",
                "content": (
                    "Uit de volgende CV-tekst, geef ALLEEN de woonplaats/stad van de kandidaat. "
                    "Geef het antwoord als één woord (de plaatsnaam). "
                    "Als de woonplaats niet te vinden is, antwoord dan exact: ONBEKEND\n\n"
                    f"CV-tekst:\n{cv_text[:2000]}"
                ),
            }],
            max_tokens=30,
            temperature=0,
        )
        city = resp.choices[0].message.content.strip().strip('"').strip("'")
        if city and city.upper() != "ONBEKEND" and len(city) < 100:
            return city
    except Exception as e:
        logger.warning("[job_alerts] Stad extractie mislukt: %s", e)
    return None


def _quick_match_score(cv_text: str, vacancy_title: str, vacancy_desc: str) -> int:
    """Snelle AI matchscore (0-100) tussen CV en vacature."""
    if not _ai_client:
        return 0
    try:
        resp = _ai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{
                "role": "user",
                "content": (
                    "Geef een matchscore (0-100) tussen dit CV en deze vacature. "
                    "Antwoord ALLEEN met een JSON object: {\"score\": <getal>}\n\n"
                    f"VACATURE: {vacancy_title}\n{vacancy_desc[:600]}\n\n"
                    f"CV:\n{cv_text[:1500]}"
                ),
            }],
            max_tokens=30,
            temperature=0,
            response_format={"type": "json_object"},
        )
        data = json.loads(resp.choices[0].message.content)
        return max(0, min(100, int(data.get("score", 0))))
    except Exception:
        return 0


def ensure_candidate_location(candidate: models.User, db: Session) -> bool:
    """Zorg dat een kandidaat lat/lng heeft. Retourneert True als locatie beschikbaar."""
    if candidate.lat is not None and candidate.lng is not None:
        return True

    if not candidate.city:
        cv = (
            db.query(models.CandidateCV)
            .filter(models.CandidateCV.candidate_id == candidate.id)
            .order_by(models.CandidateCV.id.desc())
            .first()
        )
        if cv and cv.extracted_text:
            city = extract_city_from_cv(cv.extracted_text)
            if city:
                candidate.city = city
                db.flush()

    if candidate.city and candidate.lat is None:
        coords = geocode(candidate.city)
        if coords:
            candidate.lat, candidate.lng = coords
            db.flush()

    return candidate.lat is not None and candidate.lng is not None


def ensure_vacancy_location(vacancy: models.Vacancy, db: Session) -> bool:
    """Zorg dat een vacature lat/lng heeft. Retourneert True als locatie beschikbaar."""
    if vacancy.lat is not None and vacancy.lng is not None:
        return True
    if not vacancy.location:
        return False
    coords = geocode(vacancy.location)
    if coords:
        vacancy.lat, vacancy.lng = coords
        db.flush()
        return True
    return False


def send_job_alerts_for_vacancy(vacancy: models.Vacancy, db: Session) -> int:
    """
    Match een vacature tegen alle kandidaten met een CV.
    Stuurt e-mails naar matches binnen RADIUS_KM met score >= MIN_MATCH_SCORE.
    Retourneert het aantal verstuurde alerts.
    """
    from backend.services.email import send_job_alert_email

    if not ensure_vacancy_location(vacancy, db):
        logger.info("[job_alerts] Vacature %d heeft geen geldige locatie, skip alerts", vacancy.id)
        return 0

    employer = db.query(models.User).filter(models.User.id == vacancy.employer_id).first()
    employer_name = employer.full_name if employer else "Werkgever"

    candidates = (
        db.query(models.User)
        .filter(models.User.role == "candidate", models.User.job_alerts == True)
        .all()
    )

    sent = 0
    for candidate in candidates:
        cv = (
            db.query(models.CandidateCV)
            .filter(models.CandidateCV.candidate_id == candidate.id)
            .order_by(models.CandidateCV.id.desc())
            .first()
        )
        if not cv or not cv.extracted_text:
            continue

        if not ensure_candidate_location(candidate, db):
            continue

        distance = haversine_km(candidate.lat, candidate.lng, vacancy.lat, vacancy.lng)
        if distance > RADIUS_KM:
            continue

        score = _quick_match_score(cv.extracted_text, vacancy.title, vacancy.description or "")
        if score < MIN_MATCH_SCORE:
            continue

        try:
            send_job_alert_email(
                candidate_email=candidate.email,
                candidate_name=candidate.full_name,
                vacancy_title=vacancy.title,
                vacancy_location=vacancy.location or "",
                employer_name=employer_name,
                match_score=score,
                distance_km=round(distance, 1),
                vacancy_id=vacancy.id,
            )
            sent += 1
            logger.info(
                "[job_alerts] Alert verstuurd naar %s — vacature=%s score=%d afstand=%.1fkm",
                candidate.email, vacancy.title, score, distance,
            )
        except Exception as e:
            logger.error("[job_alerts] Mail mislukt naar %s: %s", candidate.email, e)

    db.commit()
    logger.info("[job_alerts] %d alerts verstuurd voor vacature '%s'", sent, vacancy.title)
    return sent
