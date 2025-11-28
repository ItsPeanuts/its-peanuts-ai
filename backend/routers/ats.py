from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from backend.db import get_db
from backend import models
from backend.services.ai_match import rank_candidates_for_job

router = APIRouter()


# =========================
# Pydantic schemas
# =========================

class CompanyCreate(BaseModel):
    name: str
    kvk_number: Optional[str] = None
    vat_number: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: EmailStr
    contact_phone: Optional[str] = None
    iban: Optional[str] = None
    account_holder: Optional[str] = None


class CompanyOut(BaseModel):
    id: int
    name: str
    contact_email: EmailStr
    billing_plan: str
    trial_jobs_used: int

    class Config:
        orm_mode = True


class JobCreate(BaseModel):
    company_id: int
    title: str
    description: str
    location: Optional[str] = None
    salary_range: Optional[str] = None


class JobOut(BaseModel):
    id: int
    company_id: int
    title: str
    location: Optional[str]
    salary_range: Optional[str]
    status: str
    is_trial: bool

    class Config:
        orm_mode = True


class CandidateCreate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    cv_text: str


class CandidateOut(BaseModel):
    id: int
    job_id: Optional[int]
    full_name: Optional[str]
    email: Optional[EmailStr]
    cv_text: str
    match_score: Optional[int]

    class Config:
        orm_mode = True


class CandidateListItem(BaseModel):
    id: int
    full_name: Optional[str]
    email: Optional[EmailStr]
    match_score: Optional[int] = None
    explanation: Optional[str] = None

    class Config:
        orm_mode = True


# =========================
# Endpoints: bedrijF
# =========================

@router.post("/companies", response_model=CompanyOut)
def create_company(payload: CompanyCreate, db: Session = Depends(get_db)):
    """Maak een nieuw bedrijfsaccount (met trial-info)."""
    existing = (
        db.query(models.Company)
        .filter(models.Company.contact_email == payload.contact_email)
        .first()
    )
    if existing:
        # Voor nu: gewoon hetzelfde bedrijf teruggeven als het al bestaat
        return existing

    company = models.Company(
        name=payload.name,
        kvk_number=payload.kvk_number,
        vat_number=payload.vat_number,
        contact_name=payload.contact_name,
        contact_email=payload.contact_email,
        contact_phone=payload.contact_phone,
        iban=payload.iban,
        account_holder=payload.account_holder,
        billing_plan="trial",
        trial_jobs_used=0,
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


# =========================
# Endpoints: vacatures
# =========================

@router.post("/jobs", response_model=JobOut)
def create_job(payload: JobCreate, db: Session = Depends(get_db)):
    """Plaats een vacature voor een bedrijf (eerste kan trial zijn)."""
    company = db.query(models.Company).filter(models.Company.id == payload.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")

    is_trial = False
    # Eenvoudige logica: eerste vacature = trial
    if company.billing_plan == "trial" and (company.trial_jobs_used or 0) == 0:
        is_trial = True
        company.trial_jobs_used = 1
        db.add(company)

    job = models.Job(
        company_id=payload.company_id,
        title=payload.title,
        description=payload.description,
        location=payload.location,
        salary_range=payload.salary_range,
        status="open",
        is_trial=is_trial,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.get("/companies/{company_id}/jobs", response_model=List[JobOut])
def list_company_jobs(company_id: int, db: Session = Depends(get_db)):
    """
    Alle vacatures van één bedrijf.

    Wordt gebruikt door de frontend-knop:
    - 'Laad mijn vacatures'
    """
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")

    jobs = (
        db.query(models.Job)
        .filter(models.Job.company_id == company_id)
        .order_by(models.Job.created_at.desc())
        .all()
    )
    return jobs


# =========================
# Endpoints: kandidaten
# =========================

@router.post("/jobs/{job_id}/apply", response_model=CandidateOut)
def apply_to_job(job_id: int, payload: CandidateCreate, db: Session = Depends(get_db)):
    """Kandidaat solliciteert op een vacature."""
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Vacature niet gevonden")

    candidate = models.CandidateProfile(
        job_id=job.id,
        full_name=payload.full_name,
        email=payload.email,
        cv_text=payload.cv_text,
        match_score=None,
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return candidate


@router.get("/jobs/{job_id}/candidates", response_model=List[CandidateListItem])
def list_candidates_for_job(job_id: int, db: Session = Depends(get_db)):
    """Alle kandidaten voor één vacature (voor het dashboard van de werkgever)."""
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Vacature niet gevonden")

    candidates = (
        db.query(models.CandidateProfile)
        .filter(models.CandidateProfile.job_id == job_id)
        .order_by(models.CandidateProfile.created_at.desc())
        .all()
    )

    items = []
    for c in candidates:
        items.append(
            CandidateListItem(
                id=c.id,
                full_name=c.full_name,
                email=c.email,
                match_score=c.match_score,
            )
        )
    return items


# =========================
# AI-ranking
# =========================

@router.post("/jobs/{job_id}/ai-rank-internal", response_model=List[CandidateListItem])
def ai_rank_internal(job_id: int, db: Session = Depends(get_db)):
    """
    Laat AI kandidaten rangschikken op basis van CV + vacaturetekst.
    Dit wordt aangeroepen door de frontend-knop 'Laat AI sorteren'.
    """
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Vacature niet gevonden")

    candidates = (
        db.query(models.CandidateProfile)
        .filter(models.CandidateProfile.job_id == job_id)
        .order_by(models.CandidateProfile.created_at.desc())
        .all()
    )

    if not candidates:
        return []

    ranked = rank_candidates_for_job(job, candidates)

    # rank_candidates_for_job geeft lijst dicts terug
    # met candidate_id, match_score, explanation, etc.
    out: List[CandidateListItem] = []
    for item in ranked:
        # zoek bijbehorende candidate
        c = next((c for c in candidates if c.id == item["candidate_id"]), None)
        if not c:
            continue
        out.append(
            CandidateListItem(
                id=c.id,
                full_name=c.full_name,
                email=c.email,
                match_score=item.get("match_score"),
                explanation=item.get("explanation"),
            )
        )
    return out






