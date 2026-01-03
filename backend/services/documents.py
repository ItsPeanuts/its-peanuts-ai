from io import BytesIO
from typing import Tuple

from PyPDF2 import PdfReader
from docx import Document


def extract_text(filename: str, content: bytes) -> Tuple[str, str]:
    """
    Returns (text, detected_type)
    detected_type: pdf | docx | txt | unknown
    """
    name = (filename or "").lower()

    # PDF
    if name.endswith(".pdf"):
        reader = PdfReader(BytesIO(content))
        parts = []
        for page in reader.pages:
            parts.append(page.extract_text() or "")
        return "\n".join(parts).strip(), "pdf"

    # DOCX
    if name.endswith(".docx"):
        doc = Document(BytesIO(content))
        parts = [p.text for p in doc.paragraphs if p.text]
        return "\n".join(parts).strip(), "docx"

    # TXT / fallback
    try:
        text = content.decode("utf-8", errors="ignore")
        return text.strip(), "txt"
    except Exception:
        return "", "unknown"
