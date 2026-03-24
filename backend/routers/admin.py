"""
Admin panel router — alleen toegankelijk voor gebruikers met role='admin'.

Bootstrap eerste admin via:
  POST /admin/bootstrap  { "token": "<BOOTSTRAP_TOKEN>", "email": "...", "password": "..." }
"""

import os
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.db import get_db
from backend import models
from backend.routers.auth import get_current_user, require_role
from backend.security import hash_password

router = APIRouter(prefix="/admin", tags=["admin"])

BOOTSTRAP_TOKEN = os.getenv("BOOTSTRAP_TOKEN", "")


# ── Schemas ──────────────────────────────────────────────────────────────

class BootstrapRequest(BaseModel):
    token: str
    email: str
    password: str
    full_name: str = "Admin"


class UserAdminOut(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    role: str
    plan: Optional[str]
    org_id: Optional[int] = None

    class Config:
        from_attributes = True


class OrganisationAdminOut(BaseModel):
    id: int
    name: str
    user_count: int = 0

    class Config:
        from_attributes = True


class OrganisationCreateRequest(BaseModel):
    name: str


class PatchUserOrgRequest(BaseModel):
    org_id: Optional[int] = None


class PatchUserRequest(BaseModel):
    role: Optional[str] = None
    plan: Optional[str] = None


class AdminStats(BaseModel):
    total_users: int
    total_candidates: int
    total_employers: int
    total_vacancies: int
    total_applications: int
    total_interviews: int
    avg_match_score: Optional[float]


class VacancyAdminOut(BaseModel):
    id: int
    title: str
    location: Optional[str]
    employer_id: int
    employer_email: str
    application_count: int

    class Config:
        from_attributes = True


# ── Endpoints ─────────────────────────────────────────────────────────────

@router.post("/bootstrap", response_model=UserAdminOut)
def bootstrap_admin(payload: BootstrapRequest, db: Session = Depends(get_db)):
    """Maak de eerste admin aan via BOOTSTRAP_TOKEN. Werkt maar één keer per token."""
    if not BOOTSTRAP_TOKEN or payload.token != BOOTSTRAP_TOKEN:
        raise HTTPException(status_code=403, detail="Ongeldig bootstrap token")

    existing = db.query(models.User).filter(models.User.email == payload.email.lower()).first()
    if existing:
        # Promoveer of reset wachtwoord van bestaande gebruiker
        existing.role = "admin"
        existing.hashed_password = hash_password(payload.password)
        if payload.full_name:
            existing.full_name = payload.full_name
        db.commit()
        db.refresh(existing)
        return existing

    admin = models.User(
        email=payload.email.lower().strip(),
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role="admin",
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


@router.get("/stats", response_model=AdminStats)
def get_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_role(current_user, "admin")

    avg_row = db.query(func.avg(models.AIResult.match_score)).scalar()

    return AdminStats(
        total_users=db.query(models.User).count(),
        total_candidates=db.query(models.User).filter(models.User.role == "candidate").count(),
        total_employers=db.query(models.User).filter(models.User.role == "employer").count(),
        total_vacancies=db.query(models.Vacancy).count(),
        total_applications=db.query(models.Application).count(),
        total_interviews=db.query(models.InterviewSession).count(),
        avg_match_score=round(float(avg_row), 1) if avg_row else None,
    )


@router.get("/users", response_model=List[UserAdminOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_role(current_user, "admin")
    return db.query(models.User).order_by(models.User.id.desc()).all()


@router.patch("/users/{user_id}", response_model=UserAdminOut)
def patch_user(
    user_id: int,
    payload: PatchUserRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_role(current_user, "admin")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Gebruiker niet gevonden")
    if payload.role:
        user.role = payload.role
    if payload.plan is not None:
        user.plan = payload.plan
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_role(current_user, "admin")
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Kan eigen account niet verwijderen")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Gebruiker niet gevonden")
    db.delete(user)
    db.commit()


@router.get("/vacancies")
def list_all_vacancies(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_role(current_user, "admin")
    vacancies = db.query(models.Vacancy).order_by(models.Vacancy.id.desc()).all()
    result = []
    for v in vacancies:
        employer = db.query(models.User).filter(models.User.id == v.employer_id).first()
        app_count = db.query(models.Application).filter(models.Application.vacancy_id == v.id).count()
        result.append({
            "id": v.id,
            "title": v.title,
            "location": v.location,
            "employer_id": v.employer_id,
            "employer_email": employer.email if employer else "?",
            "application_count": app_count,
        })
    return result


# ── Organisatie endpoints ──────────────────────────────────────────────────

@router.get("/organisations", response_model=List[OrganisationAdminOut])
def list_organisations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_role(current_user, "admin")
    orgs = db.query(models.Organisation).order_by(models.Organisation.id.desc()).all()
    result = []
    for org in orgs:
        count = db.query(models.User).filter(models.User.org_id == org.id).count()
        result.append(OrganisationAdminOut(id=org.id, name=org.name, user_count=count))
    return result


@router.post("/organisations", response_model=OrganisationAdminOut, status_code=201)
def create_organisation(
    payload: OrganisationCreateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_role(current_user, "admin")
    org = models.Organisation(name=payload.name.strip())
    db.add(org)
    db.commit()
    db.refresh(org)
    return OrganisationAdminOut(id=org.id, name=org.name, user_count=0)


@router.delete("/organisations/{org_id}", status_code=204)
def delete_organisation(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_role(current_user, "admin")
    org = db.query(models.Organisation).filter(models.Organisation.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organisatie niet gevonden")
    # Ontkoppel alle gebruikers van deze org
    db.query(models.User).filter(models.User.org_id == org_id).update({"org_id": None})
    db.delete(org)
    db.commit()


@router.patch("/users/{user_id}/organisation", response_model=UserAdminOut)
def patch_user_organisation(
    user_id: int,
    payload: PatchUserOrgRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_role(current_user, "admin")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Gebruiker niet gevonden")
    if payload.org_id is not None:
        org = db.query(models.Organisation).filter(models.Organisation.id == payload.org_id).first()
        if not org:
            raise HTTPException(status_code=404, detail="Organisatie niet gevonden")
    user.org_id = payload.org_id
    db.commit()
    db.refresh(user)
    return user
