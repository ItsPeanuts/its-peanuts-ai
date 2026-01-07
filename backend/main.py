# backend/main.py
from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone
from typing import Generator, Optional, List, Any, Dict

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field, ConfigDict

from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
)
from sqlalchemy.orm import sessionmaker, declarative_base, Session, relationship

from passlib.context import CryptContext
from jose import jwt, JWTError

from PyPDF2 import PdfReader
from docx import Document

# OpenAI SDK (openai==2.x)
from openai import OpenAI


# ----------------------------
# Settings
# ----------------------------
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set (Render Postgres env var missing).")

# Render sometimes provides postgres:// which SQLAlchemy may not accept
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-now").strip()
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256").strip()
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "43200"))  # 30 days

BOOTSTRAP_TOKEN = os.getenv("BOOTSTRAP_TOKEN", "Peanuts-Setup-2025!").strip()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()

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
    analyses = relationship("CvVacancyAnalysis", back_populates="candidate", cascade="all, delete-orphan")


class Vacancy(Base):
    __tablename__ = "vacancies"

    id = Column(Integer, primary_key=True, index=True)
    employer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    title = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    hours_per_week = Column(String(50), nullable=True)
    salary_range = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)

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

    filename = Column(String(255), nullable=False)
    content_type = Column(String(100), nullable=False)
    extracted_text = Column(Text, nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    candidate = relationship("User", back_populates="cvs")


class CvVacancyAnalysis(Base):
    __tablename__ = "cv_vacancy_analyses"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    vacancy_id = Column(Integer, ForeignKey("vacancies.id"), nullable=False, index=True)

    model = Column(String(100), nullable=True)
    match_score = Column(Integer, nullable=False, default=0)  # 0..100

    summary = Column(Text, nullable=True)
    strengths = Column(Text, nullable=True)  # JSON string list
    gaps = Column(Text, nullable=True)       # JSON string list
    recommendations = Column(Text, nullable=True)  # JSON string list
    decision = Column(String(50), nullable=True)   # strong_yes / yes / maybe / no

    raw_json = Column(Text, nullable=True)  # full JSON response for debugging
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    candidate = relationship("User", back_populates="analyses")
    vacancy = relationship("Vacancy")


Base.metadata.create_all(bind=engine)


# ----------------------------
# Schemas
# ----------------------------
class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    role: str


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
    model_config = ConfigDict(from_attributes=True)

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


class CVUploadOut(BaseModel):
    cv_id: int
    filename: str
    extracted_text: str


class AnalysisOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    candidate_id: int
    vacancy_id: int
    model: Optional[str] = None
    match_score: int
    decision: Optional[str] = None
    summary: Optional[str] = None
    strengths: List[str] = []
    gaps: List[str] = []
    recommendations: List[str] = []
    created_at: datetime


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
# File extraction
# ----------------------------
def _extract_pdf_bytes(data: bytes) -> str:
    try:
        reader = PdfReader(io_bytes := __import__("io").BytesIO(data))
        parts = []
        for page in reader.pages:
            parts.append(page.extract_text() or "")
        return "\n".join(parts).strip()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read PDF: {e}")


def _extract_docx_bytes(data: bytes) -> str:
    try:
        doc = Document(__import__("io").BytesIO(data))
        parts = [p.text for p in doc.paragraphs if p.text]
        return "\n".join(parts).strip()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read DOCX: {e}")


def extract_text_from_upload(file: UploadFile, content: bytes) -> str:
    name = (file.filename or "").lower()
    ctype = (file.content_type or "").lower()

    is_pdf = name.endswith(".pdf") or ctype == "application/pdf"
    is_docx = name.endswith(".docx") or ctype in (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
    )

    if not (is_pdf or is_docx):
        raise HTTPException(status_code=400, detail="Unsupported file type. Upload a .pdf or .docx")

    text = _extract_pdf_bytes(content) if is_pdf else _extract_docx_bytes(content)

    if not text:
        raise HTTPException(status_code=400, detail="No text could be extracted from the uploaded document.")
    return text


# ----------------------------
# OpenAI analysis
# ----------------------------
def _openai_client() -> OpenAI:
    if not OPENAI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY is not set in environment (Render).",
        )
    return OpenAI(api_key=OPENAI_API_KEY)


def _safe_list(value: Any) -> List[str]:
    if isinstance(value, list):
        return [str(x).strip() for x in value if str(x).strip()]
    return []


