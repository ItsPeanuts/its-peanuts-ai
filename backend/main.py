# backend/main.py
import os
import io
import json
import time
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr

from jose import jwt, JWTError
from passlib.context import CryptContext

from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    text as sql_text,
)
from sqlalchemy.orm import sessionmaker, declarative_base, relationship, Session
from sqlalchemy.exc import SQLAlchemyError
import PyPDF2

# ----------------------------
# Config
# ----------------------------
APP_NAME = "its-peanuts-ai"
JWT_ALG = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
BOOTSTRAP_TOKEN_ENV = os.getenv("BOOTSTRAP_TOKEN", "Peanuts-Setup-2025!")

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
if not DATABASE_URL:
    # Render sometimes sets DATABASE_URL; if missing, app should still start
    DATABASE_URL = "sqlite:///./dev.db"

# psycopg2 sometimes needs sslmode=require on Render Postgres
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
elif DATABASE_URL.startswith("postgresql://") and "psycopg2" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

if DATABASE_URL.startswith("postgresql+psycopg2://") and "sslmode=" not in DATABASE_URL:
    # safe default for Render managed Postgres
    sep = "&" if "?" in DATABASE_URL else "?"
    DATABASE_URL = f"{DATABASE_URL}{sep}sslmode=require"

SECRET_KEY = os.getenv("JWT_SECRET", "") or os.getenv("SECRET_KEY", "")
if not SECRET_KEY:
    # deterministic secret is dangerous in prod; but better than crash.
    # Set JWT_SECRET in Render dashboard for production.
    SECRET_KEY = f"dev-{secrets.token_urlsafe(32)}"

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

Base = declarative_base()

# ----------------------------
# DB setup
# ----------------------------
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=int(os.getenv("DB_POOL_SIZE", "5")),
    max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "5")),
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

BOOTSTRAP_ERROR: Optional[str] = None


def db_now() -> datetime:
    return datetime.now(timezone.utc)


# ----------------------------
# Models
# ----------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=True)
    password_hash = Column(String(255), nullable=False)  # IMPORTANT: this must exist
    role = Column(String(50), nullable=False, index=True)  # "candidate" | "employer"
    plan = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=db_now)

    vacancies = relationship("Vacancy", back_populates="employer", cascade="all, delete-orphan")


class Vacancy(Base):
    __tablename__ = "vacancies"

    id = Column(Integer, primary_key=True)
    employer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    title = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    hours_per_week = Column(String(50), nullable=True)
    salary_range = Column(String(255), nullable=True)

    description = Column(Text, nullable=True)

    # optional “source” fields (your earlier code expected these sometimes)
    source_type = Column(String(50), nullable=True)
    source_filename = Column(String(255), nullable=True)
    source_storage_key = Column(String(255), nullable=True)
    source_content_type = Column(String(100), nullable=True)
    extracted_text = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, default=db_now)

    employer = relationship("User", back_populates="vacancies")
    applications = relationship("Application", back_populates="vacancy", cascade="all, delete-orphan")


class CandidateCV(Base):
    __tablename__ = "candidate_cvs"

    id = Column(Integer, primary_key=True)
    candidate_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    source_filename = Column(String(255), nullable=True)
    source_content_type = Column(String(100), nullable=True)
    extracted_text = Column(Text, nullable=False)

    created_at = Column(DateTime(timezone=True), nullable=False, default=db_now)


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True)
    candidate_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    vacancy_id = Column(Integer, ForeignKey("vacancies.id"), nullable=False, index=True)

    created_at = Column(DateTime(timezone=True), nullable=False, default=db_now)

    vacancy = relationship("Vacancy", back_populates="applications")
    ai_result = relationship("AIResult", back_populates="application", uselist=False, cascade="all, delete-orphan")


class AIResult(Base):
    __tablename__ = "ai_results"

    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False, index=True)

    match_score = Column(Integer, nullable=False, default=0)
    summary = Column(Text, nullable=True)
    strengths = Column(Text, nullable=True)
    gaps = Column(Text, nullable=True)
    suggested_questions = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, default=db_now)

    application = relationship("Application", back_populates="ai_result")


