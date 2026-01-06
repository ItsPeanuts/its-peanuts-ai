# backend/models/cv.py
from __future__ import annotations

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship

from backend.models import Base


class CandidateCV(Base):
    __tablename__ = "candidate_cvs"

    id = Column(Integer, primary_key=True, index=True)

    candidate_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    source_filename = Column(String(255), nullable=True)
    source_content_type = Column(String(100), nullable=True)

    extracted_text = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Geen back_populates nodig (dan hoeven we User niet aan te passen)
    candidate = relationship("User", lazy="joined")


