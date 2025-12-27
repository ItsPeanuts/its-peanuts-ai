from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from backend.db import get_db
from backend import models
from backend.services.auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_token,
)

router = APIRouter(prefix="/auth", tags=["Auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


@router.post("/candidate/register")
def candidate_register(email: str, password: str, full_name: str | None = None, db: Session = Depends(get_db)):
    existing = db.query(models.Candidate).filter(models.Candidate.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email bestaat al")

    cand = models.Candidate(
        email=email,
        full_name=full_name,
        hashed_password=hash_password(password),
    )
    db.add(cand)
    db.commit()
    db.refresh(cand)
    return {"id": cand.id, "email": cand.email, "full_name": cand.full_name}


@router.post("/token")
def login_token(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Let op: dit gebruikt candidate login als default.
    user = db.query(models.Candidate).filter(models.Candidate.email == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Onjuiste login")

    token = create_access_token({"sub": str(user.id), "type": "candidate"})
    return {"access_token": token, "token_type": "bearer"}


def get_current_candidate(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> models.Candidate:
    payload = decode_token(token)
    if not payload or payload.get("type") != "candidate":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Ongeldig token")

    user_id = payload.get("sub")
    cand = db.query(models.Candidate).filter(models.Candidate.id == int(user_id)).first()
    if not cand:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Gebruiker niet gevonden")
    return cand


@router.get("/me")
def me(current: models.Candidate = Depends(get_current_candidate)):
    return {"id": current.id, "email": current.email, "full_name": current.full_name}
