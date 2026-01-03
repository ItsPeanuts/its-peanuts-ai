# backend/schemas.py
from __future__ import annotations

from typing import Optional, List
from pydantic import BaseModel, EmailStr


# ---------- AUTH ----------
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    bootstrap_token: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str


class CandidateOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str

    class Config:
        from_attributes = True


# ---------- VACANCIES ----------
class VacancyCreate(BaseModel):
    title: str
    location: Optional[str] = None
    hours_per_week: Optional[str] = None
    salary_range: Optional[str] = None
    description: Optional[str] = None


class VacancyUpdate(BaseModel):
    title: Optional[str] = None
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


class VacancyOutList(BaseModel):
    items: List[VacancyOut]





