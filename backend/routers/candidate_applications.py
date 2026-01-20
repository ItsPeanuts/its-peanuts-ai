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
