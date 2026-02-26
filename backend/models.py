from sqlalchemy import Column, Integer, String, DateTime, Text, Float, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from backend.database import Base


# ============================================================
# USER - Base model for all accounts
# ============================================================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    password_hash = Column("hashed_password", String, nullable=False)
    
    role = Column(String, nullable=False, default="candidate")  # "candidate" or "employer"
    plan = Column(String, nullable=True)  # "free", "starter", "pro"
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    candidate_profile = relationship("CandidateProfile", back_populates="user", uselist=False)
    employer_profile = relationship("EmployerProfile", back_populates="user", uselist=False)
    applications = relationship("Application", back_populates="candidate")
    vacancies = relationship("Vacancy", back_populates="employer")


# ============================================================
# CANDIDATE PROFILE
# ============================================================

class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    
    # Profile data
    phone = Column(String, nullable=True)
    location = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    
    # CV storage
    cv_text = Column(Text, nullable=True)
    cv_parsed_json = Column(Text, nullable=True)  # Stored as JSON string
    skills = Column(Text, nullable=True)  # Comma-separated or JSON
    experience_years = Column(Integer, nullable=True)
    
    # Preferences
    preferred_locations = Column(Text, nullable=True)
    preferred_roles = Column(Text, nullable=True)
    availability = Column(String, nullable=True)  # "immediate", "2weeks", "1month"
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="candidate_profile")


# ============================================================
# EMPLOYER PROFILE
# ============================================================

class EmployerProfile(Base):
    __tablename__ = "employer_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    
    # Company info
    company_name = Column(String, nullable=False)
    company_description = Column(Text, nullable=True)
    industry = Column(String, nullable=True)
    company_size = Column(String, nullable=True)  # "startup", "small", "medium", "large"
    
    # Contact
    phone = Column(String, nullable=True)
    website = Column(String, nullable=True)
    
    # Registration info
    kvk_number = Column(String, nullable=True)  # Dutch business registration
    vat_number = Column(String, nullable=True)
    
    # Billing
    iban = Column(String, nullable=True)
    account_holder = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="employer_profile")


# ============================================================
# VACANCY / JOB POSTING
# ============================================================

class Vacancy(Base):
    __tablename__ = "vacancies"

    id = Column(Integer, primary_key=True, index=True)
    employer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Job details
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    location = Column(String, nullable=True)
    
    # Compensation
    salary_min = Column(Integer, nullable=True)
    salary_max = Column(Integer, nullable=True)
    salary_currency = Column(String, default="EUR")
    
    # Employment terms
    employment_type = Column(String, nullable=True)  # "full_time", "part_time", "contract", "internship"
    hours_per_week = Column(Integer, nullable=True)
    
    # Status
    status = Column(String, default="active")  # "active", "closed", "draft"
    
    # Metadata
    required_skills = Column(Text, nullable=True)  # JSON or comma-separated
    preferred_skills = Column(Text, nullable=True)
    experience_level = Column(String, nullable=True)  # "entry", "mid", "senior"
    years_experience_min = Column(Integer, nullable=True)
    
    # Dates
    published_at = Column(DateTime(timezone=True), server_default=func.now())
    closed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    employer = relationship("User", back_populates="vacancies")
    applications = relationship("Application", back_populates="vacancy", cascade="all, delete-orphan")
    interviews = relationship("Interview", back_populates="vacancy", cascade="all, delete-orphan")


# ============================================================
# APPLICATION
# ============================================================

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    vacancy_id = Column(Integer, ForeignKey("vacancies.id"), nullable=False)
    
    # Application content
    cover_letter = Column(Text, nullable=True)
    cv_snapshot = Column(Text, nullable=True)  # Snapshot of CV at time of application
    
    # AI Pre-screening
    initial_match_score = Column(Float, nullable=True)
    initial_screening_passed = Column(Boolean, nullable=True)
    screening_feedback = Column(Text, nullable=True)
    
    # Status
    status = Column(String, default="submitted")  
    # "submitted" -> "screened" -> "interview_scheduled" -> "interview_completed" -> "offered" / "rejected"
    
    # Timestamps
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    screened_at = Column(DateTime(timezone=True), nullable=True)
    rejected_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    candidate = relationship("User", back_populates="applications")
    vacancy = relationship("Vacancy", back_populates="applications")
    interviews = relationship("Interview", back_populates="application", cascade="all, delete-orphan")


# ============================================================
# INTERVIEW SESSION
# ============================================================

class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    vacancy_id = Column(Integer, ForeignKey("vacancies.id"), nullable=False)
    
    # Interview metadata
    type = Column(String, default="ai")  # "ai", "teams", "phone", "in_person"
    status = Column(String, default="scheduled")  # "scheduled", "in_progress", "completed", "cancelled"
    
    # Results
    transcript = Column(Text, nullable=True)
    score = Column(Float, nullable=True)
    summary = Column(Text, nullable=True)
    strengths = Column(Text, nullable=True)
    weaknesses = Column(Text, nullable=True)
    recommendation = Column(String, nullable=True)  # "strong_yes", "yes", "maybe", "no"
    
    # Competency scores (JSON format)
    competency_scores = Column(Text, nullable=True)
    
    # Dates
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    application = relationship("Application", back_populates="interviews")
    vacancy = relationship("Vacancy", back_populates="interviews")







