from __future__ import annotations

import json
import os
from typing import List

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


@router.get("/recommendations", response_model=List[schemas.RecommendationOut])
def get_recommendations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Geeft top-3 aanbevolen vacatures op basis van het CV van de kandidaat.
    Maakt GEEN Application of AIResult aan — puur informatief."""
    require_role(current_user, "candidate")

    if not _openai_enabled():
        raise HTTPException(status_code=501, detail="AI not configured: set OPENAI_API_KEY on Render")

    # Nieuwste CV ophalen
    cv = (
        db.query(models.CandidateCV)
        .filter(models.CandidateCV.candidate_id == current_user.id)
        .order_by(models.CandidateCV.id.desc())
        .first()
    )
    if not cv or not (cv.extracted_text or "").strip():
        return []  # Geen CV → lege lijst, geen fout

    # Al-gesolliciteerde vacancy IDs (uitsluiten)
    applied_ids = {
        row.vacancy_id
        for row in db.query(models.Application.vacancy_id)
        .filter(models.Application.candidate_id == current_user.id)
        .all()
    }

    # Actieve vacatures ophalen (max 8, nieuwste eerst)
    vac_query = (
        db.query(models.Vacancy)
        .filter(models.Vacancy.status == "actief")
    )
    if applied_ids:
        vac_query = vac_query.filter(models.Vacancy.id.notin_(applied_ids))
    vacancies = vac_query.order_by(models.Vacancy.id.desc()).limit(8).all()
    if not vacancies:
        return []

    # Bouw vacatureoverzicht voor de prompt
    vac_lines = "\n".join(
        f"- ID {v.id}: {v.title} | {v.location or 'locatie onbekend'} | {(v.description or '')[:200]}"
        for v in vacancies
    )

    prompt = f"""
Je bent een recruiter-AI. Analyseer welke vacatures het beste passen bij het CV.

CV (samenvatting, eerste 1000 tekens):
{cv.extracted_text[:1000]}

Beschikbare vacatures:
{vac_lines}

Geef een JSON-array terug van de TOP 3 beste matches, gesorteerd van hoog naar laag:
[
  {{"vacancy_id": <id>, "match_score": <0-100>, "reason": "<max 12 woorden NL waarom goede match>"}},
  ...
]
Geef ALLEEN de JSON-array terug. Geen markdown, geen tekst buiten de array.
""".strip()

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    model_name = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    try:
        resp = client.chat.completions.create(
            model=model_name,
            temperature=0.2,
            messages=[
                {"role": "system", "content": "Return ONLY a valid JSON array. No markdown."},
                {"role": "user", "content": prompt},
            ],
        )
        content = (resp.choices[0].message.content or "").strip()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OpenAI error: {e}")

    try:
        parsed = json.loads(content)
        if not isinstance(parsed, list):
            return []
        raw: list[dict] = parsed
    except Exception:
        return []

    # Koppel vacature-info terug aan resultaten
    vac_map = {v.id: v for v in vacancies}
    results: List[schemas.RecommendationOut] = []
    for item in raw[:3]:
        vid = item.get("vacancy_id")
        v = vac_map.get(vid)
        if v:
            results.append(schemas.RecommendationOut(
                vacancy_id=v.id,
                title=v.title,
                location=v.location,
                match_score=max(0, min(100, int(item.get("match_score", 0)))),
                reason=str(item.get("reason", "")),
            ))
    return results
