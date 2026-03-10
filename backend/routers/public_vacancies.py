from __future__ import annotations

import json
import os
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.security import OAuth2PasswordBearer
from openai import OpenAI
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from backend import models, schemas
from backend.db import get_db
from backend.security import create_access_token, hash_password, SECRET_KEY, ALGORITHM
from backend.services.text_extract import extract_text
from backend.services.email import send_application_confirmation, send_new_applicant_notification, send_claim_notification

oauth2_optional = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def _get_optional_user(token: str | None = Depends(oauth2_optional), db: Session = Depends(get_db)):
    """Geeft de ingelogde User terug, of None als er geen geldig token is."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub", 0))
        return db.query(models.User).filter(models.User.id == user_id).first()
    except (JWTError, ValueError):
        return None

router = APIRouter(prefix="/vacancies", tags=["public-vacancies"])


def _maybe_send_claim_mail(vacancy_id: int, vacancy_title: str, db: Session) -> None:
    """Stuur eenmalig een claim-mail als deze vacature gescraped is en nog niet geclaimd."""
    from backend.models.scraped_vacancy import ScrapedVacancy as SV
    import os
    sv = db.query(SV).filter(SV.vacancy_id == vacancy_id, SV.claim_notified == False).first()
    if not sv:
        return
    frontend_url = os.getenv("FRONTEND_URL", "https://its-peanuts-frontend.onrender.com")
    claim_url = f"{frontend_url}/claim/{sv.claim_token}"
    send_claim_notification(
        employer_email=sv.contact_email,
        vacancy_title=vacancy_title,
        company_name=sv.company_name or "",
        claim_url=claim_url,
    )
    sv.claim_notified = True
    db.commit()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None


@router.get("", response_model=List[schemas.PublicVacancyOut])
def list_vacancies(
    q: Optional[str] = None,
    location: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    query = db.query(models.Vacancy).order_by(models.Vacancy.created_at.desc())

    if q:
        query = query.filter(
            models.Vacancy.title.ilike(f"%{q}%")
            | models.Vacancy.description.ilike(f"%{q}%")
        )
    if location:
        query = query.filter(models.Vacancy.location.ilike(f"%{location}%"))

    return query.offset(skip).limit(limit).all()


@router.get("/{vacancy_id}", response_model=schemas.PublicVacancyDetail)
def get_vacancy(vacancy_id: int, db: Session = Depends(get_db)):
    vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == vacancy_id).first()
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacature niet gevonden")

    questions = (
        db.query(models.IntakeQuestion)
        .filter(models.IntakeQuestion.vacancy_id == vacancy_id)
        .all()
    )

    employer_plan = (vacancy.employer.plan or "gratis") if vacancy.employer else "gratis"

    return schemas.PublicVacancyDetail(
        id=vacancy.id,
        title=vacancy.title,
        location=vacancy.location,
        hours_per_week=vacancy.hours_per_week,
        salary_range=vacancy.salary_range,
        description=vacancy.description,
        created_at=vacancy.created_at,
        interview_type=vacancy.interview_type or "both",
        employer_plan=employer_plan,
        intake_questions=[
            schemas.IntakeQuestionPublic(
                id=q.id,
                qtype=q.qtype,
                question=q.question,
                options_json=q.options_json,
            )
            for q in questions
        ],
    )


@router.post("/{vacancy_id}/apply", response_model=schemas.ApplyResponse)
async def apply_to_vacancy(
    vacancy_id: int,
    full_name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    cv_file: UploadFile = File(...),
    intake_answers_json: str = Form(default="[]"),
    db: Session = Depends(get_db),
):
    # Haal vacature op
    vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == vacancy_id).first()
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacature niet gevonden")

    # Controleer of e-mail al geregistreerd is
    email = email.lower().strip()
    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Dit e-mailadres is al geregistreerd. Log in om te solliciteren.",
        )

    if len(password) < 8:
        raise HTTPException(
            status_code=422, detail="Wachtwoord moet minimaal 8 tekens bevatten."
        )

    # Maak kandidaat account aan
    candidate = models.User(
        email=email,
        full_name=full_name.strip(),
        hashed_password=hash_password(password),
        role="candidate",
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)

    # Extraheer tekst uit CV
    cv_data = await cv_file.read()
    cv_text = ""
    if cv_data:
        try:
            _, cv_text = extract_text(
                cv_data, cv_file.filename or "cv", cv_file.content_type or ""
            )
        except Exception:
            cv_text = ""

    # Sla CV op
    cv_record = models.CandidateCV(
        candidate_id=candidate.id,
        source_filename=cv_file.filename,
        source_content_type=cv_file.content_type,
        extracted_text=cv_text or None,
    )
    db.add(cv_record)
    db.commit()

    # Maak sollicitatie aan
    application = models.Application(
        candidate_id=candidate.id,
        vacancy_id=vacancy_id,
        status="applied",
    )
    db.add(application)
    db.commit()
    db.refresh(application)

    # Sla intake-antwoorden op (optioneel)
    try:
        answers_data = json.loads(intake_answers_json)
        for item in answers_data:
            if item.get("answer"):
                db.add(
                    models.IntakeAnswer(
                        application_id=application.id,
                        question_id=int(item["question_id"]),
                        answer=str(item["answer"]),
                    )
                )
        db.commit()
    except Exception:
        pass

    # AI pre-screening
    match_score = 0
    explanation = "AI analyse niet beschikbaar — geen OpenAI key of vacaturetekst."

    job_text = (vacancy.extracted_text or vacancy.description or "").strip()
    if _client and cv_text and job_text:
        try:
            resp = _client.chat.completions.create(
                model="gpt-4.1-mini",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Je bent een ervaren recruiter. "
                            "Geef een matchscore (0-100) en een korte uitleg in het Nederlands. "
                            "Geef ALLEEN een JSON-object terug met keys "
                            "'match_score' (int) en 'explanation' (string)."
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            f"KANDIDAAT CV:\n{cv_text[:3000]}\n\n"
                            f"VACATURE:\n{job_text[:2000]}"
                        ),
                    },
                ],
                response_format={"type": "json_object"},
            )
            data = json.loads(resp.choices[0].message.content)
            match_score = max(0, min(100, int(data.get("match_score", 0))))
            explanation = data.get("explanation", "").strip() or explanation
        except Exception as exc:
            explanation = f"AI analyse mislukt: {exc}"

    # Sla AI-resultaat op
    db.add(
        models.AIResult(
            application_id=application.id,
            match_score=match_score,
            summary=explanation,
        )
    )
    db.commit()

    # E-mail notificaties (fouten worden gelogd, niet doorgegooid)
    employer = db.query(models.User).filter(models.User.id == vacancy.employer_id).first()
    send_application_confirmation(
        candidate_email=candidate.email,
        candidate_name=candidate.full_name or candidate.email,
        vacancy_title=vacancy.title,
        match_score=match_score,
    )
    if employer:
        send_new_applicant_notification(
            employer_email=employer.email,
            candidate_name=candidate.full_name or candidate.email,
            candidate_email=candidate.email,
            vacancy_title=vacancy.title,
            match_score=match_score,
        )

    # Claim-mail: stuur eenmalig als dit een gescrapede vacature is
    _maybe_send_claim_mail(vacancy_id, vacancy.title, db)

    access_token = create_access_token(subject=str(candidate.id))

    return schemas.ApplyResponse(
        application_id=application.id,
        match_score=match_score,
        explanation=explanation,
        access_token=access_token,
    )


@router.post("/{vacancy_id}/apply-authenticated", response_model=schemas.ApplyResponse)
async def apply_authenticated(
    vacancy_id: int,
    motivation_letter: str = Form(default=""),
    intake_answers_json: str = Form(default="[]"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(_get_optional_user),
):
    """Solliciteren als ingelogde kandidaat — gebruikt bestaand account + meest recente CV."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Niet ingelogd")
    if current_user.role not in ("candidate", "admin"):
        raise HTTPException(status_code=403, detail="Alleen kandidaten kunnen solliciteren")

    # Vacature ophalen
    vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == vacancy_id).first()
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacature niet gevonden")

    # Controleer of kandidaat al gesolliciteerd heeft
    existing_app = (
        db.query(models.Application)
        .filter(
            models.Application.candidate_id == current_user.id,
            models.Application.vacancy_id == vacancy_id,
        )
        .first()
    )
    if existing_app:
        raise HTTPException(status_code=409, detail="Je hebt al gesolliciteerd op deze vacature")

    # Meest recente CV ophalen
    cv_record = (
        db.query(models.CandidateCV)
        .filter(models.CandidateCV.candidate_id == current_user.id)
        .order_by(models.CandidateCV.id.desc())
        .first()
    )
    cv_text = cv_record.extracted_text if cv_record else ""

    # Sollicitatie aanmaken
    application = models.Application(
        candidate_id=current_user.id,
        vacancy_id=vacancy_id,
        status="applied",
    )
    db.add(application)
    db.commit()
    db.refresh(application)

    # Intake-antwoorden opslaan
    try:
        answers_data = json.loads(intake_answers_json)
        for item in answers_data:
            if item.get("answer"):
                db.add(models.IntakeAnswer(
                    application_id=application.id,
                    question_id=int(item["question_id"]),
                    answer=str(item["answer"]),
                ))
        db.commit()
    except Exception:
        pass

    # AI pre-screening
    match_score = 0
    explanation = "AI analyse niet beschikbaar."
    job_text = (vacancy.extracted_text or vacancy.description or "").strip()
    combined_cv = (cv_text or "") + ("\n\nMOTIVATIE:\n" + motivation_letter if motivation_letter else "")

    if _client and combined_cv.strip() and job_text:
        try:
            resp = _client.chat.completions.create(
                model="gpt-4.1-mini",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Je bent een ervaren recruiter. "
                            "Geef een matchscore (0-100) en een korte uitleg in het Nederlands. "
                            "Geef ALLEEN een JSON-object terug met keys "
                            "'match_score' (int) en 'explanation' (string)."
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            f"KANDIDAAT CV + MOTIVATIE:\n{combined_cv[:3500]}\n\n"
                            f"VACATURE:\n{job_text[:2000]}"
                        ),
                    },
                ],
                response_format={"type": "json_object"},
            )
            data = json.loads(resp.choices[0].message.content)
            match_score = max(0, min(100, int(data.get("match_score", 0))))
            explanation = data.get("explanation", "").strip() or explanation
        except Exception as exc:
            explanation = f"AI analyse mislukt: {exc}"

    db.add(models.AIResult(
        application_id=application.id,
        match_score=match_score,
        summary=explanation,
    ))
    db.commit()

    # E-mail notificaties
    employer = db.query(models.User).filter(models.User.id == vacancy.employer_id).first()
    send_application_confirmation(
        candidate_email=current_user.email,
        candidate_name=current_user.full_name or current_user.email,
        vacancy_title=vacancy.title,
        match_score=match_score,
    )
    if employer:
        send_new_applicant_notification(
            employer_email=employer.email,
            candidate_name=current_user.full_name or current_user.email,
            candidate_email=current_user.email,
            vacancy_title=vacancy.title,
            match_score=match_score,
        )

    # Claim-mail: stuur eenmalig als dit een gescrapede vacature is
    _maybe_send_claim_mail(vacancy_id, vacancy.title, db)

    access_token = create_access_token(subject=str(current_user.id))

    return schemas.ApplyResponse(
        application_id=application.id,
        match_score=match_score,
        explanation=explanation,
        access_token=access_token,
    )
