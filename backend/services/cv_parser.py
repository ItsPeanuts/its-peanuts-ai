from io import BytesIO
from typing import Tuple
from PyPDF2 import PdfReader
import docx

def parse_txt(data: bytes) -> str:
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return data.decode("latin-1", errors="ignore")

def parse_pdf(data: bytes) -> str:
    reader = PdfReader(BytesIO(data))
    parts = []
    for page in reader.pages:
        text = page.extract_text() or ""
        parts.append(text)
    return "\n".join(parts).strip()

def parse_docx(data: bytes) -> str:
    file = BytesIO(data)
    document = docx.Document(file)
    parts = []
    for p in document.paragraphs:
        if p.text:
            parts.append(p.text)
    return "\n".join(parts).strip()

def parse_cv(filename: str, data: bytes) -> Tuple[str, str]:
    lower = filename.lower()
    if lower.endswith(".pdf"):
        return "pdf", parse_pdf(data)
    if lower.endswith(".docx"):
        return "docx", parse_docx(data)
    if lower.endswith(".txt"):
        return "txt", parse_txt(data)
    raise ValueError("Unsupported file type. Use .pdf, .docx or .txt")
