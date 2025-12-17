from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.db import get_db
from backend import models

router = APIRouter()

@router.get("/")
def list_jobs(db: Session = Depends(get_db)):
    jobs = db.query(models.Job).order_by(models.Job.created_at.desc()).all()
    # company_name optioneel toevoegen voor frontend
    out = []
    for j in jobs:
        out.append({
            "id": j.id,
            "company_id": j.company_id,
            "company_name": j.company.name if j.company else None,
            "title": j.title,
            "location": j.location,
            "salary_range": j.salary_range,
            "description": j.description,
            "status": j.status,
            "is_trial": j.is_trial,
        })
    return out

@router.get("/{job_id}")
def get_job(job_id: int, db: Session = Depends(get_db)):
    j = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not j:
        return {"detail": "Vacature niet gevonden"}
    return {
        "id": j.id,
        "company_id": j.company_id,
        "company_name": j.company.name if j.company else None,
        "title": j.title,
        "location": j.location,
        "salary_range": j.salary_range,
        "description": j.description,
        "status": j.status,
        "is_trial": j.is_trial,
    }
