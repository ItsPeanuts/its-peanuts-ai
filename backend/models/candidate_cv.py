from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime

from backend.database import Base


class CandidateCV(Base):
    __tablename__ = "candidate_cvs"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)

    # We slaan voorlopig de CV-inhoud als tekst op (later kunnen we files/object storage toevoegen)
    text = Column(Text, nullable=True)

    # "upload" of "text"
    source = Column(String(50), default="upload", nullable=False)
    file_name = Column(String(255), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    candidate = relationship("Candidate", back_populates="cvs")

