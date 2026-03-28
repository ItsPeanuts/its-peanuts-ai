from __future__ import annotations

from datetime import datetime
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


class ResendVerification(BaseModel):
    email: EmailStr


class OrganisationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    created_at: datetime
    user_count: int = 0


class OrganisationCreate(BaseModel):
    name: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    full_name: str
    role: str
    plan: Optional[str] = None
    org_id: Optional[int] = None
    org_name: Optional[str] = None


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
    employment_type: Optional[str] = None   # fulltime|parttime|freelance|stage|tijdelijk
    work_location: Optional[str] = None     # remote|hybride|op-locatie
    language: Optional[str] = None          # nl|en


class VacancyCreate(VacancyBase):
    interview_type: str = "both"  # "chat" | "virtual" | "both"


class VacancyOut(VacancyBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    employer_id: int
    interview_type: str = "both"
    status: str = "concept"  # "concept" | "actief" | "offline"

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


class ApplicationWithCandidateOut(BaseModel):
    """Werkgever-view: applicatie + kandidaat info + AI score."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    vacancy_id: int
    status: str
    created_at: datetime
    candidate_id: int
    candidate_name: str
    candidate_email: str
    match_score: Optional[int] = None
    ai_summary: Optional[str] = None
    ai_strengths: Optional[str] = None
    ai_gaps: Optional[str] = None
    ai_suggested_questions: Optional[str] = None


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


# ----------------------------
# Aanbevelingen (recommendations)
# ----------------------------

class RecommendationOut(BaseModel):
    vacancy_id: int
    title: str
    location: Optional[str] = None
    match_score: int   # 0-100
    reason: str        # 1-2 zinnen NL, waarom goede match


# ----------------------------
# Public Vacancies
# ----------------------------

class PublicVacancyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    location: Optional[str] = None
    hours_per_week: Optional[str] = None
    salary_range: Optional[str] = None
    description: Optional[str] = None
    employment_type: Optional[str] = None
    work_location: Optional[str] = None
    language: Optional[str] = None
    created_at: datetime


class IntakeQuestionPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    qtype: str
    question: str
    options_json: Optional[str] = None


class PublicVacancyDetail(PublicVacancyOut):
    intake_questions: List[IntakeQuestionPublic] = []
    interview_type: str = "both"   # "chat" | "virtual" | "both"
    employer_plan: str = "gratis"  # "gratis" | "normaal" | "premium"


class ApplyResponse(BaseModel):
    application_id: int
    match_score: int
    explanation: str
    access_token: str
    token_type: str = "bearer"


# ----------------------------
# Kandidaten portaal
# ----------------------------

class ApplicationWithDetails(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    application_id: int
    vacancy_id: int
    vacancy_title: str
    vacancy_location: Optional[str]
    status: str
    created_at: datetime
    match_score: Optional[int] = None
    ai_summary: Optional[str] = None


class CandidateCVOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    source_filename: Optional[str] = None
    source_content_type: Optional[str] = None
    created_at: datetime
    text_preview: Optional[str] = None


class CandidateCVText(BaseModel):
    id: int
    extracted_text: str


class CandidateCVUpdate(BaseModel):
    extracted_text: str







