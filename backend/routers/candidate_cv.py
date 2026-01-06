# backend/routers/candidate_cv.py
from __future__ import annotations

from io import BytesIO
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.routers.auth import get_current_user
from backend import models


router = APIRouter(prefix="/candidate/cv", tags=["candidate-cv"])


def _extract_text_from_pdf(data: bytes) -> str:
    try:
        from PyPDF2 import PdfReader
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PyPDF2 not available: {e}")

    try:
        reader = PdfReader(BytesIO(data))
        texts = []
        for page in reader.pages:
            t = page.extract_text() or ""
            if t.strip():
                texts.append(t.strip())
        return "\n\n".join(texts).strip()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read PDF: {e}")


def _extract_text_from_docx(data: bytes) -> str:
    try:
        import docx  # python-docx
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"python-docx not available: {e}")

    try:
        document = docx.Document(BytesIO(data))
        lines = []
        for p in document.paragraphs:
            if p.text and p.text.strip():
                lines.append(p.text.strip())
        return "\n".join(lines).strip()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read DOCX: {e}")


def _infer_kind(filename: str, content_type: Optional[str]) -> str:
    fn = (filename or "").lower()
    ct = (content_type or "").lower()

    if fn.endswith(".pdf") or ct == "application/pdf":
        return "pdf"
    if fn.endswith(".docx") or ct in (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
    ):
        return "docx"
    return ""


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_cv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Alleen kandidaten (CV hoort bij candidate account)
    if current_user.role != "candidate":
        raise HTTPException(status_code=403, detail="Candidate role required")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")

    kind = _infer_kind(file.filename, file.content_type)
    if kind not in ("pdf", "docx"):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Upload a .pdf or .docx",
        )

    if kind == "pdf":
        extracted = _extract_text_from_pdf(data)
    else:
        extracted = _extract_text_from_docx(data)

    if not extracted.strip():
        # Niet fatal, maar meestal wel nuttig om te melden
        extracted = ""

    cv = models.CandidateCV(
        candidate_id=current_user.id,
        source_filename=file.filename,
        source_content_type=file.content_type,
        extracted_text=extracted,
    )
    db.add(cv)
    db.commit()
    db.refresh(cv)

    return {
        "id": cv.id,
        "candidate_id": cv.candidate_id,
        "source_filename": cv.source_filename,
        "source_content_type": cv.source_content_type,
        "extracted_text": cv.extracted_text,
        "created_at": str(cv.created_at) if cv.created_at else None,
    }


@router.get("/latest")
def get_latest_cv(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "candidate":
        raise HTTPException(status_code=403, detail="Candidate role required")

    cv = (
        db.query(models.CandidateCV)
        .filter(models.CandidateCV.candidate_id == current_user.id)
        .order_by(models.CandidateCV.id.desc())
        .first()
    )
    if not cv:
        raise HTTPException(status_code=404, detail="No CV found")

    return {
        "id": cv.id,
        "candidate_id": cv.candidate_id,
        "source_filename": cv.source_filename,
        "source_content_type": cv.source_content_type,
        "extracted_text": cv.extracted_text,
        "created_at": str(cv.created_at) if cv.created_at else None,
    }
