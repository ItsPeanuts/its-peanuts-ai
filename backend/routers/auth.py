import os
import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from slowapi import Limiter
from slowapi.util import get_remote_address

from backend.db import get_db
from backend import models, schemas
from backend.security import hash_password, verify_password, create_access_token, SECRET_KEY, ALGORITHM
from backend.services.email import send_verification_email, send_password_reset_email

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://vorzaiq.com")

router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
BOOTSTRAP_TOKEN = os.getenv("BOOTSTRAP_TOKEN", "").strip()

limiter = Limiter(key_func=get_remote_address)


@router.post("/register", response_model=schemas.Token)
@limiter.limit("10/minute")
def register_candidate(request: Request, payload: schemas.CandidateRegister, db: Session = Depends(get_db)):
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
    access_token = create_access_token(subject=str(user.id))
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/register-employer", response_model=schemas.UserOut)
@limiter.limit("10/minute")
def register_employer(request: Request, payload: schemas.EmployerRegister, db: Session = Depends(get_db)):
    email = payload.email.lower()
    exists = db.query(models.User).filter(models.User.email == email).first()
    if exists:
        raise HTTPException(status_code=400, detail="Email already registered")

    verify_token = secrets.token_urlsafe(32)
    user = models.User(
        email=email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role="employer",
        plan="gratis",
        trial_ends_at=datetime.now(timezone.utc) + timedelta(days=30),
        email_verified=False,
        email_verify_token=verify_token,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    verify_url = f"{FRONTEND_URL}/verify-email?token={verify_token}"
    send_verification_email(user.email, user.full_name, verify_url)

    return user


@router.get("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email_verify_token == token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Ongeldige of verlopen verificatielink")
    user.email_verified = True
    user.email_verify_token = None
    db.commit()
    return {"ok": True, "email": user.email}


@router.post("/resend-verification")
def resend_verification(email_body: schemas.ResendVerification, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == email_body.email.lower()).first()
    if not user or user.role != "employer" or user.email_verified:
        # Geen info weggeven of account bestaat
        return {"ok": True}
    new_token = secrets.token_urlsafe(32)
    user.email_verify_token = new_token
    db.commit()
    verify_url = f"{FRONTEND_URL}/verify-email?token={new_token}"
    send_verification_email(user.email, user.full_name, verify_url)
    return {"ok": True}


@router.post("/login", response_model=schemas.Token)
@limiter.limit("5/minute")
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # OAuth2PasswordRequestForm uses "username" field (we treat it as email)
    email = (form_data.username or "").lower().strip()
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.role == "employer" and not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="EMAIL_NOT_VERIFIED",
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


@router.delete("/me", status_code=204)
def delete_account(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verwijder eigen account en alle bijbehorende data (GDPR)."""
    db.delete(current_user)
    db.commit()


def require_role(user: models.User, role: str):
    if user.role != role and user.role != "admin":
        raise HTTPException(status_code=403, detail=f"{role.capitalize()} role required")


class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str = Field(min_length=8)


@router.patch("/password", status_code=200)
def change_password(
    payload: PasswordChangeRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Wijzig je eigen wachtwoord (vereist huidig wachtwoord)."""
    if not verify_password(payload.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Huidig wachtwoord onjuist")
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="Nieuw wachtwoord moet minimaal 8 tekens zijn")
    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"ok": True}


@router.post("/forgot-password")
@limiter.limit("5/minute")
def forgot_password(request: Request, payload: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Stuur een wachtwoord-reset link. Geeft altijd ok=True terug (geen info over of e-mail bestaat)."""
    user = db.query(models.User).filter(models.User.email == payload.email.lower()).first()
    if user:
        reset_token = secrets.token_urlsafe(32)
        user.password_reset_token = reset_token
        user.password_reset_expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        db.commit()
        reset_url = f"{FRONTEND_URL}/reset-password?token={reset_token}"
        send_password_reset_email(user.email, user.full_name, reset_url)
    return {"ok": True}


@router.patch("/profile", response_model=schemas.UserOut)
def update_profile(
    payload: schemas.EmployerProfileUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Bijwerk je profielnaam."""
    if payload.full_name is not None:
        current_user.full_name = payload.full_name.strip()
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/reset-password")
def reset_password(payload: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    """Stel een nieuw wachtwoord in via een reset-token."""
    user = db.query(models.User).filter(models.User.password_reset_token == payload.token).first()
    if not user or not user.password_reset_expires_at:
        raise HTTPException(status_code=400, detail="Ongeldige of verlopen reset-link")
    if datetime.now(timezone.utc) > user.password_reset_expires_at:
        raise HTTPException(status_code=400, detail="Reset-link is verlopen. Vraag een nieuwe aan.")
    user.hashed_password = hash_password(payload.new_password)
    user.password_reset_token = None
    user.password_reset_expires_at = None
    db.commit()
    return {"ok": True}









