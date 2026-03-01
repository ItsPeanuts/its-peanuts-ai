from __future__ import annotations

from sqlalchemy import Column, Integer, String, Text, DateTime, func, ForeignKey
from sqlalchemy.orm import relationship

from backend.models.base import Base


class RecruiterChatMessage(Base):
    """
    Chatberichten tussen de AI Recruiter (Lisa) en de kandidaat,
    gekoppeld aan een specifieke sollicitatie.
    """
    __tablename__ = "recruiter_chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(
        Integer,
        ForeignKey("applications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # "recruiter" = AI Lisa | "candidate" = kandidaat
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
