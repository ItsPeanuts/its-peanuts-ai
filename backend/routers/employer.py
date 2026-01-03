from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend import models
from backend.schemas import JobCreate, JobOut
from backend.routers.auth import require_employer
from backend.services.documents import extract_text

router = APIRouter(prefix="/employer", tags=["employer"])


@router.post("/jobs/create", response_model=JobOut)
def create_job(
    body: JobCreate,
    db: Session = Depends(get_db),
    employer: models.Candidate = Depends(require_employer),
):
    job = models.Job(
        employer_id=employer.id,
        title=body.title,
        description=body.description,
        location=body.location,
        employment_type=body.employment_type,
        source="manual",
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.post("/jobs/upload", response_model=JobOut)
async def upload_job(
    file: UploadFile = File(...),
    title: str = Form(""),
    location: str = Form(""),
    employment_type: str = Form(""),
    db: Session = Depends(get_db),
    employer: models.Candidate = Depends(require_employer),
):
    content = await file.read()
    text, detected_type = extract_text(file.filename, content)
    if not text or len(text) < 20:
        raise HTTPException(status_code=400, detail="Could not extract enough text from file")

    final_title = title.strip() or file.filename or "Vacature"
    job = models.Job(
        employer_id=employer.id,
        title=final_title,
        description=text,
        location=location or None,
        employment_type=employment_type or None,
        source="upload",
        original_filename=file.filename,
        original_type=detected_type,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.get("/jobs", response_model=list[JobOut])
def list_jobs(
    db: Session = Depends(get_db),
    employer: models.Candidate = Depends(require_employer),
):
    return (
        db.query(models.Job)
        .filter(models.Job.employer_id == employer.id)
        .order_by(models.Job.id.desc())
        .all()
    )


@router.get("/jobs/{job_id}", response_model=JobOut)
def get_job(
    job_id: int,
    db: Session = Depends(get_db),
    employer: models.Candidate = Depends(require_employer),
):
    job = (
        db.query(models.Job)
        .filter(models.Job.id == job_id, models.Job.employer_id == employer.id)
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
