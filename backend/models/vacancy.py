# backend/models/vacancy.py
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from backend.database import Base


class Vacancy(Base):
    __tablename__ = "vacancies"

    id = Column(Integer, primary_key=True, index=True)

    employer_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True)
    employer = relationship("Candidate", back_populates="vacancies")

    title = Column(String(200), nullable=False)
    location = Column(String(200), nullable=True)
    hours_per_week = Column(String(50), nullable=True)
    salary_range = Column(String(100), nullable=True)

    # If written manually:
    description = Column(Text, nullable=True)

    # If uploaded:
    source_type = Column(String(20), nullable=True)              # pdf/docx/txt/unknown
    source_filename = Column(String(255), nullable=True)
    source_storage_key = Column(String(500), nullable=True)      # local filename or S3 key
    source_content_type = Column(String(100), nullable=True)

    extracted_text = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)


