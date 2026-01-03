from sqlalchemy import Column, Integer, String, LargeBinary, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.database import Base


class CandidateCV(Base):
    __tablename__ = "candidate_cvs"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), index=True, nullable=False)

    filename = Column(String(255), nullable=False)
    content_type = Column(String(100), nullable=False)
    file_bytes = Column(LargeBinary, nullable=False)  # stored in DB (simpler for MVP)
    extracted_text = Column(Text, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    candidate = relationship("Candidate")


