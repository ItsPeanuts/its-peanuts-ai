# backend/services/user_context.py
from __future__ import annotations

import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from backend.database import get_db
from backend import models

bearer = HTTPBearer(auto_error=True)


def _jwt_secret() -> str:
    # Gebruik dezelfde secret als jouw jwt.py gebruikt.
    # Als je al JWT_SECRET in env hebt: top.
    secret = os.getenv("JWT_SECRET") or os.getenv("SECRET_KEY") or ""
    if not secret:
        # fallback zodat het niet “stil” stuk gaat
        raise RuntimeError("JWT_SECRET (or SECRET_KEY) is missing in environment variables")
    return secret


def _jwt_algo() -> str:
    return os.getenv("JWT_ALGORITHM", "HS256")


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> models.Candidate:
    token = creds.credentials
    try:
        payload = jwt.decode(token, _jwt_secret(), algorithms=[_jwt_algo()])
        sub = payload.get("sub")
        if not sub:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        user_id = int(sub)
    except (JWTError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = db.query(models.Candidate).filter(models.Candidate.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_employer(user: models.Candidate = Depends(get_current_user)) -> models.Candidate:
    if getattr(user, "role", "") != "employer":
        raise HTTPException(status_code=403, detail="Employer role required")
    return user
