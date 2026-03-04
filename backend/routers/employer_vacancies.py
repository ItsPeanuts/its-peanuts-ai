from typing import List

from fastapi import APIRouter, Depends, HTTPException
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
    )
    db.add(vacancy)
    db.commit()
    db.refresh(vacancy)
    return vacancy



