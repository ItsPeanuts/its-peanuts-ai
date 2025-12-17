from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from backend.db import get_db
from backend import models
from backend.routers.auth import get_current_candidate
from backend.services.cv_parser import parse_cv

router = APIRouter()

@router.post("/upload-cv")
async def upload_cv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current: models.Candidate = Depends(get_current_candidate),
):
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Leeg bestand")

    try:
        _, text = parse_cv(file.filename or "cv.txt", data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    text = (text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Kon geen tekst uit CV halen")

    current.cv_text = text
    current.cv_updated_at = datetime.utcnow()
    db.add(current)
    db.commit()

    return {"status": "ok", "cv_length": len(text)}
