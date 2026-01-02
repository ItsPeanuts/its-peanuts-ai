from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from backend.database import get_db
from backend import models
from backend.schemas import RegisterRequest, TokenOut, CandidateOut
from backend.services.auth import hash_password, verify_password
from backend.services.jwt import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


@router.post("/register", response_model=CandidateOut)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
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
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Swagger OAuth2 popup gebruikt "username" -> wij gebruiken email daarin
    email = form_data.username
    password = form_data.password

    user = db.query(models.Candidate).filter(models.Candidate.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(str(user.id))
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=CandidateOut)
def me(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    # token bevat het JWT; in jouw jwt-service staat "sub" = user_id.
    # We houden het hier simpel: decode in jwt-service of (sneller) voeg een helper toe.
    from backend.services.jwt import decode_access_token

    payload = decode_access_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(models.Candidate).filter(models.Candidate.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user






