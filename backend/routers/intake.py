from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.db import get_db
from backend import models, schemas
from backend.routers.auth import get_current_user, require_role

router = APIRouter(prefix="/intake", tags=["intake"])


# Employer: vragen instellen per vacancy
@router.post("/vacancies/{vacancy_id}/questions", response_model=schemas.IntakeQuestionOut)
def create_question(
    vacancy_id: int,
    payload: schemas.IntakeQuestionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_role(current_user, "employer")

    vacancy = (
        db.query(models.Vacancy)
        .filter(models.Vacancy.id == vacancy_id, models.Vacancy.employer_id == current_user.id)
        .first()
    )
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found")

    q = models.IntakeQuestion(
        vacancy_id=vacancy_id,
        qtype=payload.qtype,
        question=payload.question,
        options_json=payload.options_json,
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    return q


@router.get("/vacancies/{vacancy_id}/questions", response_model=List[schemas.IntakeQuestionOut])
def list_questions(
    vacancy_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # both roles may read questions if linked to vacancy (candidate can see to answer)
    vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == vacancy_id).first()
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found")

    if current_user.role == "employer" and vacancy.employer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    rows = (
        db.query(models.IntakeQuestion)
        .filter(models.IntakeQuestion.vacancy_id == vacancy_id)
        .order_by(models.IntakeQuestion.id.asc())
        .all()
    )
    return rows


# Candidate: antwoorden invullen per application
@router.post("/applications/{application_id}/answers", response_model=List[schemas.IntakeAnswerOut])
def submit_answers(
    application_id: int,
    payload: List[schemas.IntakeAnswerCreate],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_role(current_user, "candidate")

    app = (
        db.query(models.Application)
        .filter(models.Application.id == application_id, models.Application.candidate_id == current_user.id)
        .first()
    )
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # remove existing answers (idempotent submit)
    db.query(models.IntakeAnswer).filter(models.IntakeAnswer.application_id == application_id).delete()

    created = []
    for ans in payload:
        # validate question belongs to same vacancy
        q = (
            db.query(models.IntakeQuestion)
            .filter(models.IntakeQuestion.id == ans.question_id, models.IntakeQuestion.vacancy_id == app.vacancy_id)
            .first()
        )
        if not q:
            raise HTTPException(status_code=400, detail=f"Invalid question_id: {ans.question_id}")

        row = models.IntakeAnswer(
            application_id=application_id,
            question_id=ans.question_id,
            answer=ans.answer,
        )
        db.add(row)
        created.append(row)

    db.commit()
    for row in created:
        db.refresh(row)
    return created


# Employer: antwoorden bekijken
@router.get("/applications/{application_id}/answers", response_model=List[schemas.IntakeAnswerOut])
def get_answers_employer(
    application_id: int,
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

    rows = (
        db.query(models.IntakeAnswer)
        .filter(models.IntakeAnswer.application_id == application_id)
        .order_by(models.IntakeAnswer.id.asc())
        .all()
    )
    return rows
