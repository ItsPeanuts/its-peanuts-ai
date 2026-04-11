"""
Admin panel router — alleen toegankelijk voor gebruikers met role='admin'.

Bootstrap eerste admin via:
  POST /admin/bootstrap  { "token": "<BOOTSTRAP_TOKEN>", "email": "...", "password": "..." }
"""

import os
from datetime import date, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date

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


class AdminPasswordReset(BaseModel):
    new_password: str = Field(min_length=8)


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

    # Ontkoppel van organisatie
    user.org_id = None
    db.flush()

    # Haal alle vacancy-IDs op van deze gebruiker (werkgever)
    vacancy_ids = [
        row[0] for row in
        db.query(models.Vacancy.id).filter(models.Vacancy.employer_id == user_id).all()
    ]

    # Haal alle application-IDs op (als kandidaat + via vacatures)
    app_ids: set[int] = set()
    for row in db.query(models.Application.id).filter(models.Application.candidate_id == user_id).all():
        app_ids.add(row[0])
    if vacancy_ids:
        for row in db.query(models.Application.id).filter(models.Application.vacancy_id.in_(vacancy_ids)).all():
            app_ids.add(row[0])

    # Verwijder application-gerelateerde records
    if app_ids:
        id_list = list(app_ids)
        db.query(models.AIResult).filter(models.AIResult.application_id.in_(id_list)).delete(synchronize_session=False)
        db.query(models.IntakeAnswer).filter(models.IntakeAnswer.application_id.in_(id_list)).delete(synchronize_session=False)
        db.query(models.RecruiterChatMessage).filter(models.RecruiterChatMessage.application_id.in_(id_list)).delete(synchronize_session=False)
        db.query(models.VirtualInterviewSession).filter(models.VirtualInterviewSession.application_id.in_(id_list)).delete(synchronize_session=False)
        db.query(models.InterviewSession).filter(models.InterviewSession.application_id.in_(id_list)).delete(synchronize_session=False)
        db.query(models.Application).filter(models.Application.id.in_(id_list)).delete(synchronize_session=False)

    # Verwijder vacancy-gerelateerde records
    if vacancy_ids:
        db.query(models.PromotionRequest).filter(models.PromotionRequest.vacancy_id.in_(vacancy_ids)).delete(synchronize_session=False)
        db.query(models.Vacancy).filter(models.Vacancy.employer_id == user_id).delete(synchronize_session=False)

    # Verwijder kandidaat-CV's
    db.query(models.CandidateCV).filter(models.CandidateCV.candidate_id == user_id).delete(synchronize_session=False)

    db.delete(user)
    db.commit()


@router.patch("/users/{user_id}/password", status_code=200)
def reset_user_password(
    user_id: int,
    payload: AdminPasswordReset,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Admin: stel een nieuw wachtwoord in voor een gebruiker."""
    require_role(current_user, "admin")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Gebruiker niet gevonden")
    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"ok": True}


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


@router.post("/maintenance")
def set_maintenance(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Zet maintenance-modus aan of uit."""
    require_role(current_user, "admin")
    from backend import state
    state.maintenance["enabled"] = bool(payload.get("enabled", False))
    if "message" in payload and payload["message"]:
        state.maintenance["message"] = payload["message"]
    return state.maintenance


@router.get("/promotions")
def list_all_promotions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Alle promoties platform-breed (admin only)."""
    require_role(current_user, "admin")
    import json
    promos = (
        db.query(models.PromotionRequest)
        .order_by(models.PromotionRequest.created_at.desc())
        .all()
    )
    result = []
    for p in promos:
        vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == p.vacancy_id).first()
        employer = db.query(models.User).filter(models.User.id == p.employer_id).first()
        result.append({
            "id": p.id,
            "vacancy_id": p.vacancy_id,
            "vacancy_title": vacancy.title if vacancy else None,
            "employer_email": employer.email if employer else None,
            "duration_days": p.duration_days,
            "total_price": p.total_price,
            "status": p.status,
            "created_at": str(p.created_at),
            "paid_at": str(p.paid_at) if p.paid_at else None,
            "starts_at": str(p.starts_at) if p.starts_at else None,
            "ends_at": str(p.ends_at) if p.ends_at else None,
        })
    return result


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


# ── Analytics endpoints ────────────────────────────────────────────────────

@router.get("/analytics/visitors")
def get_visitor_analytics(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Dagelijkse unieke bezoekers voor de afgelopen N dagen."""
    require_role(current_user, "admin")

    since = date.today() - timedelta(days=days - 1)
    rows = (
        db.query(
            models.VisitorLog.date,
            func.count(models.VisitorLog.session_id).label("visitors"),
        )
        .filter(models.VisitorLog.date >= since)
        .group_by(models.VisitorLog.date)
        .order_by(models.VisitorLog.date.asc())
        .all()
    )

    # Vul ontbrekende dagen aan met 0
    data = {r.date: r.visitors for r in rows}
    result = []
    for i in range(days):
        d = since + timedelta(days=i)
        result.append({"date": str(d), "visitors": data.get(d, 0)})

    return result


@router.get("/analytics/payments")
def get_payment_analytics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Betalingen per maand + totalen per plan."""
    require_role(current_user, "admin")

    payments = (
        db.query(models.PaymentLog)
        .order_by(models.PaymentLog.created_at.desc())
        .all()
    )

    # Groepeer per maand
    monthly: dict = {}
    for p in payments:
        month = p.created_at.strftime("%Y-%m") if p.created_at else "unknown"
        if month not in monthly:
            monthly[month] = {"month": month, "count": 0, "revenue": 0.0, "plans": {}}
        monthly[month]["count"] += 1
        monthly[month]["revenue"] = round(monthly[month]["revenue"] + (p.amount_total or 0), 2)
        plan_key = p.plan or "unknown"
        monthly[month]["plans"][plan_key] = monthly[month]["plans"].get(plan_key, 0) + 1

    # Laatste 12 maanden gesorteerd
    sorted_months = sorted(monthly.values(), key=lambda x: x["month"], reverse=True)[:12]

    total_revenue = sum(p.amount_total or 0 for p in payments)
    active_subscriptions = db.query(models.User).filter(
        models.User.plan.in_(["normaal", "premium"])
    ).count()

    return {
        "monthly": sorted_months,
        "total_revenue": round(total_revenue, 2),
        "total_payments": len(payments),
        "active_subscriptions": active_subscriptions,
        "recent": [
            {
                "id": p.id,
                "invoice_number": p.invoice_number,
                "user_email": p.user_email,
                "plan": p.plan,
                "interval": p.interval,
                "amount_total": p.amount_total,
                "payment_type": p.payment_type,
                "created_at": str(p.created_at),
            }
            for p in payments[:20]
        ],
    }


@router.get("/analytics/signups")
def get_signup_analytics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Kandidaat- en werkgeverregistraties per maand (laatste 12 maanden)."""
    require_role(current_user, "admin")

    users = db.query(models.User).filter(models.User.role.in_(["candidate", "employer"])).all()

    monthly: dict = {}
    for u in users:
        if not u.created_at:
            continue
        month = u.created_at.strftime("%Y-%m")
        if month not in monthly:
            monthly[month] = {"month": month, "candidates": 0, "employers": 0}
        if u.role == "candidate":
            monthly[month]["candidates"] += 1
        else:
            monthly[month]["employers"] += 1

    sorted_months = sorted(monthly.values(), key=lambda x: x["month"], reverse=True)[:12]
    return sorted_months
