# backend/main.py
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Generator, Optional, List

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field

from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    text,
)
from sqlalchemy.orm import sessionmaker, declarative_base, Session, relationship

from passlib.context import CryptContext
from jose import jwt, JWTError

from PyPDF2 import PdfReader


# ----------------------------
# Settings
# ----------------------------
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set. Add it in Render Environment.")

# Render sometimes provides postgres:// which SQLAlchemy may not accept.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-now").strip()
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256").strip()
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "43200"))  # 30 days default

BOOTSTRAP_TOKEN = os.getenv("BOOTSTRAP_TOKEN", "Peanuts-Setup-2025!").strip()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ----------------------------
# Database
# ----------------------------
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ----------------------------
# Models
# ----------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="candidate")  # candidate | employer | admin
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    vacancies = relationship("Vacancy", back_populates="employer", cascade="all, delete-orphan")
    cvs = relationship("CandidateCV", back_populates="candidate", cascade="all, delete-orphan")


class Vacancy(Base):
    __tablename__ = "vacancies"

    id = Column(Integer, primary_key=True, index=True)
    employer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    title = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    hours_per_week = Column(String(50), nullable=True)
    salary_range = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)

    # Optional metadata fields
    source_type = Column(String(50), nullable=True)
    source_filename = Column(String(255), nullable=True)
    source_storage_key = Column(String(255), nullable=True)
    source_content_type = Column(String(100), nullable=True)
    extracted_text = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    employer = relationship("User", back_populates="vacancies")


class CandidateCV(Base):
    __tablename__ = "candidate_cvs"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # DIT zijn precies de kolommen waar jouw DB nu op stuk loopt als ze missen:
    source_filename = Column(String(255), nullable=True)
    source_content_type = Column(String(100), nullable=True)

    extracted_text = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    candidate = relationship("User", back_populates="cvs")