def analyze_cv_vs_vacancy(*, cv_text: str, vacancy: Vacancy) -> Dict[str, Any]:
    """
    Returns dict with:
      match_score (0..100), decision, summary, strengths[], gaps[], recommendations[]
    """
    client = _openai_client()

    vacancy_text = f"""
Titel: {vacancy.title or ""}
Locatie: {vacancy.location or ""}
Uren p/w: {vacancy.hours_per_week or ""}
Salaris: {vacancy.salary_range or ""}
Omschrijving:
{vacancy.description or ""}
""".strip()

    system = (
        "Je bent een senior recruiter en hiring manager. "
        "Je beoordeelt objectief de match tussen een CV en een vacature. "
        "Geef een strakke, bruikbare analyse in JSON."
    )

    user = f"""
Analyseer de match tussen:

[Vacature]
{vacancy_text}

[CV]
{cv_text}

Geef ALLEEN JSON (geen tekst eromheen) met exact deze velden:
- match_score: integer 0-100
- decision: one of ["strong_yes","yes","maybe","no"]
- summary: string (max 6 zinnen)
- strengths: array of strings (max 8)
- gaps: array of strings (max 8)
- recommendations: array of strings (max 8) met concrete verbeteracties

Wees streng: score 80+ alleen bij duidelijke match.
""".strip()

    try:
        resp = client.responses.create(
            model=OPENAI_MODEL,
            input=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        # openai Responses API: we pakken de tekst-output
        text = resp.output_text.strip()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OpenAI call failed: {e}")

    try:
        data = json.loads(text)
    except Exception:
        # Als het geen JSON was, bewaren we het als raw en geven we een duidelijke fout
        raise HTTPException(
            status_code=502,
            detail="OpenAI did not return valid JSON. Check OPENAI_MODEL or prompt behavior.",
        )

    # Normalisatie
    score = int(data.get("match_score", 0) or 0)
    if score < 0:
        score = 0
    if score > 100:
        score = 100

    decision = str(data.get("decision") or "").strip() or None
    summary = str(data.get("summary") or "").strip() or None

    strengths = _safe_list(data.get("strengths"))
    gaps = _safe_list(data.get("gaps"))
    recommendations = _safe_list(data.get("recommendations"))

    return {
        "match_score": score,
        "decision": decision,
        "summary": summary,
        "strengths": strengths,
        "gaps": gaps,
        "recommendations": recommendations,
        "raw_json": data,
    }


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


@app.post("/auth/login", response_model=TokenOut, tags=["auth"])
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)) -> TokenOut:
    # OAuth2PasswordRequestForm gebruikt "username" veld (ook als het email is)
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
# Candidate CV routes
# ----------------------------
@app.post("/candidate/cv", response_model=CVUploadOut, tags=["candidate-cv"])
async def upload_cv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CVUploadOut:
    require_candidate(current_user)

    content = await file.read()
    text = extract_text_from_upload(file, content)

    row = CandidateCV(
        candidate_id=current_user.id,
        filename=file.filename or "uploaded",
        content_type=file.content_type or "application/octet-stream",
        extracted_text=text,
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    return CVUploadOut(cv_id=row.id, filename=row.filename, extracted_text=row.extracted_text)


# ----------------------------
# AI Analyse routes (CV ↔ Vacancy)
# ----------------------------
@app.post("/candidate/analyze/{vacancy_id}", response_model=AnalysisOut, tags=["candidate-analysis"])
def analyze_my_cv_for_vacancy(
    vacancy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AnalysisOut:
    require_candidate(current_user)

    # Pak laatste CV
    cv = (
        db.query(CandidateCV)
        .filter(CandidateCV.candidate_id == current_user.id)
        .order_by(CandidateCV.id.desc())
        .first()
    )
    if not cv:
        raise HTTPException(status_code=400, detail="No CV found. Upload your CV first via /candidate/cv.")

    vacancy = db.query(Vacancy).filter(Vacancy.id == vacancy_id).first()
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found.")

    result = analyze_cv_vs_vacancy(cv_text=cv.extracted_text, vacancy=vacancy)

    analysis = CvVacancyAnalysis(
        candidate_id=current_user.id,
        vacancy_id=vacancy_id,
        model=OPENAI_MODEL,
        match_score=result["match_score"],
        decision=result["decision"],
        summary=result["summary"],
        strengths=json.dumps(result["strengths"], ensure_ascii=False),
        gaps=json.dumps(result["gaps"], ensure_ascii=False),
        recommendations=json.dumps(result["recommendations"], ensure_ascii=False),
        raw_json=json.dumps(result["raw_json"], ensure_ascii=False),
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    return AnalysisOut(
        id=analysis.id,
        candidate_id=analysis.candidate_id,
        vacancy_id=analysis.vacancy_id,
        model=analysis.model,
        match_score=analysis.match_score,
        decision=analysis.decision,
        summary=analysis.summary,
        strengths=json.loads(analysis.strengths or "[]"),
        gaps=json.loads(analysis.gaps or "[]"),
        recommendations=json.loads(analysis.recommendations or "[]"),
        created_at=analysis.created_at,
    )


@app.get("/candidate/analyses", response_model=List[AnalysisOut], tags=["candidate-analysis"])
def list_my_analyses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[AnalysisOut]:
    require_candidate(current_user)

    rows = (
        db.query(CvVacancyAnalysis)
        .filter(CvVacancyAnalysis.candidate_id == current_user.id)
        .order_by(CvVacancyAnalysis.id.desc())
        .all()
    )

    out: List[AnalysisOut] = []
    for r in rows:
        out.append(
            AnalysisOut(
                id=r.id,
                candidate_id=r.candidate_id,
                vacancy_id=r.vacancy_id,
                model=r.model,
                match_score=r.match_score,
                decision=r.decision,
                summary=r.summary,
                strengths=json.loads(r.strengths or "[]"),
                gaps=json.loads(r.gaps or "[]"),
                recommendations=json.loads(r.recommendations or "[]"),
                created_at=r.created_at,
            )
        )
    return out












