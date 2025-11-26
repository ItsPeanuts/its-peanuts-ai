from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Text, DateTime, Date, ForeignKey, Boolean
from sqlalchemy.orm import relationship

from .db import Base


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)

    # Bedrijfsgegevens
    name = Column(String(255), nullable=False)
    kvk_number = Column(String(50), nullable=True)       # KVK-nummer
    vat_number = Column(String(50), nullable=True)       # BTW-nummer

    # Contactpersoon
    contact_name = Column(String(255), nullable=True)
    contact_email = Column(String(255), nullable=False, unique=True)
    contact_phone = Column(String(50), nullable=True)

    # Bankgegevens voor automatische incasso
    iban = Column(String(34), nullable=True)
    account_holder = Column(String(255), nullable=True)

    # Abonnement
    billing_plan = Column(String(50), default="trial")   # trial / active / cancelled / overdue
    monthly_price_cents = Column(Integer, default=9900)  # €99 p/m in centen
    trial_jobs_used = Column(Integer, default=0)
    subscription_started_at = Column(DateTime, nullable=True)
    next_billing_date = Column(Date, nullable=True)

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
    candidates = relationship("CandidateProfile", back_populates="job")


class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=True)

    full_name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    cv_text = Column(Text, nullable=False)

    match_score = Column(Integer, nullable=True)  # 0–100

    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("Job", back_populates="candidates")


