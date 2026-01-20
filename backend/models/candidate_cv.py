from __future__ import annotations

from sqlalchemy import Column, Integer, String, Text, DateTime, func, ForeignKey
from sqlalchemy.orm import relationship

from backend.models.base import Base


class CandidateCV(Base):
    __tablename__ = "candidate_cvs"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    source_filename = Column(String(255), nullable=True)
    source_content_type = Column(String(100), nullable=True)

    extracted_text = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    candidate = relationship("User", lazy="joined")


