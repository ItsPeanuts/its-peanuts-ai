from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.db import get_db
from backend import models, schemas
from backend.routers.auth import get_current_user, require_role

router = APIRouter(prefix="/employer", tags=["employer-applications"])


@router.get("/applications", response_model=List[schemas.ApplicationOut])
def list_applications(
    vacancy_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_role(current_user, "employer")

    q = (
        db.query(models.Application)
        .join(models.Vacancy, models.Application.vacancy_id == models.Vacancy.id)
        .filter(models.Vacancy.employer_id == current_user.id)
    )

    if vacancy_id is not None:
        q = q.filter(models.Application.vacancy_id == vacancy_id)

    rows = q.order_by(models.Application.id.desc()).all()
    return rows


@router.patch("/applications/{application_id}/status", response_model=schemas.ApplicationOut)
def update_status(
    application_id: int,
    payload: schemas.ApplicationStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_role(current_user, "employer")

    app = (
        db.query(models.Application)
        .join(models.Vacancy, models.Application.vacancy_id == models.Vacancy.id)
        .filter(models.Application.id == application_id)
        .filter(models.Vacancy.employer_id == current_user.id)
        .first()
    )
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    app.status = payload.status
    db.commit()
    db.refresh(app)
    return app