# ----------------------------
# Schemas
# ----------------------------
class RegisterCandidateIn(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class RegisterEmployerIn(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    bootstrap_token: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str]
    role: str
    plan: Optional[str] = None

    class Config:
        from_attributes = True


class VacancyIn(BaseModel):
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


class AnalyzeOut(BaseModel):
    id: int
    application_id: int
    match_score: int
    summary: Optional[str] = None
    strengths: Optional[str] = None
    gaps: Optional[str] = None
    suggested_questions: Optional[str] = None

    class Config:
        from_attributes = True


# ----------------------------
# Auth helpers
# ----------------------------
def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(*, subject: str, expires_delta: Optional[timedelta] = None) -> str:
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALG)


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> User:
    cred_exc = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALG])
        sub = payload.get("sub")
        if not sub:
            raise cred_exc
    except JWTError:
        raise cred_exc
    user = db.query(User).filter(User.email == sub.lower()).first()
    if not user:
        raise cred_exc
    return user


def require_role(role: str):
    def _dep(user: User = Depends(get_current_user)) -> User:
        if user.role != role:
            raise HTTPException(status_code=403, detail=f"{role.capitalize()} role required")
        return user

    return _dep


# ----------------------------
# DB schema self-heal (Optie A)
# ----------------------------
def _exec(db: Session, sql: str) -> None:
    db.execute(sql_text(sql))


def ensure_db_schema() -> None:
    """
    Creates tables if missing + adds critical columns if an older table exists
    with missing columns. This avoids:
      - users.password_hash does not exist
      - candidate_cvs.source_filename does not exist
      - similar migration drift issues
    """
    global BOOTSTRAP_ERROR
    try:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            # USERS
            _exec(db, "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);")
            _exec(db, "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS role VARCHAR(50);")
            _exec(db, "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS plan VARCHAR(50);")
            _exec(db, "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;")

            # VACANCIES
            _exec(db, "ALTER TABLE IF EXISTS vacancies ADD COLUMN IF NOT EXISTS source_type VARCHAR(50);")
            _exec(db, "ALTER TABLE IF EXISTS vacancies ADD COLUMN IF NOT EXISTS source_filename VARCHAR(255);")
            _exec(db, "ALTER TABLE IF EXISTS vacancies ADD COLUMN IF NOT EXISTS source_storage_key VARCHAR(255);")
            _exec(db, "ALTER TABLE IF EXISTS vacancies ADD COLUMN IF NOT EXISTS source_content_type VARCHAR(100);")
            _exec(db, "ALTER TABLE IF EXISTS vacancies ADD COLUMN IF NOT EXISTS extracted_text TEXT;")
            _exec(db, "ALTER TABLE IF EXISTS vacancies ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;")

            # CANDIDATE_CVS
            _exec(db, "ALTER TABLE IF EXISTS candidate_cvs ADD COLUMN IF NOT EXISTS source_filename VARCHAR(255);")
            _exec(db, "ALTER TABLE IF EXISTS candidate_cvs ADD COLUMN IF NOT EXISTS source_content_type VARCHAR(100);")
            _exec(db, "ALTER TABLE IF EXISTS candidate_cvs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;")

            # APPLICATIONS
            _exec(db, "ALTER TABLE IF EXISTS applications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;")

            # AI_RESULTS
            _exec(db, "ALTER TABLE IF EXISTS ai_results ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;")

            # Backfill minimal defaults where needed (non-blocking)
            # Some older rows may have NULLs.
            _exec(db, "UPDATE users SET role='candidate' WHERE role IS NULL;")
            _exec(db, "UPDATE users SET password_hash='' WHERE password_hash IS NULL;")  # only for legacy; login will fail until reset
            _exec(db, "UPDATE users SET created_at=NOW() WHERE created_at IS NULL;")
            _exec(db, "UPDATE vacancies SET created_at=NOW() WHERE created_at IS NULL;")
            _exec(db, "UPDATE candidate_cvs SET created_at=NOW() WHERE created_at IS NULL;")
            _exec(db, "UPDATE applications SET created_at=NOW() WHERE created_at IS NULL;")
            _exec(db, "UPDATE ai_results SET created_at=NOW() WHERE created_at IS NULL;")

            db.commit()
        finally:
            db.close()

        BOOTSTRAP_ERROR = None
    except Exception as e:
        BOOTSTRAP_ERROR = f"{type(e).__name__}: {e}"


