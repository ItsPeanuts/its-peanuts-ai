from __future__ import annotations

import os
import io
import re
import json
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Body, Path, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

from pydantic import BaseModel, EmailStr, Field

from sqlalchemy import (
    create_engine,
    String,
    Integer,
    DateTime,
    Text,
    ForeignKey,
    select,
    desc,
    UniqueConstraint,
)
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
    relationship,
    sessionmaker,
    Session,
)
from sqlalchemy.exc import IntegrityError

from passlib.context import CryptContext

try:
    from jose import jwt, JWTError
except Exception as e:  # pragma: no cover
    raise RuntimeError("python-jose is required. Ensure requirements.txt includes python-jose.") from e

# Optional AI client (app works without it)
OPENAI_AVAILABLE = True
try:
    from openai import OpenAI
except Exception:
    OPENAI_AVAILABLE = False

# Optional PDF/DOCX parsing (you already have these in requirements)
try:
    import PyPDF2
except Exception:
    PyPDF2 = None

try:
    import docx  # python-docx
except Exception:
    docx = None


# -----------------------------
# Config
# -----------------------------
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
if not DATABASE_URL:
    # Render provides DATABASE_URL. Locally you can set it in .env
    DATABASE_URL = "sqlite:///./local.db"  # fallback for local dev

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALG = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "43200"))  # 30 days default

BOOTSTRAP_EMPLOYER_TOKEN = os.getenv("BOOTSTRAP_EMPLOYER_TOKEN", "Peanuts-Setup-2025!")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")  # safe default if available


# -----------------------------
# DB setup
# -----------------------------
class Base(DeclarativeBase):
    pass


engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=int(os.getenv("DB_POOL_SIZE", "5")),
    max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "5")),
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def db() -> Session:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


# -----------------------------
# Models
# -----------------------------
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)  # "candidate" | "employer"
    plan: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    candidate_cvs: Mapped[List["CandidateCV"]] = relationship(back_populates="candidate", cascade="all, delete-orphan")
    vacancies: Mapped[List["Vacancy"]] = relationship(back_populates="employer", cascade="all, delete-orphan")
    applications: Mapped[List["Application"]] = relationship(back_populates="candidate", cascade="all, delete-orphan")


