from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from backend.database import Base


class CandidateCV(Base):
    __tablename__ = "candidate_cvs"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)

    text = Column(Text, nullable=False)

    original_filename = Column(String(255), nullable=True)
    original_type = Column(String(50), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

