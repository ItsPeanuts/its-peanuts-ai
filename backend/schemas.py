from pydantic import BaseModel, EmailStr, Field


# ---------- Auth ----------
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)  # bcrypt limiet
    full_name: str = Field(min_length=2, max_length=255)
    bootstrap_token: str = Field(min_length=1)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CandidateOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str

    class Config:
        from_attributes = True


# ---------- Employer / Jobs ----------
class JobCreate(BaseModel):
    title: str = Field(min_length=2, max_length=255)
    description: str = Field(min_length=10)
    location: str | None = None
    employment_type: str | None = None


class JobOut(BaseModel):
    id: int
    employer_id: int
    title: str
    description: str
    location: str | None
    employment_type: str | None
    source: str
    original_filename: str | None
    original_type: str | None

    class Config:
        from_attributes = True


# ---------- Candidate / CV ----------
class CVOut(BaseModel):
    id: int
    candidate_id: int
    text: str
    original_filename: str | None
    original_type: str | None

    class Config:
        from_attributes = True





