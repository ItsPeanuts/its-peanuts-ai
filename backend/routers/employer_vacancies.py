from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.db import get_db
from backend import models, schemas
from backend.routers.auth import get_current_user


router = APIRouter(prefix="/employer/vacancies", tags=["employer-vacancies"])


@router.get("", response_model=List[schemas.VacancyOut])
def list_vacancies(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if getattr(current_user, "role", None) != "employer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    # Vacatures van deze employer
    vacancies = (
        db.query(models.Vacancy)
        .filter(models.Vacancy.employer_id == current_user.id)
        .order_by(models.Vacancy.id.desc())
        .all()
    )
    return vacancies


@router.post("", response_model=schemas.VacancyOut)
def create_vacancy(
    payload: schemas.VacancyCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if getattr(current_user, "role", None) != "employer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    # Basis validatie (optioneel, maar voorkomt lege records)
    if not payload.title or not payload.location:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="title and location are required",
        )

    vacancy = models.Vacancy(
        employer_id=current_user.id,
        title=payload.title,
        location=payload.location,
        hours_per_week=payload.hours_per_week,
        salary_range=payload.salary_range,
        description=payload.description,
        source_type=getattr(payload, "source_type", None),
        source_filename=getattr(payload, "source_filename", None),
        source_storage_key=getattr(payload, "source_storage_key", None),
        source_content_type=getattr(payload, "source_content_type", None),
        extracted_text=getattr(payload, "extracted_text", None),
    )

    db.add(vacancy)
    db.commit()
    db.refresh(vacancy)
    return vacancy
