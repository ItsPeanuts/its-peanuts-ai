# backend/models/vacancy.py

from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func

from backend.database import Base


class Vacancy(Base):
    __tablename__ = "vacancies"

    id = Column(Integer, primary_key=True, index=True)

    # Employer owner
    employer_id = Column(Integer, nullable=False, index=True)

    title = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    hours_per_week = Column(String(50), nullable=True)
    salary_range = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)

    # Upload/bron metadata (schrijven of uploaden)
    # source_type: "manual" | "upload"
    source_type = Column(String(50), nullable=False, default="manual")

    source_filename = Column(String(255), nullable=True)
    source_storage_key = Column(String(512), nullable=True)      # S3 key / lokale path
    source_content_type = Column(String(100), nullable=True)     # pdf/docx/text/plain

    # Extracted text (voor de AI)
    extracted_text = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )



