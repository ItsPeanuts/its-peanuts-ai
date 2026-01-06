# backend/routers/candidate_cv.py
from __future__ import annotations

import io
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.routers.auth import get_current_user
from backend import models

router = APIRouter(prefix="/candidate", tags=["candidate-cv"])


@router.post("/cv", response_model=str)
async def upload_cv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> str:
    # Alleen candidates mogen dit
    if getattr(current_user, "role", None) != "candidate":
        raise HTTPException(status_code=403, detail="Candidate role required")

    filename = (file.filename or "").lower()
    content_type = (file.content_type or "").lower()

    is_pdf = filename.endswith(".pdf") or content_type == "application/pdf"
    is_docx = filename.endswith(".docx") or content_type in (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
    )

    if not is_pdf and not is_docx:
        raise HTTPException(status_code=400, detail="Unsupported file type. Upload a .pdf or .docx")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")

    # Parse
    try:
        extracted_text = ""
        if is_pdf:
            # Snelle sanity check: PDF header
            if not data.lstrip().startswith(b"%PDF"):
                raise HTTPException(
                    status_code=400,
                    detail="File does not look like a valid PDF (missing %PDF header). Re-export the PDF and try again.",
                )

            from PyPDF2 import PdfReader  # imported here to keep startup clean

            reader = PdfReader(io.BytesIO(data))
            parts: list[str] = []
            for page in reader.pages:
                txt = page.extract_text() or ""
                if txt.strip():
                    parts.append(txt)
            extracted_text = "\n\n".join(parts).strip()

        else:  # docx
            from docx import Document  # python-docx

            doc = Document(io.BytesIO(data))
            extracted_text = "\n".join([p.text for p in doc.paragraphs if p.text]).strip()

    except HTTPException:
        raise
    except Exception as e:
        # Cruciaal: nooit meer 500 door parsing
        raise HTTPException(
            status_code=400,
            detail=f"Could not read document: {type(e).__name__}: {str(e)}",
        )

    if not extracted_text:
        # Geen crash, maar wel duidelijke output
        raise HTTPException(status_code=400, detail="No text could be extracted from this document.")

    # MVP: alleen tekst teruggeven. Opslaan doen we later (dan voegen we models.CandidateCV toe).
    return extracted_text
