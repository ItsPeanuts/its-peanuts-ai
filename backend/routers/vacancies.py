from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session

from backend.database import get_db
from backend import models
from backend.schemas import VacancyCreateText, VacancyOut
from backend.services.text_extract import extract_text, normalize_text

router = APIRouter(prefix="/vacancies", tags=["vacancies"])


@router.post("/text", response_model=VacancyOut)
def create_vacancy_text(body: VacancyCreateText, db: Session = Depends(get_db)):
    raw = body.text or ""
    cleaned = normalize_text(raw)

    v = models.Vacancy(
        title=body.title,
        raw_text=raw,
        extracted_text=cleaned,
        source="text",
    )
    db.add(v)
    db.commit()
    db.refresh(v)
    return v


@router.post("/upload", response_model=VacancyOut)
async def create_vacancy_upload(
    title: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    data = await file.read()
    raw, cleaned = extract_text(file.filename, data)

    v = models.Vacancy(
        title=title,
        raw_text=raw or "",
        extracted_text=cleaned or "",
        source="upload",
        file_name=file.filename,
    )
    db.add(v)
    db.commit()
    db.refresh(v)
    return v
