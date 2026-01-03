import io
from typing import Tuple

from PyPDF2 import PdfReader
from docx import Document


def extract_text_from_pdf(data: bytes) -> str:
    reader = PdfReader(io.BytesIO(data))
    parts = []
    for page in reader.pages:
        parts.append(page.extract_text() or "")
    return "\n".join(parts).strip()


def extract_text_from_docx(data: bytes) -> str:
    doc = Document(io.BytesIO(data))
    return "\n".join([p.text for p in doc.paragraphs]).strip()


def normalize_text(text: str) -> str:
    # simpele opschoning (MVP)
    text = text.replace("\r", "\n")
    # dubbele lege regels verminderen
    while "\n\n\n" in text:
        text = text.replace("\n\n\n", "\n\n")
    return text.strip()


def extract_text(filename: str, data: bytes) -> Tuple[str, str]:
    """
    returns: (raw_text, extracted_text)
    raw_text = originele tekst
    extracted_text = opgeschoonde tekst
    """
    name = (filename or "").lower()

    if name.endswith(".pdf"):
        raw = extract_text_from_pdf(data)
    elif name.endswith(".docx"):
        raw = extract_text_from_docx(data)
    elif name.endswith(".txt"):
        raw = data.decode("utf-8", errors="ignore")
    else:
        # fallback: probeer als tekst
        raw = data.decode("utf-8", errors="ignore")

    cleaned = normalize_text(raw)
    return raw, cleaned
