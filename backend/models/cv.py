# backend/models/cv.py
from __future__ import annotations

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship

from backend.models import Base


class CandidateCV(Base):
    __tablename__ = "candidate_cvs"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    filename = Column(String(255), nullable=True)
    content_type = Column(String(100), nullable=True)

    # Optioneel voor later (S3 / storage)
    storage_key = Column(String(255), nullable=True)

    extracted_text = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", lazy="joined")



