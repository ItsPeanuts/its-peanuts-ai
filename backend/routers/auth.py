from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import os

from backend.database import get_db
from backend import models
from backend.schemas import RegisterRequest, LoginRequest, TokenOut, CandidateOut
from backend.services.auth import hash_password, verify_password
from backend.services.jwt import create_access_token, decode_token

router = APIRouter(prefix="/auth", tags=["auth"])
bearer = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> models.Candidate:
    if not creds or not creds.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = decode_token(creds.credentials)
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("No sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(models.Candidate).filter(models.Candidate.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_role(role: str):
    def _dep(user: models.Candidate = Depends(get_current_user)) -> models.Candidate:
        if user.role != role:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user

    return _dep


@router.post("/register", response_model=CandidateOut)
def register_candidate(body: RegisterRequest, db: Session = Depends(get_db)):
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
        role="candidate",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/register-employer", response_model=CandidateOut)
def register_employer(body: RegisterRequest, db: Session = Depends(get_db)):
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
        role="employer",
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


@router.get("/me", response_model=CandidateOut)
def me(user: models.Candidate = Depends(get_current_user)):
    return user


# Exporteer dependencies zodat andere routers ze kunnen gebruiken
require_employer = require_role("employer")
require_candidate = require_role("candidate")






