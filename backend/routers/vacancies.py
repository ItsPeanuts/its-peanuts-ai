# backend/routers/vacancies.py
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from backend.database import get_db
from backend import models
from backend.schemas import VacancyCreate, VacancyOut, VacancyUpdate, VacancyOutList

from backend.services.storage import get_storage
from backend.services.text_extract import extract_text
from backend.services.user_context import require_employer


router = APIRouter(prefix="/employer/vacancies", tags=["employer-vacancies"])


@router.post("", response_model=VacancyOut)
def create_vacancy(
    body: VacancyCreate,
    db: Session = Depends(get_db),
    employer: models.Candidate = Depends(require_employer),
):
    v = models.Vacancy(
        employer_id=employer.id,
        title=body.title,
        location=body.location,
        hours_per_week=body.hours_per_week,
        salary_range=body.salary_range,
        description=body.description,
        extracted_text=(body.description or "").strip() or None,
        source_type="manual",
    )
    db.add(v)
    db.commit()
    db.refresh(v)
    return v


@router.post("/upload", response_model=VacancyOut)
async def upload_vacancy(
    file: UploadFile = File(...),
    title: str = Form(...),
    location: str | None = Form(None),
    hours_per_week: str | None = Form(None),
    salary_range: str | None = Form(None),
    db: Session = Depends(get_db),
    employer: models.Candidate = Depends(require_employer),
):
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")

    source_type, text = extract_text(data, file.filename or "vacancy", file.content_type or "")
    storage = get_storage()
    storage_key = storage.save_bytes(data, file.filename or "vacancy", file.content_type or "application/octet-stream")

    v = models.Vacancy(
        employer_id=employer.id,
        title=title,
        location=location,
        hours_per_week=hours_per_week,
        salary_range=salary_range,
        description=None,
        source_type=source_type,
        source_filename=file.filename,
        source_storage_key=storage_key,
        source_content_type=file.content_type,
        extracted_text=text or None,
    )
    db.add(v)
    db.commit()
    db.refresh(v)
    return v


@router.get("", response_model=VacancyOutList)
def list_vacancies(
    db: Session = Depends(get_db),
    employer: models.Candidate = Depends(require_employer),
):
    items = (
        db.query(models.Vacancy)
        .filter(models.Vacancy.employer_id == employer.id)
        .order_by(models.Vacancy.id.desc())
        .all()
    )
    return {"items": items}


@router.get("/{vacancy_id}", response_model=VacancyOut)
def get_vacancy(
    vacancy_id: int,
    db: Session = Depends(get_db),
    employer: models.Candidate = Depends(require_employer),
):
    v = (
        db.query(models.Vacancy)
        .filter(models.Vacancy.id == vacancy_id, models.Vacancy.employer_id == employer.id)
        .first()
    )
    if not v:
        raise HTTPException(status_code=404, detail="Vacancy not found")
    return v


@router.put("/{vacancy_id}", response_model=VacancyOut)
def update_vacancy(
    vacancy_id: int,
    body: VacancyUpdate,
    db: Session = Depends(get_db),
    employer: models.Candidate = Depends(require_employer),
):
    v = (
        db.query(models.Vacancy)
        .filter(models.Vacancy.id == vacancy_id, models.Vacancy.employer_id == employer.id)
        .first()
    )
    if not v:
        raise HTTPException(status_code=404, detail="Vacancy not found")

    if body.title is not None:
        v.title = body.title
    if body.location is not None:
        v.location = body.location
    if body.hours_per_week is not None:
        v.hours_per_week = body.hours_per_week
    if body.salary_range is not None:
        v.salary_range = body.salary_range
    if body.description is not None:
        v.description = body.description
        v.extracted_text = (body.description or "").strip() or None
        v.source_type = "manual"

    db.commit()
    db.refresh(v)
    return v


@router.delete("/{vacancy_id}")
def delete_vacancy(
    vacancy_id: int,
    db: Session = Depends(get_db),
    employer: models.Candidate = Depends(require_employer),
):
    v = (
        db.query(models.Vacancy)
        .filter(models.Vacancy.id == vacancy_id, models.Vacancy.employer_id == employer.id)
        .first()
    )
    if not v:
        raise HTTPException(status_code=404, detail="Vacancy not found")

    db.delete(v)
    db.commit()
    return {"ok": True}

