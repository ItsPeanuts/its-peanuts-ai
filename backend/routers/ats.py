from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.db import get_db
from backend import models

router = APIRouter(prefix="/ats", tags=["ATS"])


# ---------- Pydantic modellen ----------

class CompanyCreate(BaseModel):
    name: str
    kvk_number: Optional[str] = None
    vat_number: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: str
    contact_phone: Optional[str] = None
    iban: Optional[str] = None
    account_holder: Optional[str] = None


class CompanyResponse(BaseModel):
    id: int
    name: str
    contact_email: str
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


class JobResponse(BaseModel):
    id: int
    company_id: int
    title: str
    status: str
    is_trial: bool

    class Config:
        orm_mode = True


class CandidateApplyRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    cv_text: str


class CandidateResponse(BaseModel):
    id: int
    job_id: Optional[int]
    full_name: Optional[str]
    email: Optional[str]
    match_score: Optional[int]

    class Config:
        orm_mode = True


# Lijst-modellen voor overzichten
class JobListItem(BaseModel):
    id: int
    title: str
    status: str
    is_trial: bool

    class Config:
        orm_mode = True


class CandidateListItem(BaseModel):
    id: int
    full_name: Optional[str]
    email: Optional[str]
    match_score: Optional[int]

    class Config:
        orm_mode = True


# ---------- Endpoints bedrijven ----------

@router.post("/companies", response_model=CompanyResponse)
def create_company(payload: CompanyCreate, db: Session = Depends(get_db)):
    """
    Maakt een nieuw bedrijf aan met trial-abonnement.
    Als hetzelfde e-mailadres al bestaat, geven we gewoon dat bedrijf terug.
    """
    existing = (
        db.query(models.Company)
        .filter(models.Company.contact_email == payload.contact_email)
        .first()
    )
    if existing:
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
        billing_plan="trial",          # trial / active / cancelled / overdue
        trial_jobs_used=0,
        subscription_started_at=None,
        next_billing_date=None,
    )

    db.add(company)
    db.commit()
    db.refresh(company)
    return company


# ---------- Endpoints vacatures ----------

@router.post("/jobs", response_model=JobResponse)
def create_job(payload: JobCreate, db: Session = Depends(get_db)):
    """
    Maakt een vacature aan voor een bedrijf.
    Eerste vacature van een bedrijf = trial (gratis).
    Daarna is_trial=False en kun je later billing/logica koppelen.
    """
    company = db.query(models.Company).filter(models.Company.id == payload.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")

    # Check of dit een trial-vacature mag zijn
    is_trial = False
    if company.billing_plan == "trial" and company.trial_jobs_used < 1:
        is_trial = True
        company.trial_jobs_used += 1
        if company.subscription_started_at is None:
            company.subscription_started_at = None
            company.next_billing_date = None

    job = models.Job(
        company_id=payload.company_id,
        title=payload.title,
        location=payload.location,
        salary_range=payload.salary_range,
        description=payload.description,
        status="open",
        is_trial=is_trial,
    )

    db.add(job)
    db.commit()
    db.refresh(job)

    return job


@router.get("/companies/{company_id}/jobs", response_model=List[JobListItem])
def list_company_jobs(company_id: int, db: Session = Depends(get_db)):
    """
    Geef alle vacatures terug die horen bij één bedrijf.
    Handig voor het werkgevers-dashboard.
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


# ---------- Endpoints sollicitaties ----------

@router.post("/jobs/{job_id}/apply", response_model=CandidateResponse)
def apply_to_job(
    job_id: int,
    payload: CandidateApplyRequest,
    db: Session = Depends(get_db),
):
    """
    Kandidaat solliciteert op een vacature.
    We slaan de kandidaat op bij de juiste job.
    match_score zetten we later met AI.
    """
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Vacature niet gevonden")

    candidate = models.CandidateProfile(
        job_id=job_id,
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
def list_job_candidates(job_id: int, db: Session = Depends(get_db)):
    """
    Geeft alle kandidaten terug die op één vacature hebben gereageerd.
    Dit kun je straks in de frontend tonen als 'kandidatenlijst'.
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
    return candidates




