from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.db import get_db
from backend import models
from backend.routers.auth import get_current_candidate
from backend.schemas import ApplyRequest

router = APIRouter()

@router.post("/apply")
def apply(req: ApplyRequest, db: Session = Depends(get_db), current: models.Candidate = Depends(get_current_candidate)):
    job = db.query(models.Job).filter(models.Job.id == req.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Vacature niet gevonden")

    # voorkom dubbel solliciteren
    existing = (
        db.query(models.Application)
        .filter(models.Application.job_id == req.job_id, models.Application.candidate_id == current.id)
        .first()
    )
    if existing:
        return {"status": "ok", "application_id": existing.id, "note": "Bestond al"}

    app = models.Application(candidate_id=current.id, job_id=req.job_id)
    db.add(app)
    db.commit()
    db.refresh(app)

    return {"status": "ok", "application_id": app.id}

@router.get("/my")
def my_applications(db: Session = Depends(get_db), current: models.Candidate = Depends(get_current_candidate)):
    apps = (
        db.query(models.Application)
        .filter(models.Application.candidate_id == current.id)
        .order_by(models.Application.created_at.desc())
        .all()
    )

    out = []
    for a in apps:
        out.append({
            "id": a.id,
            "job_id": a.job_id,
            "status": a.status,
            "created_at": a.created_at,
            "job_title": a.job.title if a.job else None,
            "company_name": a.job.company.name if a.job and a.job.company else None
        })
    return out
