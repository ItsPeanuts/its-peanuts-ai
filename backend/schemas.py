# backend/schemas.py
from __future__ import annotations

from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, ConfigDict


# ----------------------------
# Auth / Users
# ----------------------------
class CandidateRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1)


class EmployerRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1)
    bootstrap_token: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
    role: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ----------------------------
# Vacancies
# ----------------------------
class VacancyBase(BaseModel):
    title: str = Field(min_length=1)
    location: str = Field(min_length=1)
    hours_per_week: Optional[str] = None
    salary_range: Optional[str] = None
    description: Optional[str] = None


class VacancyCreate(VacancyBase):
    pass


class VacancyOut(VacancyBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employer_id: int

    source_type: Optional[str] = None
    source_filename: Optional[str] = None
    source_storage_key: Optional[str] = None
    source_content_type: Optional[str] = None
    extracted_text: Optional[str] = None


class VacancyListOut(BaseModel):
    items: List[VacancyOut]






