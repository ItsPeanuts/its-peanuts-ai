from __future__ import annotations

import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.db import get_db
from backend import models, schemas
from backend.routers.auth import get_current_user, require_role

from openai import OpenAI

router = APIRouter(prefix="/candidate", tags=["candidate-analyze"])


def _openai_enabled() -> bool:
    return bool(os.getenv("OPENAI_API_KEY", "").strip())


@router.post("/analyze/{vacancy_id}", response_model=schemas.AIResultOut)
def analyze(
    vacancy_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_role(current_user, "candidate")

    if not _openai_enabled():
        raise HTTPException(status_code=501, detail="AI not configured: set OPENAI_API_KEY on Render")

    vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == vacancy_id).first()
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found")

    # latest CV
    cv = (
        db.query(models.CandidateCV)
        .filter(models.CandidateCV.candidate_id == current_user.id)
        .order_by(models.CandidateCV.id.desc())
        .first()
    )
    if not cv or not (cv.extracted_text or "").strip():
        raise HTTPException(status_code=400, detail="No CV uploaded yet")

    # ensure application exists (or create)
    app = (
        db.query(models.Application)
        .filter(models.Application.candidate_id == current_user.id, models.Application.vacancy_id == vacancy_id)
        .first()
    )
    if not app:
        app = models.Application(candidate_id=current_user.id, vacancy_id=vacancy_id, status="applied")
        db.add(app)
        db.commit()
        db.refresh(app)

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    prompt = f"""
Je bent een recruiter-assistent.
Analyseer de match tussen CV en vacature en geef strikt JSON terug.

CV (extracted):
{cv.extracted_text}

Vacature:
Titel: {vacancy.title}
Locatie: {vacancy.location or ""}
Uren: {vacancy.hours_per_week or ""}
Salaris: {vacancy.salary_range or ""}
Omschrijving:
{vacancy.description or ""}

JSON schema (strikt aanhouden):
{{
  "match_score": 0-100,
  "summary": "korte samenvatting",
  "strengths": "bulletpoints als tekst",
  "gaps": "bulletpoints als tekst",
  "suggested_questions": "3-7 intake vragen als tekst"
}}
""".strip()

    try:
        resp = client.chat.completions.create(
            model=model,
            temperature=0.2,
            messages=[
                {"role": "system", "content": "Return ONLY valid JSON. No markdown."},
                {"role": "user", "content": prompt},
            ],
        )
        content = (resp.choices[0].message.content or "").strip()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OpenAI error: {e}")

    # Parse JSON safely
    import json
    try:
        data = json.loads(content)
    except Exception:
        raise HTTPException(status_code=502, detail=f"AI returned invalid JSON: {content[:300]}")

    result = models.AIResult(
        application_id=app.id,
        match_score=int(data.get("match_score")) if data.get("match_score") is not None else None,
        summary=data.get("summary"),
        strengths=data.get("strengths"),
        gaps=data.get("gaps"),
        suggested_questions=data.get("suggested_questions"),
    )
    db.add(result)
    db.commit()
    db.refresh(result)
    return result
