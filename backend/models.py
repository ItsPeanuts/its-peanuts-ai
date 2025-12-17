from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.db import Base

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(255), nullable=False)
    kvk_number = Column(String(50), nullable=True)
    vat_number = Column(String(50), nullable=True)

    contact_name = Column(String(255), nullable=True)
    contact_email = Column(String(255), nullable=False, unique=True)
    contact_phone = Column(String(50), nullable=True)

    iban = Column(String(34), nullable=True)
    account_holder = Column(String(255), nullable=True)

    billing_plan = Column(String(50), default="trial")
    monthly_price_cents = Column(Integer, default=9900)
    trial_jobs_used = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)

    jobs = relationship("Job", back_populates="company")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)

    title = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    salary_range = Column(String(255), nullable=True)
    description = Column(Text, nullable=False)

    status = Column(String(50), default="open")
    is_trial = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="jobs")
    applications = relationship("Application", back_populates="job")


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=False, unique=True, index=True)
    full_name = Column(String(255), nullable=True)

    password_hash = Column(String(255), nullable=False)

    cv_text = Column(Text, nullable=True)
    cv_updated_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    applications = relationship("Application", back_populates="candidate")
    saved_jobs = relationship("SavedJob", back_populates="candidate")


class SavedJob(Base):
    __tablename__ = "saved_jobs"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    candidate = relationship("Candidate", back_populates="saved_jobs")

    __table_args__ = (UniqueConstraint("candidate_id", "job_id", name="uq_saved_job"),)


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)

    cover_letter = Column(Text, nullable=True)
    match_score = Column(Integer, nullable=True)
    match_explanation = Column(Text, nullable=True)

    status = Column(String(50), default="submitted")  # submitted / shortlisted / rejected / hired
    created_at = Column(DateTime, default=datetime.utcnow)

    candidate = relationship("Candidate", back_populates="applications")
    job = relationship("Job", back_populates="applications")



