from __future__ import annotations

from sqlalchemy import Column, Integer, String, Text, DateTime, Float, func, ForeignKey
from sqlalchemy.orm import relationship

from backend.models.base import Base


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)

    # scheduled | in_progress | completed | cancelled
    status = Column(String(50), nullable=False, default="scheduled", index=True)

    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # interview type: ai_phone | ai_video | teams_live
    interview_type = Column(String(50), nullable=False, default="ai_phone")

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    application = relationship("Application", lazy="joined")
    competency_results = relationship("CompetencyResult", back_populates="session", cascade="all, delete-orphan")
    transcripts = relationship("Transcript", back_populates="session", cascade="all, delete-orphan")


class Transcript(Base):
    __tablename__ = "transcripts"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False, index=True)

    # speaker: ai | candidate
    speaker = Column(String(50), nullable=False)
    content = Column(Text, nullable=False)
    timestamp_offset = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    session = relationship("InterviewSession", back_populates="transcripts")


class CompetencyResult(Base):
    __tablename__ = "competency_results"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False, index=True)

    competency_name = Column(String(255), nullable=False)
    score = Column(Float, nullable=True)
    confidence = Column(Float, nullable=True)
    evidence = Column(Text, nullable=True)
    risk_flags = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    session = relationship("InterviewSession", back_populates="competency_results")
