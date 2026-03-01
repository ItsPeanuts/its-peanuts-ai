from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func

from backend.models.base import Base


class InterviewSession(Base):
    """
    Een gepland interview (Teams, telefoon of live) gekoppeld aan een sollicitatie.
    Bevat de Teams meeting link zodra die via Microsoft Graph is aangemaakt.
    """
    __tablename__ = "interview_sessions"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(
        Integer,
        ForeignKey("applications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Wanneer & hoe lang
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Integer, default=30)

    # Type: "teams" | "phone" | "in_person"
    interview_type = Column(String(20), default="teams", nullable=False)

    # Microsoft Teams meeting details (ingevuld na Graph API call)
    teams_meeting_id = Column(String(500), nullable=True)   # Graph online meeting id
    teams_join_url = Column(Text, nullable=True)             # Kandidaat join link
    teams_organizer_email = Column(String(255), nullable=True)

    # Status: "scheduled" | "completed" | "cancelled" | "rescheduled"
    status = Column(String(20), default="scheduled", nullable=False)

    # Optionele notities van de werkgever
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
