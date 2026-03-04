from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func

from backend.models.base import Base


class VirtualInterviewSession(Base):
    """
    Een AI-avatar video interview sessie gekoppeld aan een sollicitatie.
    De avatar (D-ID) neemt het interview af via WebRTC in de browser.
    """
    __tablename__ = "virtual_interview_sessions"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(
        Integer,
        ForeignKey("applications.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # Status: "pending" | "in_progress" | "completed" | "abandoned"
    status = Column(String(20), default="pending", nullable=False)

    # Volledig gesprekstranscript als JSON: [{role, content, timestamp}]
    transcript = Column(Text, nullable=True)

    # AI score na afloop (0-100)
    score = Column(Integer, nullable=True)
    score_summary = Column(Text, nullable=True)

    # Automatisch geplande vervolgafspraak met werkgever
    followup_interview_id = Column(
        Integer,
        ForeignKey("interview_sessions.id", ondelete="SET NULL"),
        nullable=True,
    )

    # D-ID stream ID voor WebRTC sessie management
    did_stream_id = Column(String(255), nullable=True)
    did_session_id = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
