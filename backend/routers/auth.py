import os
import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import jwt, JWTError

from backend.db import get_db
from backend import models, schemas

router = APIRouter(prefix="/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

JWT_SECRET = os.getenv("JWT_SECRET", "").strip()
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET env var is missing")

JWT_ALG = "HS256"
JWT_EXPIRE_SECONDS = int(os.getenv("JWT_EXPIRE_SECONDS", "2592000"))  # 30 days default
BOOTSTRAP_TOKEN = os.getenv("BOOTSTRAP_TOKEN", "Peanuts-Setup-2025!").strip()


def _hash_password(pw: str) -> str:
    return pwd_context.hash(pw)


def _verify_password(pw: str, hashed: str) -> bool:
    return pwd_context.verify(pw, hashed)


def _create_access_token(user_id: int) -> str:
    now = int(time.time())
    payload = {"sub": str(user_id), "iat": now, "exp": now + JWT_EXPIRE_SECONDS}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def _get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.email == email).first()


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        sub = payload.get("sub")
        if not sub:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        user_id = int(sub)
    except (JWTError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


@router.post("/register", response_model=schemas.UserOut)
def register_candidate(payload: schemas.RegisterIn, db: Session = Depends(get_db)):
    if payload.bootstrap_token != BOOTSTRAP_TOKEN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid bootstrap token")

    existing = _get_user_by_email(db, payload.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = models.User(
        email=payload.email,
        hashed_password=_hash_password(payload.password),
        full_name=payload.full_name,
        role="candidate",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return schemas.UserOut(id=user.id, email=user.email, full_name=user.full_name, role=user.role)


@router.post("/register-employer", response_model=schemas.UserOut)
def register_employer(payload: schemas.RegisterIn, db: Session = Depends(get_db)):
    if payload.bootstrap_token != BOOTSTRAP_TOKEN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid bootstrap token")

    existing = _get_user_by_email(db, payload.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = models.User(
        email=payload.email,
        hashed_password=_hash_password(payload.password),
        full_name=payload.full_name,
        role="employer",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return schemas.UserOut(id=user.id, email=user.email, full_name=user.full_name, role=user.role)


@router.post("/login", response_model=schemas.TokenOut)
def login(payload: schemas.LoginIn, db: Session = Depends(get_db)):
    user = _get_user_by_email(db, payload.email)
    if not user or not _verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = _create_access_token(user.id)
    return schemas.TokenOut(access_token=token, token_type="bearer")


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return schemas.UserOut(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
    )







