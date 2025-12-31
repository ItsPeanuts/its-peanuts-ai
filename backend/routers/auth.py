from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from backend.database import get_db
from backend import models
from backend.schemas import RegisterRequest, LoginRequest, TokenOut, CandidateOut
from backend.services.auth import hash_password, verify_password
from backend.services.jwt import create_access_token
from backend.settings import settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=CandidateOut)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    # Registratie beveiligd via bootstrap token
    if not settings.REGISTRATION_ENABLED:
        raise HTTPException(status_code=403, detail="Registration disabled")

    if body.bootstrap_token != settings.BOOTSTRAP_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid bootstrap token")

    existing = db.query(models.Candidate).filter(
        models.Candidate.email == body.email
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    candidate = models.Candidate(
        email=body.email,
        full_name=body.full_name,
        hashed_password=hash_password(body.password),
    )

    db.add(candidate)
    db.commit()
    db.refresh(candidate)

    return candidate


@router.post("/login", response_model=TokenOut)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    candidate = db.query(models.Candidate).filter(
        models.Candidate.email == body.email
    ).first()

    if not candidate:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(body.password, candidate.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(
        subject=str(candidate.id)
    )

    return {
        "access_token": token,
        "token_type": "bearer",
    }


@router.get("/me", response_model=CandidateOut)
def me(current_candidate: models.Candidate = Depends(settings.get_current_candidate)):
    return current_candidate



@router.get("/me", response_model=CandidateOut)
def me(current: models.Candidate = Depends(get_current_candidate)):
    return current