# ----------------------------
# Auto “schema fix” (makkelijkste weg)
# ----------------------------
def ensure_db_schema() -> None:
    """
    Maakt tabellen aan + voegt missende kolommen toe (zonder psql, zonder Render Shell).
    Dit fixt jouw error:
    column candidate_cvs.source_filename does not exist
    """
    Base.metadata.create_all(bind=engine)

    with engine.begin() as conn:
        # Zorg dat candidate_cvs bestaat (als create_all om wat voor reden niet ran)
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS candidate_cvs (
                    id SERIAL PRIMARY KEY,
                    candidate_id INTEGER NOT NULL,
                    source_filename VARCHAR(255),
                    source_content_type VARCHAR(100),
                    extracted_text TEXT,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
                """
            )
        )

        # Voeg missende kolommen toe (dit is jouw concrete probleem)
        conn.execute(text("ALTER TABLE candidate_cvs ADD COLUMN IF NOT EXISTS source_filename VARCHAR(255);"))
        conn.execute(text("ALTER TABLE candidate_cvs ADD COLUMN IF NOT EXISTS source_content_type VARCHAR(100);"))

        # (optioneel) als je later meer velden toevoegt, zet je ze hier ook neer.


# ----------------------------
# Schemas
# ----------------------------
class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    role: str

    class Config:
        from_attributes = True


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CandidateRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: Optional[str] = None


class EmployerRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: Optional[str] = None
    bootstrap_token: str


class VacancyCreate(BaseModel):
    title: str
    location: Optional[str] = None
    hours_per_week: Optional[str] = None
    salary_range: Optional[str] = None
    description: Optional[str] = None


class VacancyOut(BaseModel):
    id: int
    employer_id: int
    title: str
    location: Optional[str] = None
    hours_per_week: Optional[str] = None
    salary_range: Optional[str] = None
    description: Optional[str] = None

    source_type: Optional[str] = None
    source_filename: Optional[str] = None
    source_storage_key: Optional[str] = None
    source_content_type: Optional[str] = None
    extracted_text: Optional[str] = None

    class Config:
        from_attributes = True


# ----------------------------
# Security helpers
# ----------------------------
def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(*, sub: str, expires_minutes: int = ACCESS_TOKEN_EXPIRE_MINUTES) -> str:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=expires_minutes)
    payload = {"sub": sub, "iat": int(now.timestamp()), "exp": int(exp.timestamp())}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
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

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise credentials_exception
    return user


def require_employer(user: User) -> None:
    if user.role != "employer":
        raise HTTPException(status_code=403, detail="Employer role required")


def require_candidate(user: User) -> None:
    if user.role != "candidate":
        raise HTTPException(status_code=403, detail="Candidate role required")


# ----------------------------
# App
# ----------------------------
app = FastAPI(title="It's Peanuts AI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    # Dit is de “makkelijke weg”: schema fixen zonder psql.
    ensure_db_schema()


# ----------------------------
# Auth routes
# ----------------------------
@app.post("/auth/register", response_model=UserOut, tags=["auth"])
def register_candidate(payload: CandidateRegister, db: Session = Depends(get_db)) -> User:
    exists = db.query(User).filter(User.email == payload.email.lower()).first()
    if exists:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role="candidate",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.post("/auth/register-employer", response_model=UserOut, tags=["auth"])
def register_employer(payload: EmployerRegister, db: Session = Depends(get_db)) -> User:
    if payload.bootstrap_token != BOOTSTRAP_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid bootstrap token")

    exists = db.query(User).filter(User.email == payload.email.lower()).first()
    if exists:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role="employer",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# Belangrijk: jouw Swagger gebruikt OAuth2PasswordRequestForm (x-www-form-urlencoded)
@app.post("/auth/login", response_model=TokenOut, tags=["auth"])
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)) -> TokenOut:
    user = db.query(User).filter(User.email == form_data.username.lower()).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(sub=str(user.id))
    return TokenOut(access_token=token)


@app.get("/auth/me", response_model=UserOut, tags=["auth"])
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


# ----------------------------
# Employer vacancies routes
# ----------------------------
@app.get("/employer/vacancies", response_model=List[VacancyOut], tags=["employer-vacancies"])
def list_vacancies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[Vacancy]:
    require_employer(current_user)
    return (
        db.query(Vacancy)
        .filter(Vacancy.employer_id == current_user.id)
        .order_by(Vacancy.id.desc())
        .all()
    )


@app.post("/employer/vacancies", response_model=VacancyOut, tags=["employer-vacancies"])
def create_vacancy(
    payload: VacancyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Vacancy:
    require_employer(current_user)

    vacancy = Vacancy(
        employer_id=current_user.id,
        title=payload.title,
        location=payload.location,
        hours_per_week=payload.hours_per_week,
        salary_range=payload.salary_range,
        description=payload.description,
    )
    db.add(vacancy)
    db.commit()
    db.refresh(vacancy)
    return vacancy


# ----------------------------
# Candidate CV upload + analyze
# ----------------------------
@app.post("/candidate/cv", tags=["candidate-cv"])
def upload_cv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_candidate(current_user)

    filename = (file.filename or "").lower()
    content_type = (file.content_type or "").lower()

    if not (filename.endswith(".pdf") or filename.endswith(".docx")):
        raise HTTPException(status_code=400, detail="Unsupported file type. Upload a .pdf or .docx")

    if "pdf" not in content_type and "officedocument" not in content_type and "word" not in content_type:
        # Niet te streng, maar wel basis-check
        pass

    raw = file.file.read()

    extracted_text = ""
    if filename.endswith(".pdf") or "pdf" in content_type:
        reader = PdfReader(io_bytes := __import__("io").BytesIO(raw))
        parts = []
        for page in reader.pages:
            parts.append(page.extract_text() or "")
        extracted_text = "\n".join(parts).strip()
    else:
        # DOCX parsing kan later; nu geven we nette error zodat jij weet wat er mist
        raise HTTPException(status_code=400, detail="DOCX upload supported later; use PDF for now")

    cv = CandidateCV(
        candidate_id=current_user.id,
        source_filename=file.filename,
        source_content_type=file.content_type,
        extracted_text=extracted_text,
    )
    db.add(cv)
    db.commit()
    db.refresh(cv)

    # Return text (zoals jij eerder zag)
    return extracted_text


@app.post("/candidate/analyze/{vacancy_id}", tags=["candidate-cv"])
def analyze_candidate_vs_vacancy(
    vacancy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_candidate(current_user)

    vacancy = db.query(Vacancy).filter(Vacancy.id == vacancy_id).first()
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found")

    cv = (
        db.query(CandidateCV)
        .filter(CandidateCV.candidate_id == current_user.id)
        .order_by(CandidateCV.id.desc())
        .first()
    )
    if not cv or not (cv.extracted_text or "").strip():
        raise HTTPException(status_code=400, detail="No CV found for this candidate. Upload /candidate/cv first.")

    # MVP analyse (simpel, zonder OpenAI afhankelijkheid)
    cv_text = (cv.extracted_text or "").lower()
    vac_text = " ".join(
        [
            vacancy.title or "",
            vacancy.location or "",
            vacancy.hours_per_week or "",
            vacancy.salary_range or "",
            vacancy.description or "",
        ]
    ).lower()

    # domme overlap-score (goed genoeg als MVP om endpoint te testen)
    cv_words = set([w for w in cv_text.replace("\n", " ").split(" ") if len(w) > 4])
    vac_words = set([w for w in vac_text.replace("\n", " ").split(" ") if len(w) > 4])

    if not vac_words:
        score = 0
    else:
        score = int(100 * (len(cv_words.intersection(vac_words)) / max(1, len(vac_words))))

    return {
        "vacancy_id": vacancy_id,
        "candidate_id": current_user.id,
        "match_score": score,
        "notes": "MVP overlap-score. Later vervangen door echte AI-analyse.",
    }













