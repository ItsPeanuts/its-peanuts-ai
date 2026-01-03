from io import BytesIO
from typing import Tuple

from PyPDF2 import PdfReader
from docx import Document


def detect_source_type(filename: str, content_type: str) -> str:
    fn = (filename or "").lower()
    ct = (content_type or "").lower()

    if fn.endswith(".pdf") or "pdf" in ct:
        return "pdf"
    if fn.endswith(".docx") or "officedocument.wordprocessingml.document" in ct:
        return "docx"
    return "text"


def extract_text_from_pdf(file_bytes: bytes) -> str:
    reader = PdfReader(BytesIO(file_bytes))
    parts = []
    for page in reader.pages:
        text = page.extract_text() or ""
        parts.append(text)
    return "\n".join(parts).strip()


def extract_text_from_docx(file_bytes: bytes) -> str:
    doc = Document(BytesIO(file_bytes))
    parts = [p.text for p in doc.paragraphs if p.text]
    return "\n".join(parts).strip()


def extract_text(filename: str, content_type: str, file_bytes: bytes) -> Tuple[str, str]:
    source_type = detect_source_type(filename, content_type)

    if source_type == "pdf":
        return source_type, extract_text_from_pdf(file_bytes)
    if source_type == "docx":
        return source_type, extract_text_from_docx(file_bytes)

    # fallback: treat as text
    try:
        return "text", file_bytes.decode("utf-8", errors="ignore").strip()
    except Exception:
        return "text", ""
