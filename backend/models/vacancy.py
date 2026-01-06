# backend/models/vacancy.py
from __future__ import annotations

from sqlalchemy import Column, Integer, String, Text, DateTime, func, ForeignKey
from sqlalchemy.orm import relationship

from backend.models import Base


class Vacancy(Base):
    __tablename__ = "vacancies"

    id = Column(Integer, primary_key=True, index=True)
    employer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    title = Column(String(255), nullable=False)
    location = Column(String(255), nullable=False)
    hours_per_week = Column(String(50), nullable=True)
    salary_range = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)

    source_type = Column(String(50), nullable=True)
    source_filename = Column(String(255), nullable=True)
    source_storage_key = Column(String(255), nullable=True)
    source_content_type = Column(String(100), nullable=True)
    extracted_text = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    employer = relationship("User", back_populates="vacancies", lazy="joined")




