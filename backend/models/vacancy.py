from sqlalchemy import Column, Integer, String, LargeBinary, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.database import Base


class Vacancy(Base):
    __tablename__ = "vacancies"

    id = Column(Integer, primary_key=True, index=True)
    owner_candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), index=True, nullable=False)

    title = Column(String(200), nullable=False)
    source_type = Column(String(10), nullable=False)  # text|pdf|docx
    filename = Column(String(255), nullable=True)
    file_bytes = Column(LargeBinary, nullable=True)  # only for upload
    extracted_text = Column(Text, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    owner = relationship("Candidate")
    applications = relationship("Application", back_populates="vacancy", cascade="all, delete-orphan")

