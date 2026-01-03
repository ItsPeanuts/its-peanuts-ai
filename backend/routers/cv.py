from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend import models
from backend.schemas import CVOut
from backend.services.parsing import extract_text
from backend.routers.auth import get_current_candidate

router = APIRouter(prefix="/cv", tags=["cv"])


@router.post("/upload", response_model=CVOut)
async def upload_cv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: models.Candidate = Depends(get_current_candidate),
):
    if not file:
        raise HTTPException(status_code=400, detail="Missing file")

    file_bytes = await file.read()
    if not file_bytes or len(file_bytes) < 10:
        raise HTTPException(status_code=400, detail="Empty file")

    source_type, extracted = extract_text(file.filename or "", file.content_type or "", file_bytes)
    if not extracted or len(extracted.strip()) < 20:
        # Still store, but warn user; for MVP we block to avoid useless entries
        raise HTTPException(status_code=400, detail="Could not extract meaningful text from CV")

    # One CV per candidate for MVP: overwrite existing
    existing = db.query(models.CandidateCV).filter(models.CandidateCV.candidate_id == user.id).first()
    if existing:
        existing.filename = file.filename or "cv"
        existing.content_type = file.content_type or "application/octet-stream"
        existing.file_bytes = file_bytes
        existing.extracted_text = extracted
        db.commit()
        db.refresh(existing)
        return existing

    cv = models.CandidateCV(
        candidate_id=user.id,
        filename=file.filename or "cv",
        content_type=file.content_type or "application/octet-stream",
        file_bytes=file_bytes,
        extracted_text=extracted,
    )
    db.add(cv)
    db.commit()
    db.refresh(cv)
    return cv


@router.get("/me", response_model=CVOut)
def get_my_cv(
    db: Session = Depends(get_db),
    user: models.Candidate = Depends(get_current_candidate),
):
    cv = db.query(models.CandidateCV).filter(models.CandidateCV.candidate_id == user.id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="No CV uploaded")
    return cv
