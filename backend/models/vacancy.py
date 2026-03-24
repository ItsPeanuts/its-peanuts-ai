from __future__ import annotations

from sqlalchemy import Column, Integer, String, Text, DateTime, func, ForeignKey
from sqlalchemy.orm import relationship

from backend.models.base import Base


class Vacancy(Base):
    __tablename__ = "vacancies"

    id = Column(Integer, primary_key=True, index=True)
    employer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    title = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    hours_per_week = Column(String(50), nullable=True)
    salary_range = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)

    source_type = Column(String(50), nullable=True)
    source_filename = Column(String(255), nullable=True)
    source_storage_key = Column(String(255), nullable=True)
    source_content_type = Column(String(100), nullable=True)
    extracted_text = Column(Text, nullable=True)

    interview_type = Column(String(20), nullable=False, server_default="both")
    # "chat" | "virtual" | "both"

    # Indeed-stijl filters
    employment_type = Column(String(50), nullable=True)
    # "fulltime" | "parttime" | "freelance" | "stage" | "tijdelijk"

    work_location = Column(String(50), nullable=True)
    # "remote" | "hybride" | "op-locatie"

    # Publicatiestatus: concept (standaard) → actief → offline
    status = Column(String(20), nullable=False, server_default="concept")
    # "concept" | "actief" | "offline"

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    employer = relationship("User", back_populates="vacancies", lazy="joined")





