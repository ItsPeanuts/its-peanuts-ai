from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from backend import models
from backend.config import BOOTSTRAP_TOKEN
from backend.database import get_db
from backend.schemas import LoginRequest, TokenOut, CandidateOut, RegisterRequest
from backend.services.auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_candidate(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
) -> models.Candidate:
    payload = decode_token(token)
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    candidate = db.query(models.Candidate).filter(models.Candidate.email == sub).first()
    if not candidate:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return candidate


@router.post("/register", response_model=CandidateOut)
def register(
    body: RegisterRequest,
    db: Session = Depends(get_db),
):
    # Protect registration in production using BOOTSTRAP_TOKEN
    if not BOOTSTRAP_TOKEN or body.bootstrap_token != BOOTSTRAP_TOKEN:
        raise HTTPException(status_code=403, detail="Registration disabled")

    existing = db.query(models.Candidate).filter(models.Candidate.email == body.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already exists")

    candidate = models.Candidate(
        email=body.email.lower().strip(),
        full_name=body.full_name.strip(),
        hashed_password=hash_password(body.password),
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return candidate


@router.post("/login", response_model=TokenOut)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    candidate = db.query(models.Candidate).filter(models.Candidate.email == body.email.lower().strip()).first()
    if not candidate or not verify_password(body.password, candidate.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(subject=candidate.email)
    return TokenOut(access_token=token, token_type="bearer")


@router.get("/me", response_model=CandidateOut)
def me(current: models.Candidate = Depends(get_current_candidate)):
    return current

