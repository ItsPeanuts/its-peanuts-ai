from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.services.auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Let op:
# - We gebruiken hier bewust geen models.Candidate type hints,
#   omdat FastAPI die bij opstarten evalueert en jouw project crasht
#   omdat Candidate niet bestaat in backend.models.


@router.post("/login")
def login(
    email: str,
    password: str,
    db: Session = Depends(get_db),
) -> dict:
    """
    Minimale login endpoint.
    Pas dit later aan naar jouw echte Candidate/User tabel.
    """
    # Voor nu: placeholder; als je al een user/candidate query hebt, zet die hier terug.
    # Zolang je project nog in opbouw is, laten we dit endpoint bewust simpel.
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Login is not wired to a database model yet.",
    )


@router.get("/me")
def me(
    token: str = Depends(oauth2_scheme),
) -> dict:
    """
    Geeft token-info terug. Dit voorkomt crash op opstart.
    Zodra Candidate/User model bestaat, koppelen we dit aan de database.
    """
    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    # payload kan bv. {"sub": "...", "exp": ...} zijn
    return {"token_payload": payload}


def get_current_user(
    token: str = Depends(oauth2_scheme),
) -> dict:
    """
    Dependency die later Candidate/User uit DB gaat halen.
    Voor nu: alleen token decoding.
    """
    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    return {"token_payload": payload}
