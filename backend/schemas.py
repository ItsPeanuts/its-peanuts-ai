from __future__ import annotations

from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, ConfigDict


# ----------------------------
# Auth / Users
# ----------------------------

class CandidateRegister(BaseModel):
    """
    Request body voor: POST /auth/register
    (candidate registratie)
    """
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1)


class EmployerRegister(BaseModel):
    """
    Request body voor: POST /auth/register-employer
    (employer registratie)
    """
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1)
    bootstrap_token: str


class LoginRequest(BaseModel):
    """
    Request body voor: POST /auth/login
    """
    email: EmailStr
    password: str


class UserOut(BaseModel):
    """
    Response model voor user objecten.
    Past bij jouw statement: models.User bestaat en heeft role: str
    """
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
    """
    Request body voor: POST /employer/vacancies
    """
    pass


class VacancyOut(VacancyBase):
    """
    Response model voor vacancies.
    (Velden gebaseerd op jouw Swagger output)
    """
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





