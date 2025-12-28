from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.schemas import LoginRequest, TokenResponse, CandidateOut
from backend.models import Candidate
from backend.services.auth import verify_password, create_access_token, decode_token

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.email == payload.email).first()
    if not candidate or not verify_password(payload.password, candidate.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(subject=str(candidate.id))
    return {"access_token": token, "token_type": "bearer"}


def get_current_candidate(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
) -> Candidate:
    try:
        payload = decode_token(token)
        sub = payload.get("sub")
        if not sub:
            raise ValueError("Missing subject")
        candidate_id = int(sub)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return candidate


@router.get("/me", response_model=CandidateOut)
def me(current: Candidate = Depends(get_current_candidate)):
    return current