# ----------------------------
# AI analysis (OpenAI optional)
# ----------------------------
def naive_match(cv_text: str, vacancy_text: str) -> Dict[str, Any]:
    cv = (cv_text or "").lower()
    vac = (vacancy_text or "").lower()

    keywords = []
    for k in ["sales", "manager", "leiding", "team", "new business", "strategie", "c-level", "klant"]:
        if k in vac:
            keywords.append(k)

    hits = sum(1 for k in keywords if k in cv)
    base = 60
    score = min(95, base + hits * 7)

    strengths = []
    if "new business" in cv or "new business" in vac:
        strengths.append("Sterke focus op new business")
    if "team" in cv or "aansturen" in cv:
        strengths.append("Ervaring met teamleiding en aansturing")
    if "strategie" in cv or "prognoses" in cv:
        strengths.append("Ervaring met strategie en prognoses")
    if not strengths:
        strengths.append("Relevante commerciële ervaring")

    gaps = [
        "Maak je impact concreter met cijfers (omzetgroei, targets, teamgrootte, conversie).",
        "Beschrijf 1–2 voorbeelden van strategie die je hebt ontwikkeld en uitgevoerd.",
    ]

    suggested_questions = [
        "Welke salesstrategie heb je ontwikkeld en wat was het resultaat?",
        "Hoe genereer je structureel new business (kanalen, aanpak, KPI’s)?",
        "Welk team heb je aangestuurd (grootte, samenstelling) en hoe stuur je op performance?",
        "Wat zijn je salarisverwachtingen en waarom?",
    ]

    return {
        "match_score": int(score),
        "summary": "Sterke match op sales leadership en new business; voeg concrete resultaten toe om de fit te versterken.",
        "strengths": ", ".join(strengths),
        "gaps": " ".join(gaps),
        "suggested_questions": " ".join(suggested_questions),
    }


def openai_match(cv_text: str, vacancy_text: str) -> Dict[str, Any]:
    """
    Uses OpenAI only if OPENAI_API_KEY is set. Otherwise fallback.
    Compatible with openai==2.x (installed in your requirements).
    """
    if not OPENAI_API_KEY:
        return naive_match(cv_text, vacancy_text)

    try:
        from openai import OpenAI

        client = OpenAI(api_key=OPENAI_API_KEY)

        prompt = f"""
Je bent een recruitment-assistent. Analyseer CV vs vacature en geef JSON met:
match_score (0-100), summary (1 zin), strengths (komma-gescheiden), gaps (1-3 zinnen), suggested_questions (5 vragen).
CV:
{cv_text}

Vacature:
{vacancy_text}
"""
        resp = client.responses.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
            input=prompt.strip(),
        )
        text_out = (resp.output_text or "").strip()

        # Try parse JSON if model returned it, else fallback
        try:
            data = json.loads(text_out)
            return {
                "match_score": int(data.get("match_score", 0)),
                "summary": data.get("summary"),
                "strengths": data.get("strengths"),
                "gaps": data.get("gaps"),
                "suggested_questions": data.get("suggested_questions"),
            }
        except Exception:
            return naive_match(cv_text, vacancy_text)

    except Exception:
        return naive_match(cv_text, vacancy_text)


# ----------------------------
# PDF extraction
# ----------------------------
def extract_pdf_text(file_bytes: bytes) -> str:
    try:
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        parts = []
        for p in reader.pages:
            t = p.extract_text() or ""
            if t.strip():
                parts.append(t)
        text = "\n".join(parts).strip()
        return text or "(Geen tekst kunnen extraheren uit PDF)"
    except Exception as e:
        return f"(PDF extract error: {e})"


