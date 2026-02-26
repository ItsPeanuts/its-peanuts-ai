from __future__ import annotations

import json
import os
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from openai import OpenAI
from sqlalchemy.orm import Session

from backend import models, schemas
from backend.db import get_db
from backend.security import create_access_token, hash_password
from backend.services.text_extract import extract_text

router = APIRouter(prefix="/vacancies", tags=["public-vacancies"])

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

    return schemas.PublicVacancyDetail(
        id=vacancy.id,
        title=vacancy.title,
        location=vacancy.location,
        hours_per_week=vacancy.hours_per_week,
        salary_range=vacancy.salary_range,
        description=vacancy.description,
        created_at=vacancy.created_at,
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

    access_token = create_access_token(subject=str(candidate.id))

    return schemas.ApplyResponse(
        application_id=application.id,
        match_score=match_score,
        explanation=explanation,
        access_token=access_token,
    )
