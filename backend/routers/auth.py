from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.db import get_db
from backend import models
from backend.schemas import RegisterRequest, LoginRequest, TokenResponse, CandidateMe
from backend.services.auth import hash_password, verify_password, create_access_token, decode_token
from fastapi.security import OAuth2PasswordBearer

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_candidate(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> models.Candidate:
    try:
        payload = decode_token(token)
        sub = payload.get("sub")
        if not sub:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    candidate = db.query(models.Candidate).filter(models.Candidate.email == sub).first()
    if not candidate:
        raise HTTPException(status_code=401, detail="User not found")
    return candidate

@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(models.Candidate).filter(models.Candidate.email == req.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Account bestaat al")

    c = models.Candidate(
        email=req.email,
        full_name=req.full_name,
        password_hash=hash_password(req.password),
    )
    db.add(c)
    db.commit()

    token = create_access_token(sub=req.email)
    return TokenResponse(access_token=token)

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    c = db.query(models.Candidate).filter(models.Candidate.email == req.email).first()
    if not c or not verify_password(req.password, c.password_hash):
        raise HTTPException(status_code=401, detail="Onjuiste inloggegevens")

    token = create_access_token(sub=req.email)
    return TokenResponse(access_token=token)

@router.get("/me", response_model=CandidateMe)
def me(current: models.Candidate = Depends(get_current_candidate)):
    return CandidateMe(
        id=current.id,
        email=current.email,
        full_name=current.full_name,
        cv_text=current.cv_text,
        cv_updated_at=current.cv_updated_at,
    )