# ----------------------------
# App
# ----------------------------
app = FastAPI(title=APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup():
    ensure_db_schema()


# ----------------------------
# Health / debug
# ----------------------------
@app.get("/health", response_class=None)
def health():
    return "ok"


@app.get("/_bootstrap_error", response_class=None)
def bootstrap_error():
    # This endpoint must exist because you called it.
    # If startup failed to connect/migrate, you’ll see the reason here.
    return BOOTSTRAP_ERROR or "ok"


# ----------------------------
# Auth endpoints
# ----------------------------
@app.post("/auth/register", response_model=UserOut)
def register_candidate(payload: RegisterCandidateIn, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    exists = db.query(User).filter(User.email == email).first()
    if exists:
        return exists  # idempotent for your testing flow

    user = User(
        email=email,
        full_name=payload.full_name,
        password_hash=get_password_hash(payload.password),
        role="candidate",
        plan=None,
        created_at=db_now(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.post("/auth/register-employer", response_model=UserOut)
def register_employer(payload: RegisterEmployerIn, db: Session = Depends(get_db)):
    if payload.bootstrap_token != BOOTSTRAP_TOKEN_ENV:
        raise HTTPException(status_code=403, detail="Invalid bootstrap token")

    email = payload.email.lower().strip()
    exists = db.query(User).filter(User.email == email).first()
    if exists:
        # If someone already exists but not employer, hard-block to keep roles clean
        if exists.role != "employer":
            raise HTTPException(status_code=409, detail="User exists with different role")
        return exists

    user = User(
        email=email,
        full_name=payload.full_name,
        password_hash=get_password_hash(payload.password),
        role="employer",
        plan=None,
        created_at=db_now(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.post("/auth/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    OAuth2PasswordRequestForm uses fields:
      - username
      - password
    Your curl uses x-www-form-urlencoded and passes username=...&password=...
    """
    email = (form.username or "").lower().strip()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # If legacy rows got password_hash='' from self-heal, they cannot login until reset
    if not user.password_hash or user.password_hash.strip() == "":
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(subject=user.email)
    return {"access_token": token, "token_type": "bearer"}


@app.get("/auth/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


# ----------------------------
# Employer: vacancies
# ----------------------------
@app.post("/employer/vacancies", response_model=VacancyOut)
def employer_create_vacancy(
    payload: VacancyIn,
    employer: User = Depends(require_role("employer")),
    db: Session = Depends(get_db),
):
    v = Vacancy(
        employer_id=employer.id,
        title=payload.title,
        location=payload.location,
        hours_per_week=payload.hours_per_week,
        salary_range=payload.salary_range,
        description=payload.description,
        created_at=db_now(),
    )
    db.add(v)
    db.commit()
    db.refresh(v)
    return v


@app.get("/employer/vacancies", response_model=List[VacancyOut])
def employer_list_vacancies(
    employer: User = Depends(require_role("employer")),
    db: Session = Depends(get_db),
):
    return db.query(Vacancy).filter(Vacancy.employer_id == employer.id).order_by(Vacancy.id.desc()).all()


# ----------------------------
# Candidate: vacancies + CV + analysis
# ----------------------------
@app.get("/candidate/vacancies", response_model=List[VacancyOut])
def candidate_list_vacancies(
    candidate: User = Depends(require_role("candidate")),
    db: Session = Depends(get_db),
):
    # Candidates can view all vacancies
    return db.query(Vacancy).order_by(Vacancy.id.desc()).all()


@app.post("/candidate/cv")
def candidate_upload_cv(
    file: UploadFile = File(...),
    candidate: User = Depends(require_role("candidate")),
    db: Session = Depends(get_db),
):
    if not file:
        raise HTTPException(status_code=400, detail="file required")

    raw = file.file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")

    extracted = extract_pdf_text(raw)

    cv = CandidateCV(
        candidate_id=candidate.id,
        source_filename=file.filename,
        source_content_type=file.content_type,
        extracted_text=extracted,
        created_at=db_now(),
    )
    db.add(cv)
    db.commit()
    # Return extracted text (your earlier curl output showed plain string)
    return extracted


@app.post("/candidate/analyze/{vacancy_id}", response_model=AnalyzeOut)
def candidate_analyze(
    vacancy_id: int,
    candidate: User = Depends(require_role("candidate")),
    db: Session = Depends(get_db),
):
    vacancy = db.query(Vacancy).filter(Vacancy.id == vacancy_id).first()
    if not vacancy:
        raise HTTPException(status_code=404, detail="Not Found")

    latest_cv = (
        db.query(CandidateCV)
        .filter(CandidateCV.candidate_id == candidate.id)
        .order_by(CandidateCV.id.desc())
        .first()
    )
    if not latest_cv:
        raise HTTPException(status_code=400, detail="No CV uploaded")

    vacancy_text = vacancy.extracted_text or vacancy.description or ""
    cv_text = latest_cv.extracted_text or ""

    analysis = openai_match(cv_text=cv_text, vacancy_text=vacancy_text)

    # Create application + ai_result
    app_row = Application(candidate_id=candidate.id, vacancy_id=vacancy.id, created_at=db_now())
    db.add(app_row)
    db.flush()  # get id without commit

    ai_row = AIResult(
        application_id=app_row.id,
        match_score=int(analysis.get("match_score") or 0),
        summary=analysis.get("summary"),
        strengths=analysis.get("strengths"),
        gaps=analysis.get("gaps"),
        suggested_questions=analysis.get("suggested_questions"),
        created_at=db_now(),
    )
    db.add(ai_row)
    db.commit()
    db.refresh(ai_row)

    return AnalyzeOut(
        id=ai_row.id,
        application_id=ai_row.application_id,
        match_score=ai_row.match_score,
        summary=ai_row.summary,
        strengths=ai_row.strengths,
        gaps=ai_row.gaps,
        suggested_questions=ai_row.suggested_questions,
    )












