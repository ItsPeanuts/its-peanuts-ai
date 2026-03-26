from __future__ import annotations

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship

from backend.models.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)

    # "candidate" | "employer" | "admin"
    role = Column(String(50), nullable=False, index=True)

    # employer plan: "gratis" | "normaal" | "premium"
    plan = Column(String(50), nullable=True, default=None)

    # pay-per-vacature credits (eenmalige aankopen)
    vacancy_credits = Column(Integer, nullable=False, default=0, server_default="0")

    # gratis trial: toegang tot gratis plan tot deze datum
    trial_ends_at = Column(DateTime(timezone=True), nullable=True, default=None)

    # organisatie (multi-user werkgever); None = individueel
    org_id = Column(Integer, ForeignKey("organisations.id"), nullable=True, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    vacancies    = relationship("Vacancy", back_populates="employer", cascade="all, delete-orphan")
    organisation = relationship("Organisation", back_populates="users")


