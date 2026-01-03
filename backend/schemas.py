from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Literal
from datetime import datetime


# ---------- AUTH ----------
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=120)
    bootstrap_token: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CandidateOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str

    class Config:
        from_attributes = True


# ---------- CV ----------
class CVOut(BaseModel):
    id: int
    candidate_id: int
    filename: str
    content_type: str
    extracted_text: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- VACANCIES ----------
class VacancyCreateText(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    text: str = Field(min_length=20)


class VacancyOut(BaseModel):
    id: int
    owner_candidate_id: int
    title: str
    source_type: Literal["text", "pdf", "docx"]
    filename: Optional[str] = None
    extracted_text: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- APPLICATIONS ----------
class ApplicationCreate(BaseModel):
    vacancy_id: int


class ApplicationOut(BaseModel):
    id: int
    vacancy_id: int
    candidate_id: int
    status: Literal["new", "questions_sent", "shortlisted", "rejected"]
    created_at: datetime

    class Config:
        from_attributes = True


class VacancyWithApplications(VacancyOut):
    applications: List[ApplicationOut] = []




