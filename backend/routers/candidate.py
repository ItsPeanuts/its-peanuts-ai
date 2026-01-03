from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend import models
from backend.schemas import CVOut
from backend.routers.auth import require_candidate
from backend.services.documents import extract_text

router = APIRouter(prefix="/candidate", tags=["candidate"])


@router.post("/cv/upload", response_model=CVOut)
async def upload_cv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    candidate: models.Candidate = Depends(require_candidate),
):
    content = await file.read()
    text, detected_type = extract_text(file.filename, content)
    if not text or len(text) < 20:
        raise HTTPException(status_code=400, detail="Could not extract enough text from file")

    cv = models.CandidateCV(
        candidate_id=candidate.id,
        text=text,
        original_filename=file.filename,
        original_type=detected_type,
    )
    db.add(cv)
    db.commit()
    db.refresh(cv)
    return cv


@router.get("/cv", response_model=list[CVOut])
def list_my_cvs(
    db: Session = Depends(get_db),
    candidate: models.Candidate = Depends(require_candidate),
):
    return (
        db.query(models.CandidateCV)
        .filter(models.CandidateCV.candidate_id == candidate.id)
        .order_by(models.CandidateCV.id.desc())
        .all()
    )
