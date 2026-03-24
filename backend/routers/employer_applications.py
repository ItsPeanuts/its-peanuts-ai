from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.db import get_db
from backend import models, schemas
from backend.routers.auth import get_current_user, require_role
from backend.services.email import send_status_update_email

router = APIRouter(prefix="/employer", tags=["employer-applications"])


def _employer_ids(db: Session, current_user: models.User) -> list:
    if current_user.org_id:
        rows = db.query(models.User.id).filter(
            models.User.org_id == current_user.org_id
        ).all()
        return [r.id for r in rows]
    return [current_user.id]


@router.get("/applications", response_model=List[schemas.ApplicationWithCandidateOut])
def list_applications(
    vacancy_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_role(current_user, "employer")

    q = (
        db.query(models.Application)
        .join(models.Vacancy, models.Application.vacancy_id == models.Vacancy.id)
        .filter(models.Vacancy.employer_id.in_(_employer_ids(db, current_user)))
        .filter(models.Application.status != "auto_rejected")
    )

    if vacancy_id is not None:
        q = q.filter(models.Application.vacancy_id == vacancy_id)

    rows = q.order_by(models.Application.id.desc()).all()

    result = []
    for app in rows:
        candidate = db.query(models.User).filter(models.User.id == app.candidate_id).first()
        ai = db.query(models.AIResult).filter(models.AIResult.application_id == app.id).first()

        result.append(schemas.ApplicationWithCandidateOut(
            id=app.id,
            vacancy_id=app.vacancy_id,
            status=app.status,
            created_at=app.created_at,
            candidate_id=app.candidate_id,
            candidate_name=candidate.full_name if candidate else "Onbekend",
            candidate_email=candidate.email if candidate else "",
            match_score=ai.match_score if ai else None,
            ai_summary=ai.summary if ai else None,
            ai_strengths=ai.strengths if ai else None,
            ai_gaps=ai.gaps if ai else None,
            ai_suggested_questions=ai.suggested_questions if ai else None,
        ))

    return result


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
        .filter(models.Vacancy.employer_id.in_(_employer_ids(db, current_user)))
        .first()
    )
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    app.status = payload.status
    db.commit()
    db.refresh(app)

    # Stuur e-mail naar kandidaat bij aangenomen of afgewezen
    if payload.status in ("hired", "rejected"):
        try:
            candidate = db.query(models.User).filter(models.User.id == app.candidate_id).first()
            vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == app.vacancy_id).first()
            if candidate and vacancy:
                send_status_update_email(
                    candidate_email=candidate.email,
                    candidate_name=candidate.full_name or candidate.email,
                    vacancy_title=vacancy.title,
                    new_status=payload.status,
                )
        except Exception:
            pass  # E-mail fout is niet fataal

    return app
