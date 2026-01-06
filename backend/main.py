from __future__ import annotations

import os
import re
from datetime import datetime, timedelta, timezone
from typing import Generator, Optional, List, Dict, Any

from fastapi import FastAPI, Depends, HTTPException, status
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


# ------------------------------------------------------------
# Settings
# ------------------------------------------------------------
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set. Add it in Render Environment.")

# Render may provide postgres:// which SQLAlchemy might reject
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-now").strip()
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256").strip()
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "43200"))  # 30 days default

BOOTSTRAP_TOKEN = os.getenv("BOOTSTRAP_TOKEN", "Peanuts-Setup-2025!").strip()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Important: tokenUrl must match the path used for token retrieval in Swagger
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ------------------------------------------------------------
# Database
# ------------------------------------------------------------
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ------------------------------------------------------------
# Models
# ------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="candidate")  # candidate | employer | admin
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    vacancies = relationship("Vacancy", back_populates="employer", cascade="all, delete-orphan")


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


# Create tables for MVP (later: Alembic migrations)
Base.metadata.create_all(bind=engine)


# ------------------------------------------------------------
# Schemas
# ------------------------------------------------------------
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


# -------------------------
# Step 3: AI Shortlist
# -------------------------
class AIScoreItem(BaseModel):
    candidate_ref: str
    score: int = Field(ge=0, le=100)
    rationale: str
    must_have_gaps: List[str] = Field(default_factory=list)


class AIShortlistRequest(BaseModel):
    # Either provide vacancy_id OR vacancy_text (or both; vacancy_text wins if provided)
    vacancy_id: Optional[int] = None
    vacancy_text: Optional[str] = None

    # Provide candidates as text blobs. candidate_ref can be anything (id, email, name)
    candidates: List[Dict[str, str]] = Field(
        description='List items like {"candidate_ref": "123", "text": "CV text..."}'
    )

    top_k: int = 10


class AIShortlistResponse(BaseModel):
    vacancy_used: str
    results: List[AIScoreItem]


# ------------------------------------------------------------
# Security helpers
# ------------------------------------------------------------
def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(*, sub: str, expires_minutes: int = ACCESS_TOKEN_EXPIRE_MINUTES) -> str:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=expires_minutes)
    payload = {
        "sub": sub,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
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


# ------------------------------------------------------------
# App
# ------------------------------------------------------------
app = FastAPI(
    title="It's Peanuts AI",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # later beperken
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------
# Auth routes
# ------------------------------------------------------------
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


# IMPORTANT:
# Swagger "Authorize" for OAuth2PasswordBearer expects form fields (username/password)
# That is exactly what OAuth2PasswordRequestForm provides.
@app.post("/auth/login", response_model=TokenOut, tags=["auth"])
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)) -> TokenOut:
    # OAuth2PasswordRequestForm uses "username" field even if it's an email
    email = (form_data.username or "").lower().strip()
    password = form_data.password or ""

    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(sub=str(user.id))
    return TokenOut(access_token=token)


@app.get("/auth/me", response_model=UserOut, tags=["auth"])
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


# ------------------------------------------------------------
# Employer vacancies routes
# ------------------------------------------------------------
@app.get("/employer/vacancies", response_model=List[VacancyOut], tags=["employer-vacancies"])
def list_vacancies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[Vacancy]:
    require_employer(current_user)
    rows = (
        db.query(Vacancy)
        .filter(Vacancy.employer_id == current_user.id)
        .order_by(Vacancy.id.desc())
        .all()
    )
    return rows


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


# ------------------------------------------------------------
# Step 3: AI Shortlist route
# ------------------------------------------------------------
def _clean_text(s: str) -> str:
    s = s or ""
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _heuristic_score(vacancy_text: str, candidate_text: str) -> Dict[str, Any]:
    """
    Safe fallback if OPENAI_API_KEY is missing.
    Simple keyword overlap score.
    """
    v = set(re.findall(r"[a-zA-Z0-9]+", vacancy_text.lower()))
    c = set(re.findall(r"[a-zA-Z0-9]+", candidate_text.lower()))
    if not v or not c:
        return {"score": 0, "rationale": "Onvoldoende tekst om te vergelijken.", "gaps": []}

    overlap = v.intersection(c)
    ratio = len(overlap) / max(1, len(v))
    score = int(min(100, max(0, round(ratio * 120))))  # slightly boosted overlap

    gaps = list(sorted((v - c)))[:8]
    rationale = f"Heuristiek: {len(overlap)} overlappende keywords. Score gebaseerd op overlapratio."
    return {"score": score, "rationale": rationale, "gaps": gaps}


