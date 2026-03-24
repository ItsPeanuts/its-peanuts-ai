from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func

from backend.models.base import Base


class MarketingContent(Base):
    """Gegenereerde social media content voor VorzaIQ marketing."""
    __tablename__ = "marketing_content"

    id = Column(Integer, primary_key=True, index=True)

    # Input parameters
    platform = Column(String(20))           # "linkedin" | "instagram" | "twitter" | "facebook"
    audience = Column(String(20))           # "employers" | "candidates" | "both"
    topic = Column(String(500))
    tone = Column(String(20))               # "professional" | "casual" | "inspiring"
    language = Column(String(5), default="nl")

    # Gegenereerde content
    posts = Column(Text)                    # JSON array: [{content, hashtags, image_prompt}]
    calendar_tip = Column(String(500))

    # Status tracking
    status = Column(String(20), default="draft")
    # draft | scheduled | published

    created_at = Column(DateTime(timezone=True), server_default=func.now())
