# backend/services/text_extract.py
from __future__ import annotations

from io import BytesIO
from typing import Tuple

from PyPDF2 import PdfReader
from docx import Document


def detect_type(filename: str, content_type: str) -> str:
    name = (filename or "").lower()
    ctype = (content_type or "").lower()

    if name.endswith(".pdf") or "pdf" in ctype:
        return "pdf"
    if name.endswith(".docx") or "word" in ctype or "officedocument" in ctype:
        return "docx"
    if name.endswith(".txt") or "text/plain" in ctype:
        return "txt"
    return "unknown"


def extract_text(file_bytes: bytes, filename: str, content_type: str) -> Tuple[str, str]:
    """
    Returns (source_type, extracted_text)
    source_type: pdf|docx|txt|unknown
    """
    source_type = detect_type(filename, content_type)

    try:
        if source_type == "pdf":
            reader = PdfReader(BytesIO(file_bytes))
            parts = []
            for page in reader.pages:
                parts.append(page.extract_text() or "")
            return source_type, "\n".join(parts).strip()

        if source_type == "docx":
            doc = Document(BytesIO(file_bytes))
            parts = [p.text for p in doc.paragraphs if p.text]
            return source_type, "\n".join(parts).strip()

        if source_type == "txt":
            return source_type, file_bytes.decode("utf-8", errors="ignore").strip()

    except Exception:
        # Fallback: best effort plain decode
        return source_type, file_bytes.decode("utf-8", errors="ignore").strip()

    # Unknown -> try decode
    return source_type, file_bytes.decode("utf-8", errors="ignore").strip()

