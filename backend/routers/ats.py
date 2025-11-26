from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from ..db import SessionLocal
from .. import models

router = APIRouter()


# Dependency om een database sessie per request te krijgen
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------- SCHEMAS ----------

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
        from_attributes = True


class JobCreate(BaseModel):
    company_id: int
    title: str
    description: str
    location: Optional[str] = None
    salary_range: Optional[str] = None


class JobOut(BaseModel):
    id: int
    title: str
    status: str
    is_trial: bool
    company_id: int

    class Config:
        from_attributes = True


# ---------- ENDPOINTS ----------

@router.post("/companies", response_model=CompanyOut)
def create_company(payload: CompanyCreate, db: Session = Depends(get_db)):
    """
    Registreer een nieuw bedrijf.
    Eerste status = trial, eerste vacature wordt gratis.
    """
    existing = db.query(models.Company).filter(
        models.Company.contact_email == payload.contact_email
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Er bestaat al een bedrijf met dit e-mailadres.")

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
        created_at=datetime.utcnow(),
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


@router.post("/jobs", response_model=JobOut)
def create_job(payload: JobCreate, db: Session = Depends(get_db)):
    """
    Maak een vacature aan voor een bedrijf.
    - Als bedrijf in 'trial' staat en nog geen trial job heeft gebruikt -> is_trial = True, trial_jobs_used + 1
    - Anders moet billing_plan 'active' zijn.
    """
    company = db.query(models.Company).filter(models.Company.id == payload.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden.")

    is_trial = False

    if company.billing_plan == "trial" and company.trial_jobs_used == 0:
        # Eerste vacature gratis
        is_trial = True
        company.trial_jobs_used = 1
        db.add(company)
    else:
        if company.billing_plan != "active":
            raise HTTPException(
                status_code=402,  # Payment Required
                detail="Abonnement vereist. Activeer een betaald plan om meer vacatures te plaatsen."
            )

    job = models.Job(
        company_id=company.id,
        title=payload.title,
        description=payload.description,
        location=payload.location,
        salary_range=payload.salary_range,
        status="open",
        is_trial=is_trial,
        created_at=datetime.utcnow(),
    )

    db.add(job)
    db.commit()
    db.refresh(job)
    return job

