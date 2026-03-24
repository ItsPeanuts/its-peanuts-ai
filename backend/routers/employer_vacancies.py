from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.db import get_db
from backend import models, schemas
from backend.routers.auth import get_current_user, require_role

router = APIRouter(prefix="/employer/vacancies", tags=["employer-vacancies"])


@router.get("", response_model=List[schemas.VacancyOut])
def list_vacancies(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_role(current_user, "employer")

    rows = (
        db.query(models.Vacancy)
        .filter(models.Vacancy.employer_id == current_user.id)
        .order_by(models.Vacancy.id.desc())
        .all()
    )
    return rows


PLAN_VACANCY_LIMITS = {"gratis": 1, "normaal": 10}  # None = onbeperkt (premium)


@router.post("", response_model=schemas.VacancyOut)
def create_vacancy(
    payload: schemas.VacancyCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_role(current_user, "employer")

    # Controleer plan-limiet op aantal vacatures
    plan = current_user.plan or "gratis"
    limit = PLAN_VACANCY_LIMITS.get(plan)  # None = onbeperkt
    if limit is not None and current_user.role != "admin":
        current_count = (
            db.query(models.Vacancy)
            .filter(models.Vacancy.employer_id == current_user.id)
            .count()
        )
        if current_count >= limit:
            plan_label = "Gratis" if plan == "gratis" else "Normaal"
            upgrade_to = "Normaal" if plan == "gratis" else "Premium"
            raise HTTPException(
                status_code=403,
                detail=(
                    f"Je {plan_label}-abonnement staat maximaal {limit} "
                    f"vacature{'s' if limit != 1 else ''} toe. "
                    f"Upgrade naar {upgrade_to} voor meer vacatures."
                ),
            )

    vacancy = models.Vacancy(
        employer_id=current_user.id,
        title=payload.title,
        location=payload.location,
        hours_per_week=payload.hours_per_week,
        salary_range=payload.salary_range,
        description=payload.description,
        interview_type=payload.interview_type or "both",
        employment_type=payload.employment_type,
        work_location=payload.work_location,
    )
    db.add(vacancy)
    db.commit()
    db.refresh(vacancy)
    return vacancy


class VacancyUpdate(BaseModel):
    title: str
    location: str = ""
    hours_per_week: str = ""
    salary_range: str = ""
    description: str = ""
    employment_type: str = ""
    work_location: str = ""
    interview_type: str = "both"


@router.put("/{vacancy_id}", response_model=schemas.VacancyOut)
def update_vacancy(
    vacancy_id: int,
    payload: VacancyUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Bewerk een bestaande vacature."""
    require_role(current_user, "employer")

    vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == vacancy_id).first()
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacature niet gevonden")
    if vacancy.employer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Geen toegang tot deze vacature")

    vacancy.title = payload.title
    vacancy.location = payload.location or None
    vacancy.hours_per_week = payload.hours_per_week or None
    vacancy.salary_range = payload.salary_range or None
    vacancy.description = payload.description or None
    vacancy.employment_type = payload.employment_type or None
    vacancy.work_location = payload.work_location or None
    vacancy.interview_type = payload.interview_type or "both"
    db.commit()
    db.refresh(vacancy)
    return vacancy


VALID_STATUSES = {"concept", "actief", "offline"}


class StatusUpdate(BaseModel):
    status: str  # "concept" | "actief" | "offline"


@router.patch("/{vacancy_id}/status", response_model=schemas.VacancyOut)
def update_vacancy_status(
    vacancy_id: int,
    payload: StatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Zet een vacature op concept, actief of offline."""
    require_role(current_user, "employer")

    if payload.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Ongeldige status (kies: {', '.join(VALID_STATUSES)})")

    vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == vacancy_id).first()
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacature niet gevonden")
    if vacancy.employer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Geen toegang tot deze vacature")

    vacancy.status = payload.status
    db.commit()
    db.refresh(vacancy)
    return vacancy