async def _openai_shortlist(vacancy_text: str, candidates: List[Dict[str, str]], top_k: int) -> List[AIScoreItem]:
    """
    Uses OpenAI if key exists. Otherwise raise to fallback.
    """
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY missing")

    # Lazy import so Render doesn't fail if OpenAI isn't used
    from openai import OpenAI

    client = OpenAI(api_key=OPENAI_API_KEY)

    # Build prompt
    cand_lines = []
    for i, c in enumerate(candidates, start=1):
        cref = _clean_text(c.get("candidate_ref", f"cand-{i}"))
        ctext = _clean_text(c.get("text", ""))
        cand_lines.append(f"[{cref}] {ctext}")

    prompt = f"""
Je bent een recruiter-assistent. Rank de kandidaten op match met de vacature.
Geef per kandidaat:
- candidate_ref
- score (0-100)
- rationale (max 2 zinnen)
- must_have_gaps (max 5 bullets)

Vacature:
{vacancy_text}

Kandidaten:
{chr(10).join(cand_lines)}

Output STRICT JSON als lijst van objecten met keys:
candidate_ref, score, rationale, must_have_gaps
    """.strip()

    # Use a widely available model name; adjust later if you want
    resp = client.responses.create(
        model="gpt-4.1-mini",
        input=prompt,
    )

    text = (resp.output_text or "").strip()
    # Try to parse JSON safely; if it fails, raise to fallback
    import json
    try:
        data = json.loads(text)
        if not isinstance(data, list):
            raise ValueError("JSON not list")
    except Exception as e:
        raise RuntimeError(f"OpenAI returned non-JSON: {e}") from e

    items: List[AIScoreItem] = []
    for obj in data[: max(1, top_k)]:
        try:
            items.append(
                AIScoreItem(
                    candidate_ref=str(obj.get("candidate_ref", "")),
                    score=int(obj.get("score", 0)),
                    rationale=str(obj.get("rationale", "")),
                    must_have_gaps=list(obj.get("must_have_gaps", [])) if obj.get("must_have_gaps") else [],
                )
            )
        except Exception:
            # skip malformed entry
            continue

    # Sort by score desc, enforce top_k
    items.sort(key=lambda x: x.score, reverse=True)
    return items[: max(1, top_k)]


@app.post("/ai/shortlist", response_model=AIShortlistResponse, tags=["ai"])
async def ai_shortlist(
    payload: AIShortlistRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AIShortlistResponse:
    """
    Employer-only: maak shortlist op basis van vacaturetekst + candidate teksten.
    """
    require_employer(current_user)

    vacancy_text = _clean_text(payload.vacancy_text or "")
    if not vacancy_text and payload.vacancy_id:
        vac = (
            db.query(Vacancy)
            .filter(Vacancy.id == payload.vacancy_id, Vacancy.employer_id == current_user.id)
            .first()
        )
        if not vac:
            raise HTTPException(status_code=404, detail="Vacancy not found")
        vacancy_text = _clean_text(f"{vac.title}\n{vac.location or ''}\n{vac.description or ''}")

    if not vacancy_text:
        raise HTTPException(status_code=400, detail="Provide vacancy_text or vacancy_id")

    if not payload.candidates or len(payload.candidates) == 0:
        raise HTTPException(status_code=400, detail="Provide candidates list")

    top_k = max(1, min(int(payload.top_k or 10), 50))

    # Normalize candidates
    candidates_norm: List[Dict[str, str]] = []
    for i, c in enumerate(payload.candidates, start=1):
        cref = _clean_text(c.get("candidate_ref", f"cand-{i}")) or f"cand-{i}"
        ctext = _clean_text(c.get("text", ""))
        candidates_norm.append({"candidate_ref": cref, "text": ctext})

    # Try OpenAI first; fallback to heuristic
    try:
        results = await _openai_shortlist(vacancy_text, candidates_norm, top_k)
        if not results:
            raise RuntimeError("Empty OpenAI result")
        return AIShortlistResponse(vacancy_used=vacancy_text[:5000], results=results)
    except Exception:
        scored: List[AIScoreItem] = []
        for c in candidates_norm:
            h = _heuristic_score(vacancy_text, c["text"])
            scored.append(
                AIScoreItem(
                    candidate_ref=c["candidate_ref"],
                    score=h["score"],
                    rationale=h["rationale"],
                    must_have_gaps=h["gaps"],
                )
            )
        scored.sort(key=lambda x: x.score, reverse=True)
        return AIShortlistResponse(vacancy_used=vacancy_text[:5000], results=scored[:top_k])













