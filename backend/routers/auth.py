# backend/routers/auth.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend import models
from backend.schemas import RegisterRequest, LoginRequest, TokenOut, CandidateOut
from backend.services.auth import hash_password, verify_password
from backend.services.jwt import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=CandidateOut)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    # Bootstrap check (zet BOOTSTRAP_TOKEN in Render env)
    import os
    expected = os.getenv("BOOTSTRAP_TOKEN", "")
    if expected and body.bootstrap_token != expected:
        raise HTTPException(status_code=403, detail="Invalid bootstrap token")

    existing = db.query(models.Candidate).filter(models.Candidate.email == body.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = models.Candidate(
        email=body.email,
        full_name=body.full_name,
        hashed_password=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenOut)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.Candidate).filter(models.Candidate.email == body.email).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(str(user.id))
    return {"access_token": token, "token_type": "bearer"}


