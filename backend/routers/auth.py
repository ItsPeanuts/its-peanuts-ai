from __future__ import annotations

import os
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from backend.db import get_db
from backend import models, schemas
from backend.security import hash_password, verify_password, create_access_token, SECRET_KEY, ALGORITHM

router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
BOOTSTRAP_TOKEN = os.getenv("BOOTSTRAP_TOKEN", "Peanuts-Setup-2025!").strip()


@router.post("/register", response_model=schemas.UserOut)
def register_candidate(payload: schemas.CandidateRegister, db: Session = Depends(get_db)):
    email = payload.email.lower()
    exists = db.query(models.User).filter(models.User.email == email).first()
    if exists:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = models.User(
        email=email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role="candidate",
        plan=None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/register-employer", response_model=schemas.UserOut)
def register_employer(payload: schemas.EmployerRegister, db: Session = Depends(get_db)):
    if payload.bootstrap_token != BOOTSTRAP_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid bootstrap token")

    email = payload.email.lower()
    exists = db.query(models.User).filter(models.User.email == email).first()
    if exists:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = models.User(
        email=email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role="employer",
        plan="normal",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # OAuth2PasswordRequestForm uses "username" field (we treat it as email)
    email = (form_data.username or "").lower().strip()
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(subject=str(user.id))
    return {"access_token": access_token, "token_type": "bearer"}


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        if not sub:
            raise credentials_exception
        user_id = int(sub)
    except (JWTError, ValueError):
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise credentials_exception
    return user


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user


def require_role(user: models.User, role: str):
    if user.role != role:
        raise HTTPException(status_code=403, detail=f"{role.capitalize()} role required")









