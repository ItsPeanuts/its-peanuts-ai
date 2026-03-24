from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func

from backend.models.base import Base


class SalesLead(Base):
    """Gegenereerde sales outreach voor een potentiële werkgever-klant."""
    __tablename__ = "sales_leads"

    id = Column(Integer, primary_key=True, index=True)

    # Target info
    company_name = Column(String(255), nullable=False)
    sector = Column(String(100))
    company_size = Column(String(20))       # "small" | "medium" | "large"
    contact_name = Column(String(255))
    contact_role = Column(String(255))
    channel = Column(String(20))            # "email" | "linkedin" | "phone_script"
    language = Column(String(5), default="nl")
    custom_notes = Column(Text)

    # Gegenereerde content
    subject = Column(String(255))           # alleen bij channel=email
    message = Column(Text)
    follow_up = Column(Text)
    key_usps = Column(Text)                 # JSON list van strings

    # Status tracking
    status = Column(String(20), default="generated")
    # generated | sent | replied | converted | archived
    internal_notes = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
