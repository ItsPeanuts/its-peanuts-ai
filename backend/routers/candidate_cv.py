from __future__ import annotations

import io
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from backend.db import get_db
from backend import models, schemas
from backend.routers.auth import get_current_user, require_role

import PyPDF2
import docx

router = APIRouter(prefix="/candidate", tags=["candidate-cv"])


def _extract_text_from_pdf(data: bytes) -> str:
    reader = PyPDF2.PdfReader(io.BytesIO(data))
    parts = []
    for page in reader.pages:
        parts.append(page.extract_text() or "")
    return "\n".join(p.strip() for p in parts if p.strip()).strip()


def _extract_text_from_docx(data: bytes) -> str:
    document = docx.Document(io.BytesIO(data))
    parts = [p.text for p in document.paragraphs if p.text and p.text.strip()]
    return "\n".join(parts).strip()


@router.post("/cv", response_model=str)
async def upload_cv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_role(current_user, "candidate")

    filename = (file.filename or "").lower()
    content_type = (file.content_type or "").lower()

    if not (filename.endswith(".pdf") or filename.endswith(".docx")):
        raise HTTPException(status_code=400, detail="Unsupported file type. Upload a .pdf or .docx")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        if filename.endswith(".pdf") or content_type == "application/pdf":
            extracted = _extract_text_from_pdf(data)
        else:
            extracted = _extract_text_from_docx(data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read file: {e}")

    cv = models.CandidateCV(
        candidate_id=current_user.id,
        source_filename=file.filename,
        source_content_type=file.content_type,
        extracted_text=extracted,
    )
    db.add(cv)
    db.commit()
    db.refresh(cv)

    return extracted


@router.get("/cvs", response_model=List[schemas.CandidateCVOut])
def list_cvs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Lijst van alle geüploade CV's van de ingelogde kandidaat."""
    require_role(current_user, "candidate")

    rows = (
        db.query(models.CandidateCV)
        .filter(models.CandidateCV.candidate_id == current_user.id)
        .order_by(models.CandidateCV.id.desc())
        .all()
    )

    result = []
    for cv in rows:
        text = cv.extracted_text or ""
        result.append(
            schemas.CandidateCVOut(
                id=cv.id,
                source_filename=cv.source_filename,
                source_content_type=cv.source_content_type,
                created_at=cv.created_at,
                text_preview=text[:200] if text else None,
            )
        )
    return result

