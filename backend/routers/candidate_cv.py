# backend/routers/candidate_cv.py
from __future__ import annotations

import io
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from backend.db import get_db
from backend import models
from backend.routers.auth import get_current_user

import PyPDF2
from docx import Document


router = APIRouter(prefix="/candidate", tags=["candidate-cv"])


def _require_candidate(user: models.User) -> None:
    if getattr(user, "role", None) != "candidate":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Candidate role required",
        )


def _extract_pdf_text(file_bytes: bytes) -> str:
    reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
    parts: list[str] = []
    for page in reader.pages:
        text = page.extract_text() or ""
        if text.strip():
            parts.append(text)
    return "\n".join(parts).strip()


def _extract_docx_text(file_bytes: bytes) -> str:
    doc = Document(io.BytesIO(file_bytes))
    parts: list[str] = []
    for p in doc.paragraphs:
        t = (p.text or "").strip()
        if t:
            parts.append(t)
    return "\n".join(parts).strip()


@router.post("/cv", response_model=str)
async def upload_cv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> str:
    _require_candidate(current_user)

    filename: Optional[str] = file.filename
    content_type: str = (file.content_type or "").lower()

    # Lees bytes één keer
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    is_pdf = (filename or "").lower().endswith(".pdf") or "pdf" in content_type
    is_docx = (filename or "").lower().endswith(".docx") or "wordprocessingml" in content_type

    if not (is_pdf or is_docx):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Upload a .pdf or .docx",
        )

    try:
        if is_pdf:
            extracted_text = _extract_pdf_text(file_bytes)
        else:
            extracted_text = _extract_docx_text(file_bytes)
    except Exception:
        # Bewust generiek: parsing errors wil je niet “leaken” naar client
        raise HTTPException(status_code=400, detail="Could not parse file")

    # Sla op in DB
    cv_row = models.CandidateCV(
        user_id=current_user.id,
        filename=filename,
        content_type=file.content_type,
        storage_key=None,
        extracted_text=extracted_text,
    )
    db.add(cv_row)
    db.commit()
    db.refresh(cv_row)

    # Response blijft simpel (zoals je Swagger nu toont)
    return extracted_text

