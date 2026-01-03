from pydantic import BaseModel, EmailStr
from typing import Optional


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
    token_type: str = "bearer"


# ---------- CANDIDATE ----------
class CandidateOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str

    class Config:
        from_attributes = True


# ---------- VACANCIES ----------
class VacancyCreateText(BaseModel):
    title: str
    text: str


class VacancyOut(BaseModel):
    id: int
    title: str
    source: str
    file_name: Optional[str] = None

    class Config:
        from_attributes = True


# ---------- CV ----------
class CVTextCreate(BaseModel):
    text: str


class CVOut(BaseModel):
    id: int
    candidate_id: int
    source: str
    file_name: Optional[str] = None

    class Config:
        from_attributes = True



