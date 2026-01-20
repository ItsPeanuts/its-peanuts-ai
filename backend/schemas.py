from __future__ import annotations

from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, ConfigDict


# ----------------------------
# Auth
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
    plan: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ----------------------------
# Vacancies
# ----------------------------

class VacancyBase(BaseModel):
    title: str = Field(min_length=1)
    location: Optional[str] = None
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


# ----------------------------
# Applications
# ----------------------------

class ApplicationCreate(BaseModel):
    # later kunnen we hier extra fields aan toevoegen
    pass


class ApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    candidate_id: int
    vacancy_id: int
    status: str


class ApplicationStatusUpdate(BaseModel):
    status: str = Field(pattern="^(applied|shortlisted|interview|rejected|hired)$")


# ----------------------------
# Intake
# ----------------------------

class IntakeQuestionCreate(BaseModel):
    qtype: str = Field(default="text", pattern="^(text|yes_no|single_choice|multi_choice|number)$")
    question: str = Field(min_length=1)
    options_json: Optional[str] = None


class IntakeQuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    vacancy_id: int
    qtype: str
    question: str
    options_json: Optional[str] = None


class IntakeAnswerCreate(BaseModel):
    question_id: int
    answer: str = Field(min_length=1)


class IntakeAnswerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    application_id: int
    question_id: int
    answer: str


# ----------------------------
# AI Result
# ----------------------------

class AIResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    application_id: int
    match_score: Optional[int] = None
    summary: Optional[str] = None
    strengths: Optional[str] = None
    gaps: Optional[str] = None
    suggested_questions: Optional[str] = None







