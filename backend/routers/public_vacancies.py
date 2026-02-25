from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.db import get_db
from backend import models, schemas

router = APIRouter(prefix="/vacancies", tags=["public-vacancies"])


@router.get("", response_model=List[schemas.VacancyPublicOut])
def list_public_vacancies(
    location: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    q = db.query(models.Vacancy).order_by(models.Vacancy.id.desc())

    if location:
        q = q.filter(models.Vacancy.location.ilike(f"%{location}%"))

    if search:
        q = q.filter(
            models.Vacancy.title.ilike(f"%{search}%")
            | models.Vacancy.description.ilike(f"%{search}%")
        )

    rows = q.limit(100).all()
    return rows


@router.get("/{vacancy_id}", response_model=schemas.VacancyPublicOut)
def get_public_vacancy(
    vacancy_id: int,
    db: Session = Depends(get_db),
):
    v = db.query(models.Vacancy).filter(models.Vacancy.id == vacancy_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vacancy not found")
    return v
