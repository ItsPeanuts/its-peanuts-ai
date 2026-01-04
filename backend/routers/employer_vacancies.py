from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.db import get_db
from backend import models, schemas
from backend.routers.auth import get_current_user

router = APIRouter(
    prefix="/employer/vacancies",
    tags=["employer-vacancies"],
)


@router.get("", response_model=List[schemas.VacancyOut])
def list_vacancies(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "employer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)

    return (
        db.query(models.Vacancy)
        .filter(models.Vacancy.employer_id == current_user.id)
        .all()
    )


@router.post("", response_model=schemas.VacancyOut)
def create_vacancy(
    payload: schemas.VacancyCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "employer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)

    vacancy = models.Vacancy(
        employer_id=current_user.id,
        title=payload.title,
        location=payload.location,
        hours_per_week=payload.hours_per_week,
        salary_range=payload.salary_range,
        description=payload.description,
    )

    db.add(vacancy)
    db.commit()
    db.refresh(vacancy)
    return vacancy
