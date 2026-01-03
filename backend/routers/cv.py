from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend import models
from backend.schemas import CVOut, CVTextCreate
from backend.services.text_extract import extract_text, normalize_text

router = APIRouter(prefix="/cv", tags=["cv"])


@router.post("/upload/{candidate_id}", response_model=CVOut)
async def upload_cv(candidate_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    data = await file.read()
    raw, cleaned = extract_text(file.filename, data)

    cv = models.CandidateCV(
        candidate_id=candidate_id,
        file_name=file.filename,
        source="upload",
        raw_text=raw or "",
        extracted_text=cleaned or "",
    )
    db.add(cv)
    db.commit()
    db.refresh(cv)
    return cv


@router.post("/text/{candidate_id}", response_model=CVOut)
def create_cv_from_text(candidate_id: int, body: CVTextCreate, db: Session = Depends(get_db)):
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    raw = body.text or ""
    cleaned = normalize_text(raw)

    cv = models.CandidateCV(
        candidate_id=candidate_id,
        source="text",
        raw_text=raw,
        extracted_text=cleaned,
    )
    db.add(cv)
    db.commit()
    db.refresh(cv)
    return cv
