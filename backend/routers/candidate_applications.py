from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.db import get_db
from backend import models, schemas
from backend.routers.auth import get_current_user, require_role

router = APIRouter(prefix="/candidate", tags=["candidate-applications"])


@router.post("/apply/{vacancy_id}", response_model=schemas.ApplicationOut)
def apply(
    vacancy_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_role(current_user, "candidate")

    vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == vacancy_id).first()
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found")

    existing = (
        db.query(models.Application)
        .filter(
            models.Application.candidate_id == current_user.id,
            models.Application.vacancy_id == vacancy_id,
        )
        .first()
    )
    if existing:
        return existing

    app = models.Application(
        candidate_id=current_user.id,
        vacancy_id=vacancy_id,
        status="applied",
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return app


@router.get("/applications", response_model=List[schemas.ApplicationOut])
def my_applications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_role(current_user, "candidate")

    rows = (
        db.query(models.Application)
        .filter(models.Application.candidate_id == current_user.id)
        .order_by(models.Application.id.desc())
        .all()
    )
    return rows


@router.get("/my-applications", response_model=List[schemas.ApplicationWithDetails])
def my_applications_with_details(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Verrijkte lijst van sollicitaties met vacatureinfo en laatste AI-score."""
    require_role(current_user, "candidate")

    rows = (
        db.query(models.Application)
        .filter(models.Application.candidate_id == current_user.id)
        .order_by(models.Application.id.desc())
        .all()
    )

    result = []
    for app in rows:
        latest_ai = (
            db.query(models.AIResult)
            .filter(models.AIResult.application_id == app.id)
            .order_by(models.AIResult.id.desc())
            .first()
        )
        result.append(
            schemas.ApplicationWithDetails(
                application_id=app.id,
                vacancy_id=app.vacancy_id,
                vacancy_title=app.vacancy.title,
                vacancy_location=app.vacancy.location,
                status=app.status,
                created_at=app.created_at,
                match_score=latest_ai.match_score if latest_ai else None,
                ai_summary=latest_ai.summary if latest_ai else None,
            )
        )
    return result


@router.get("/applications/{app_id}/ai-result", response_model=schemas.AIResultOut)
def application_ai_result(
    app_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Volledig AI-resultaat voor één sollicitatie van de ingelogde kandidaat."""
    require_role(current_user, "candidate")

    app = (
        db.query(models.Application)
        .filter(
            models.Application.id == app_id,
            models.Application.candidate_id == current_user.id,
        )
        .first()
    )
    if not app:
        raise HTTPException(status_code=404, detail="Sollicitatie niet gevonden")

    ai_result = (
        db.query(models.AIResult)
        .filter(models.AIResult.application_id == app_id)
        .order_by(models.AIResult.id.desc())
        .first()
    )
    if not ai_result:
        raise HTTPException(status_code=404, detail="Geen AI-analyse beschikbaar")

    return ai_result