class CandidateCV(Base):
    __tablename__ = "candidate_cvs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)

    source_filename: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    source_content_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    extracted_text: Mapped[str] = mapped_column(Text, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    candidate: Mapped["User"] = relationship(back_populates="candidate_cvs")


class Vacancy(Base):
    __tablename__ = "vacancies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    employer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    hours_per_week: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    salary_range: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Optional “source” fields (future: URL upload / doc parsing)
    source_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    source_filename: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    source_storage_key: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    source_content_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    extracted_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    employer: Mapped["User"] = relationship(back_populates="vacancies")
    applications: Mapped[List["Application"]] = relationship(back_populates="vacancy", cascade="all, delete-orphan")


class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (
        UniqueConstraint("candidate_id", "vacancy_id", name="uq_application_candidate_vacancy"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    vacancy_id: Mapped[int] = mapped_column(ForeignKey("vacancies.id"), nullable=False, index=True)

    status: Mapped[str] = mapped_column(String(50), default="submitted")  # submitted | reviewed | etc.
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    candidate: Mapped["User"] = relationship(back_populates="applications")
    vacancy: Mapped["Vacancy"] = relationship(back_populates="applications")
    ai_results: Mapped[List["AIResult"]] = relationship(back_populates="application", cascade="all, delete-orphan")


class AIResult(Base):
    __tablename__ = "ai_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id"), nullable=False, index=True)

    match_score: Mapped[int] = mapped_column(Integer, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    strengths: Mapped[str] = mapped_column(Text, nullable=False)
    gaps: Mapped[str] = mapped_column(Text, nullable=False)
    suggested_questions: Mapped[str] = mapped_column(Text, nullable=False)  # stored as plain text list

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    application: Mapped["Application"] = relationship(back_populates="ai_results")


# -----------------------------
# Schemas
# -----------------------------
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str = Field(min_length=1)


class RegisterEmployerRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str = Field(min_length=1)
    bootstrap_token: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str
    plan: Optional[str] = None

    class Config:
        from_attributes = True


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


class ApplicationOut(BaseModel):
    id: int
    candidate_id: int
    vacancy_id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class ApplicationWithCandidate(BaseModel):
    id: int
    vacancy_id: int
    status: str
    created_at: datetime
    candidate: UserOut

    class Config:
        from_attributes = True


class AIResultOut(BaseModel):
    id: int
    application_id: int
    match_score: int
    summary: str
    strengths: str
    gaps: str
    suggested_questions: str

    class Config:
        from_attributes = True


class AnalyzeResponse(BaseModel):
    id: int
    application_id: int
    match_score: int
    summary: str
    strengths: str
    gaps: str
    suggested_questions: str


# -----------------------------
# Auth helpers
# -----------------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def hash_password(pw: str) -> str:
    return pwd_context.hash(pw)


def verify_password(pw: str, hashed: str) -> bool:
    return pwd_context.verify(pw, hashed)


def create_access_token(*, sub: str, role: str) -> str:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": sub,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except JWTError:
        raise HTTPException(status_code=401, detail="Not authenticated")


def get_current_user(token: str = Depends(oauth2_scheme), session: Session = Depends(db)) -> User:
    payload = decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = session.get(User, int(user_id))
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def require_role(required: str):
    def _dep(user: User = Depends(get_current_user)) -> User:
        if user.role != required:
            raise HTTPException(status_code=403, detail=f"{required.capitalize()} role required")
        return user
    return _dep


# -----------------------------
# Text extraction helpers
# -----------------------------
def _clean_text(s: str) -> str:
    s = s.replace("\x00", " ")
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()


def extract_text_from_upload(file: UploadFile, raw: bytes) -> str:
    filename = (file.filename or "").lower()
    ctype = (file.content_type or "").lower()

    if filename.endswith(".pdf") or ctype == "application/pdf":
        if PyPDF2 is None:
            raise HTTPException(status_code=500, detail="PDF parser not available")
        reader = PyPDF2.PdfReader(io.BytesIO(raw))
        parts = []
        for p in reader.pages:
            parts.append(p.extract_text() or "")
        return _clean_text("\n".join(parts))

    if filename.endswith(".docx") or ctype in ("application/vnd.openxmlformats-officedocument.wordprocessingml.document",):
        if docx is None:
            raise HTTPException(status_code=500, detail="DOCX parser not available")
        doc = docx.Document(io.BytesIO(raw))
        parts = [para.text for para in doc.paragraphs]
        return _clean_text("\n".join(parts))

    raise HTTPException(status_code=400, detail="Unsupported file type. Upload a .pdf or .docx")


# -----------------------------
# AI analysis
# -----------------------------
def analyze_cv_vs_vacancy(cv_text: str, vacancy: Vacancy) -> Dict[str, Any]:
    """
    Returns a dict:
    { match_score:int, summary:str, strengths:str, gaps:str, suggested_questions:str }
    """
    title = vacancy.title or ""
    desc = vacancy.description or ""
    loc = vacancy.location or ""
    hours = vacancy.hours_per_week or ""
    salary = vacancy.salary_range or ""

    # If OpenAI isn't available or no key, use deterministic fallback
    if (not OPENAI_AVAILABLE) or (not OPENAI_API_KEY):
        # Simple heuristic fallback
        score = 75
        strengths = "Ervaring in sales/teamleiding en new business lijkt aanwezig (fallback analyse)."
        gaps = "Geef meer concrete voorbeelden/metrics en branchecontext (fallback analyse)."
        questions = (
            "Welke salesstrategie heeft u opgezet?\n"
            "Hoe genereert u structureel new business?\n"
            "Welke KPI’s stuurde u op?\n"
            "Hoe bouwde u teams en welke resultaten behaalde u?\n"
            "Wat verwacht u qua salaris/voorwaarden?"
        )
        summary = f"Fallback analyse: profiel matcht globaal met {title} in {loc}."
        return {
            "match_score": score,
            "summary": summary,
            "strengths": strengths,
            "gaps": gaps,
            "suggested_questions": questions,
        }

    client = OpenAI(api_key=OPENAI_API_KEY)

    system = (
        "Je bent een senior recruiter + assessment specialist. "
        "Je beoordeelt CV tekst t.o.v. vacature en geeft een compacte, zakelijke analyse in JSON. "
        "Geen markdown. Alleen geldige JSON output."
    )
    user = {
        "vacancy": {
            "title": title,
            "location": loc,
            "hours_per_week": hours,
            "salary_range": salary,
            "description": desc,
        },
        "cv_text": cv_text,
        "output_schema": {
            "match_score": "integer 0-100",
            "summary": "string (1-2 zinnen)",
            "strengths": "string (komma of opsomming in tekst)",
            "gaps": "string (komma of opsomming in tekst)",
            "suggested_questions": "string (5 vragen, elk op nieuwe regel)",
        },
    }

    resp = client.chat.completions.create(
        model=OPENAI_MODEL,
        temperature=0.2,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": json.dumps(user, ensure_ascii=False)},
        ],
    )

    content = (resp.choices[0].message.content or "").strip()

    # Try strict JSON parse
    try:
        data = json.loads(content)
    except Exception:
        # Try to extract JSON object
        m = re.search(r"\{.*\}", content, re.DOTALL)
        if not m:
            raise HTTPException(status_code=500, detail="AI response not parseable")
        data = json.loads(m.group(0))

    # Validate minimal keys
    for k in ("match_score", "summary", "strengths", "gaps", "suggested_questions"):
        if k not in data:
            raise HTTPException(status_code=500, detail=f"AI response missing key: {k}")

    # Normalize score
    try:
        score = int(data["match_score"])
    except Exception:
        score = 0
    score = max(0, min(100, score))

    return {
        "match_score": score,
        "summary": str(data["summary"]),
        "strengths": str(data["strengths"]),
        "gaps": str(data["gaps"]),
        "suggested_questions": str(data["suggested_questions"]),
    }


# -----------------------------
# FastAPI app
# -----------------------------
app = FastAPI(title="It's Peanuts AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def ensure_db_schema() -> None:
    Base.metadata.create_all(bind=engine)


@app.on_event("startup")
def _startup() -> None:
    ensure_db_schema()


# -----------------------------
# Auth endpoints
# -----------------------------
@app.post("/auth/register", response_model=UserOut)
def register_candidate(payload: RegisterRequest, session: Session = Depends(db)):
    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name.strip(),
        password_hash=hash_password(payload.password),
        role="candidate",
    )
    session.add(user)
    try:
        session.commit()
        session.refresh(user)
    except IntegrityError:
        session.rollback()
        # if exists, treat as ok? No, explicit error keeps it clean.
        raise HTTPException(status_code=400, detail="Email already registered")
    return user


@app.post("/auth/register-employer", response_model=UserOut)
def register_employer(payload: RegisterEmployerRequest, session: Session = Depends(db)):
    if payload.bootstrap_token != BOOTSTRAP_EMPLOYER_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid bootstrap token")

    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name.strip(),
        password_hash=hash_password(payload.password),
        role="employer",
    )
    session.add(user)
    try:
        session.commit()
        session.refresh(user)
    except IntegrityError:
        session.rollback()
        raise HTTPException(status_code=400, detail="Email already registered")
    return user


