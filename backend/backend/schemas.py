from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

# -------- Auth --------
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str | None = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class CandidateMe(BaseModel):
    id: int
    email: EmailStr
    full_name: str | None = None
    cv_text: str | None = None
    cv_updated_at: datetime | None = None

# -------- Companies / Jobs (ATS) --------
class CompanyCreate(BaseModel):
    name: str
    kvk_number: str | None = None
    vat_number: str | None = None
    contact_name: str | None = None
    contact_email: EmailStr
    contact_phone: str | None = None
    iban: str | None = None
    account_holder: str | None = None

class CompanyOut(BaseModel):
    id: int
    name: str
    contact_email: EmailStr
    billing_plan: str
    trial_jobs_used: int

class JobCreate(BaseModel):
    company_id: int
    title: str
    description: str
    location: str | None = None
    salary_range: str | None = None

class JobOut(BaseModel):
    id: int
    company_id: int
    title: str
    description: str
    location: str | None = None
    salary_range: str | None = None
    status: str
    is_trial: bool

# -------- Applications --------
class ApplyRequest(BaseModel):
    job_id: int

class ApplicationOut(BaseModel):
    id: int
    job_id: int
    candidate_id: int
    status: str
    created_at: datetime
