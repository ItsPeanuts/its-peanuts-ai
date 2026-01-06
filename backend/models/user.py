# backend/models/user.py
from __future__ import annotations

from sqlalchemy import Column, Integer, String, DateTime, func, UniqueConstraint
from sqlalchemy.orm import relationship

from backend.models import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("email", name="uq_users_email"),)

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # "candidate" | "employer" | "admin"

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    vacancies = relationship("Vacancy", back_populates="employer", cascade="all, delete-orphan")

