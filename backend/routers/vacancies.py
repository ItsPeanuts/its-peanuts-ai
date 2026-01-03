from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend import models
from backend.schemas import VacancyCreateText, VacancyOut, ApplicationOut
from backend.services.parsing import extract_text
from backend.routers.auth import get_current_candidate

router = APIRouter(prefix="/vacancies", tags=["vacancies"])


@router.post("", response_model=VacancyOut)
def create_vacancy_text(
    body: VacancyCreateText,
    db: Session = Depends(get_db),
    user: models.Candidate = Depends(get_current_candidate),
):
    v = models.Vacancy(
        owner_candidate_id=user.id,
        title=body.title,
        source_type="text",
        filename=None,
        file_bytes=None,
        extracted_text=body.text.strip(),
    )
    db.add(v)
    db.commit()
    db.refresh(v)
    return v


@router.post("/upload", response_model=VacancyOut)
async def upload_vacancy(
    title: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: models.Candidate = Depends(get_current_candidate),
):
    file_bytes = await file.read()
    if not file_bytes or len(file_bytes) < 10:
        raise HTTPException(status_code=400, detail="Empty file")

    source_type, extracted = extract_text(file.filename or "", file.content_type or "", file_bytes)
    if not extracted or len(extracted.strip()) < 50:
        raise HTTPException(status_code=400, detail="Could not extract meaningful text from vacancy upload")

    v = models.Vacancy(
        owner_candidate_id=user.id,
        title=title.strip(),
        source_type=source_type,
        filename=file.filename,
        file_bytes=file_bytes,
        extracted_text=extracted,
    )
    db.add(v)
    db.commit()
    db.refresh(v)
    return v


@router.get("", response_model=list[VacancyOut])
def list_vacancies(
    db: Session = Depends(get_db),
    user: models.Candidate = Depends(get_current_candidate),
):
    # For MVP: return all vacancies (later: employer scoping)
    return db.query(models.Vacancy).order_by(models.Vacancy.id.desc()).all()


@router.get("/{vacancy_id}", response_model=VacancyOut)
def get_vacancy(
    vacancy_id: int,
    db: Session = Depends(get_db),
    user: models.Candidate = Depends(get_current_candidate),
):
    v = db.query(models.Vacancy).filter(models.Vacancy.id == vacancy_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vacancy not found")
    return v


@router.post("/{vacancy_id}/apply", response_model=ApplicationOut)
def apply_to_vacancy(
    vacancy_id: int,
    db: Session = Depends(get_db),
    user: models.Candidate = Depends(get_current_candidate),
):
    v = db.query(models.Vacancy).filter(models.Vacancy.id == vacancy_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vacancy not found")

    # Candidate must have CV for MVP
    cv = db.query(models.CandidateCV).filter(models.CandidateCV.candidate_id == user.id).first()
    if not cv:
        raise HTTPException(status_code=400, detail="Upload your CV before applying")

    existing = (
        db.query(models.Application)
        .filter(models.Application.vacancy_id == vacancy_id, models.Application.candidate_id == user.id)
        .first()
    )
    if existing:
        return existing

    app = models.Application(vacancy_id=vacancy_id, candidate_id=user.id, status="new")
    db.add(app)
    db.commit()
    db.refresh(app)
    return app


@router.get("/{vacancy_id}/applications", response_model=list[ApplicationOut])
def list_applications_for_vacancy(
    vacancy_id: int,
    db: Session = Depends(get_db),
    user: models.Candidate = Depends(get_current_candidate),
):
    # For MVP: only vacancy owner can see applications
    v = db.query(models.Vacancy).filter(models.Vacancy.id == vacancy_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vacancy not found")
    if v.owner_candidate_id != user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    return (
        db.query(models.Application)
        .filter(models.Application.vacancy_id == vacancy_id)
        .order_by(models.Application.id.desc())
        .all()
    )