@app.post("/auth/login")
def login(form: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(db)):
    user = session.execute(select(User).where(User.email == form.username.lower())).scalar_one_or_none()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(sub=str(user.id), role=user.role)
    return {"access_token": token, "token_type": "bearer"}


@app.get("/auth/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


# -----------------------------
# Employer: Vacancies
# -----------------------------
@app.post("/employer/vacancies", response_model=VacancyOut)
def employer_create_vacancy(
    payload: VacancyCreate,
    employer: User = Depends(require_role("employer")),
    session: Session = Depends(db),
):
    v = Vacancy(
        employer_id=employer.id,
        title=payload.title.strip(),
        location=(payload.location or None),
        hours_per_week=(payload.hours_per_week or None),
        salary_range=(payload.salary_range or None),
        description=(payload.description or None),
    )
    session.add(v)
    session.commit()
    session.refresh(v)
    return v


@app.get("/employer/vacancies", response_model=List[VacancyOut])
def employer_list_vacancies(
    employer: User = Depends(require_role("employer")),
    session: Session = Depends(db),
):
    rows = session.execute(
        select(Vacancy).where(Vacancy.employer_id == employer.id).order_by(desc(Vacancy.id))
    ).scalars().all()
    return rows


# -----------------------------
# (1) Candidate: Vacancies list
# -----------------------------
@app.get("/candidate/vacancies", response_model=List[VacancyOut])
def candidate_list_vacancies(
    candidate: User = Depends(require_role("candidate")),
    session: Session = Depends(db),
    q: Optional[str] = Query(default=None, description="Optional search in title/description"),
):
    stmt = select(Vacancy).order_by(desc(Vacancy.id))
    if q:
        qn = f"%{q.strip().lower()}%"
        stmt = stmt.where(
            (Vacancy.title.ilike(qn)) | (Vacancy.description.ilike(qn))
        )
    return session.execute(stmt).scalars().all()


# -----------------------------
# CV upload
# -----------------------------
@app.post("/candidate/cv")
def candidate_upload_cv(
    file: UploadFile = File(...),
    candidate: User = Depends(require_role("candidate")),
    session: Session = Depends(db),
):
    raw = file.file.read()
    text = extract_text_from_upload(file, raw)

    cv = CandidateCV(
        candidate_id=candidate.id,
        source_filename=file.filename,
        source_content_type=file.content_type,
        extracted_text=text,
    )
    session.add(cv)
    session.commit()
    session.refresh(cv)

    # Return extracted text (as you already had)
    return text


def get_latest_cv_text(session: Session, candidate_id: int) -> str:
    cv = session.execute(
        select(CandidateCV).where(CandidateCV.candidate_id == candidate_id).order_by(desc(CandidateCV.id)).limit(1)
    ).scalars().first()
    if not cv:
        raise HTTPException(status_code=400, detail="No CV uploaded yet")
    return cv.extracted_text


# -----------------------------
# (2) Candidate: Apply on vacancy
# -----------------------------
@app.post("/candidate/apply/{vacancy_id}", response_model=ApplicationOut)
def candidate_apply(
    vacancy_id: int = Path(..., ge=1),
    candidate: User = Depends(require_role("candidate")),
    session: Session = Depends(db),
):
    vacancy = session.get(Vacancy, vacancy_id)
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found")

    app_obj = Application(candidate_id=candidate.id, vacancy_id=vacancy_id, status="submitted")
    session.add(app_obj)
    try:
        session.commit()
        session.refresh(app_obj)
    except IntegrityError:
        session.rollback()
        # already applied -> return existing
        existing = session.execute(
            select(Application).where(
                Application.candidate_id == candidate.id,
                Application.vacancy_id == vacancy_id
            )
        ).scalar_one()
        return existing

    return app_obj


# -----------------------------
# (4) Candidate: Analyze (creates application if missing + saves AIResult)
# -----------------------------
@app.post("/candidate/analyze/{vacancy_id}", response_model=AnalyzeResponse)
def candidate_analyze(
    vacancy_id: int = Path(..., ge=1),
    candidate: User = Depends(require_role("candidate")),
    session: Session = Depends(db),
):
    vacancy = session.get(Vacancy, vacancy_id)
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found")

    # Ensure application exists (so employer always has a record)
    app_obj = session.execute(
        select(Application).where(
            Application.candidate_id == candidate.id,
            Application.vacancy_id == vacancy_id
        )
    ).scalars().first()

    if not app_obj:
        app_obj = Application(candidate_id=candidate.id, vacancy_id=vacancy_id, status="submitted")
        session.add(app_obj)
        session.commit()
        session.refresh(app_obj)

    cv_text = get_latest_cv_text(session, candidate.id)

    # Generate analysis
    data = analyze_cv_vs_vacancy(cv_text, vacancy)

    # Store AIResult (one per analyze call; you can later change to upsert)
    ai = AIResult(
        application_id=app_obj.id,
        match_score=int(data["match_score"]),
        summary=data["summary"],
        strengths=data["strengths"],
        gaps=data["gaps"],
        suggested_questions=data["suggested_questions"],
    )
    session.add(ai)
    session.commit()
    session.refresh(ai)

    return AnalyzeResponse(
        id=ai.id,
        application_id=app_obj.id,
        match_score=ai.match_score,
        summary=ai.summary,
        strengths=ai.strengths,
        gaps=ai.gaps,
        suggested_questions=ai.suggested_questions,
    )


# -----------------------------
# (3) Employer: list applications per vacancy
# -----------------------------
@app.get("/employer/vacancies/{vacancy_id}/applications", response_model=List[ApplicationWithCandidate])
def employer_list_applications(
    vacancy_id: int = Path(..., ge=1),
    employer: User = Depends(require_role("employer")),
    session: Session = Depends(db),
):
    vacancy = session.get(Vacancy, vacancy_id)
    if not vacancy or vacancy.employer_id != employer.id:
        raise HTTPException(status_code=404, detail="Vacancy not found")

    apps = session.execute(
        select(Application).where(Application.vacancy_id == vacancy_id).order_by(desc(Application.id))
    ).scalars().all()

    # Force-load candidate relation
    for a in apps:
        _ = a.candidate.email

    return apps


# -----------------------------
# (4) Employer: get latest AIResult for an application
# -----------------------------
@app.get("/employer/applications/{application_id}/ai-latest", response_model=AIResultOut)
def employer_get_latest_ai(
    application_id: int = Path(..., ge=1),
    employer: User = Depends(require_role("employer")),
    session: Session = Depends(db),
):
    app_obj = session.get(Application, application_id)
    if not app_obj:
        raise HTTPException(status_code=404, detail="Application not found")

    # Security: employer must own vacancy
    vacancy = session.get(Vacancy, app_obj.vacancy_id)
    if not vacancy or vacancy.employer_id != employer.id:
        raise HTTPException(status_code=403, detail="Employer role required")

    ai = session.execute(
        select(AIResult).where(AIResult.application_id == application_id).order_by(desc(AIResult.id)).limit(1)
    ).scalars().first()

    if not ai:
        raise HTTPException(status_code=404, detail="No AI result yet")

    return ai


@app.get("/health")
def health():
    return {"ok": True, "ts": datetime.now(timezone.utc).isoformat()}













