# backend/main.py
from __future__ import annotations

import os
import json
import traceback
from datetime import datetime, timedelta, timezone
from typing import Generator, Optional, List, Any, Dict

from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    status,
    UploadFile,
    File,
    Request,
)
from fastapi.responses import JSONResponse
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
    UniqueConstraint,
)
from sqlalchemy.orm import sessionmaker, declarative_base, Session, relationship

from passlib.context import CryptContext
from jose import jwt, JWTError

from PyPDF2 import PdfReader
from docx import Document

from openai import OpenAI


# ----------------------------
# Settings
# ----------------------------
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set. Add it in Render Environment.")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-now").strip()
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256").strip()
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "43200"))  # 30 days

BOOTSTRAP_TOKEN = os.getenv("BOOTSTRAP_TOKEN", "Peanuts-Setup-2025!").strip()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini").strip()

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
    __table_args__ = (UniqueConstraint("email", name="uq_users_email"),)

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="candidate")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    vacancies = relationship("Vacancy", back_populates="employer", cascade="all, delete-orphan")
    cvs = relationship("CandidateCV", back_populates="candidate", cascade="all, delete-orphan")


class Vacancy(Base):
    __tablename__ = "vacancies"

    id = Column(Integer, primary_key=True, index=True)
    employer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

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
    candidate_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    source_filename = Column(String(255), nullable=True)
    source_content_type = Column(String(100), nullable=True)
    extracted_text = Column(Text, nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    candidate = relationship("User", back_populates="cvs")


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


class CandidateRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: Optional[str] = None


class EmployerRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: Optional[str] = None
    bootstrap_token: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class VacancyCreate(BaseModel):
    title: str = Field(min_length=1)
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


class AnalyzeOut(BaseModel):
    match_score: int
    decision: str
    summary: str
    strengths: List[str]
    gaps: List[str]
    recommendations: List[str]


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
    cred_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        if not sub:
            raise cred_exc
        user_id = int(sub)
    except (JWTError, ValueError):
        raise cred_exc

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise cred_exc
    return user


def require_role(user: User, role: str) -> None:
    if user.role != role:
        raise HTTPException(status_code=403, detail=f"{role.capitalize()} role required")


# ----------------------------
# File extract helpers
# ----------------------------
def _extract_pdf_text(file_bytes: bytes) -> str:
    from io import BytesIO

    reader = PdfReader(BytesIO(file_bytes))
    parts: List[str] = []
    for page in reader.pages:
        parts.append(page.extract_text() or "")
    return "\n".join(parts).strip()


def _extract_docx_text(file_bytes: bytes) -> str:
    from io import BytesIO

    doc = Document(BytesIO(file_bytes))
    parts = [p.text for p in doc.paragraphs if p.text]
    return "\n".join(parts).strip()


def extract_text_from_upload(upload: UploadFile, file_bytes: bytes) -> str:
    filename = (upload.filename or "").lower()
    ctype = (upload.content_type or "").lower()

    if filename.endswith(".pdf") or ctype == "application/pdf":
        return _extract_pdf_text(file_bytes)

    if filename.endswith(".docx") or ctype in (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
    ):
        return _extract_docx_text(file_bytes)

    raise HTTPException(status_code=400, detail="Unsupported file type. Upload a .pdf or .docx")


# ----------------------------
# OpenAI helpers (robust parsing)
# ----------------------------
def _openai_client() -> OpenAI:
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not set in Render environment.")
    return OpenAI(api_key=OPENAI_API_KEY)


def _extract_response_text(resp: Any) -> str:
    if hasattr(resp, "output_text") and isinstance(getattr(resp, "output_text"), str):
        return (resp.output_text or "").strip()

    text = ""
    try:
        output = getattr(resp, "output", None) or []
        for item in output:
            content = getattr(item, "content", None) or []
            for part in content:
                if hasattr(part, "text") and isinstance(getattr(part, "text"), str):
                    text += part.text
    except Exception:
        text = ""
    return (text or "").strip()


def _safe_json_loads(s: str) -> Dict[str, Any]:
    s = (s or "").strip()
    if not s:
        return {}
    if s.startswith("```"):
        s = s.strip("`")
        s = s.replace("json\n", "", 1).strip()
    try:
        return json.loads(s)
    except Exception:
        return {}


# ----------------------------
# App + Global error handler
# ----------------------------
app = FastAPI(title="It's Peanuts AI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Zorgt dat je nooit meer een kale 'Internal Server Error' krijgt.
    Je krijgt JSON terug met stacktrace (handig voor 1x debuggen).
    """
    trace = traceback.format_exc()
    # Log naar stdout -> Render logs
    print("UNHANDLED_EXCEPTION:", repr(exc))
    print(trace)

    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal Server Error",
            "error": repr(exc),
            "path": str(request.url),
            "trace": trace.splitlines()[-80:],  # laatste 80 regels
        },
    )


# ----------------------------
# Auth routes
# ----------------------------
@app.post("/auth/register", response_model=UserOut, tags=["auth"])
def register_candidate(payload: CandidateRegister, db: Session = Depends(get_db)) -> User:
    email = payload.email.lower().strip()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=email,
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

    email = payload.email.lower().strip()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=email,
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
    email = (form_data.username or "").lower().strip()
    user = db.query(User).filter(User.email == email).first()
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
    require_role(current_user, "employer")
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
    require_role(current_user, "employer")
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
@app.post("/candidate/cv", tags=["candidate-cv"], response_model=str)
async def upload_cv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> str:
    require_role(current_user, "candidate")

    file_bytes = await file.read()
    text = extract_text_from_upload(file, file_bytes)
    if not text:
        raise HTTPException(status_code=400, detail="No text extracted from file")

    row = CandidateCV(
        candidate_id=current_user.id,
        source_filename=file.filename,
        source_content_type=file.content_type,
        extracted_text=text,
    )
    db.add(row)
    db.commit()
    return text


# ----------------------------
# Candidate analyze routes
# ----------------------------
@app.post("/candidate/analyze/{vacancy_id}", tags=["candidate-analysis"], response_model=AnalyzeOut)
def analyze_cv_vs_vacancy(
    vacancy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AnalyzeOut:
    require_role(current_user, "candidate")

    # Debug log to Render
    print(f"ANALYZE_START user_id={current_user.id} vacancy_id={vacancy_id}")

    cv = (
        db.query(CandidateCV)
        .filter(CandidateCV.candidate_id == current_user.id)
        .order_by(CandidateCV.id.desc())
        .first()
    )
    if not cv:
        raise HTTPException(status_code=400, detail="No CV uploaded yet. Upload via /candidate/cv first.")

    vacancy = db.query(Vacancy).filter(Vacancy.id == vacancy_id).first()
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found")

    vacancy_text = "\n".join(
        [x for x in [vacancy.title, vacancy.location, vacancy.hours_per_week, vacancy.salary_range, vacancy.description] if x]
    ).strip()

    system = (
        "You are an expert recruiter. Compare a candidate CV to a job vacancy and return STRICT JSON only.\n"
        "Schema:\n"
        "{\n"
        '  "match_score": 0-100,\n'
        '  "decision": "strong_match"|"match"|"weak_match"|"no_match",\n'
        '  "summary": "string",\n'
        '  "strengths": ["string", ...],\n'
        '  "gaps": ["string", ...],\n'
        '  "recommendations": ["string", ...]\n'
        "}\n"
        "Rules: JSON only. No markdown."
    )

    user_prompt = f"VACANCY:\n{vacancy_text}\n\nCANDIDATE CV:\n{cv.extracted_text}\n"

    client = _openai_client()

    resp = client.responses.create(
        model=OPENAI_MODEL,
        input=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_prompt},
        ],
    )
    raw = _extract_response_text(resp)
    print("ANALYZE_OPENAI_RAW_FIRST_500:", raw[:500])

    data = _safe_json_loads(raw)
    if not data:
        raise HTTPException(status_code=502, detail=f"Model did not return valid JSON. Output (first 500): {raw[:500]}")

    match_score = int(data.get("match_score", 0))
    decision = str(data.get("decision", "no_match"))
    summary = str(data.get("summary", "")).strip()

    strengths = data.get("strengths", []) or []
    gaps = data.get("gaps", []) or []
    recs = data.get("recommendations", []) or []

    if not isinstance(strengths, list):
        strengths = [str(strengths)]
    if not isinstance(gaps, list):
        gaps = [str(gaps)]
    if not isinstance(recs, list):
        recs = [str(recs)]

    match_score = max(0, min(100, match_score))

    return AnalyzeOut(
        match_score=match_score,
        decision=decision,
        summary=summary,
        strengths=[str(x) for x in strengths][:10],
        gaps=[str(x) for x in gaps][:10],
        recommendations=[str(x) for x in recs][:10],
    )













