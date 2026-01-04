# backend/routers/employer_vacancies.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend import models

router = APIRouter(prefix="/employer", tags=["employer-vacancies"])


def _get_current_user():
    """
    We importeren hier pas om circular imports te vermijden.
    """
    from backend.auth import get_current_user  # pas aan als jouw pad anders is
    return get_current_user


@router.get("/vacancies")
def list_vacancies(
    db: Session = Depends(get_db),
    current_user=Depends(_get_current_user()),
):
    # current_user verwacht een ORM user met .id en .role (zoals je auth/me)
    if getattr(current_user, "role", None) != "employer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employer access required")

    vacancies = (
        db.query(models.Vacancy)
        .filter(models.Vacancy.employer_id == current_user.id)
        .order_by(models.Vacancy.id.desc())
        .all()
    )
    return vacancies


@router.post("/vacancies")
def create_vacancy(
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(_get_current_user()),
):
    if getattr(current_user, "role", None) != "employer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employer access required")

    # minimale validatie (Fase B). Later vervangen we dit door Pydantic schema.
    title = (payload.get("title") or "").strip()
    if not title:
        raise HTTPException(status_code=422, detail="title is required")

    vacancy = models.Vacancy(
        employer_id=current_user.id,
        title=title,
        location=payload.get("location"),
        hours_per_week=payload.get("hours_per_week"),
        salary_range=payload.get("salary_range"),
        description=payload.get("description"),
        source_type=payload.get("source_type") or "manual",
        source_filename=payload.get("source_filename"),
        source_storage_key=payload.get("source_storage_key"),
        source_content_type=payload.get("source_content_type"),
        extracted_text=payload.get("extracted_text"),
    )

    db.add(vacancy)
    db.commit()
    db.refresh(vacancy)
    return vacancy
