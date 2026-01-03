from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from backend.database import Base


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    employer_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)

    # optioneel
    location = Column(String(255), nullable=True)
    employment_type = Column(String(100), nullable=True)

    # "manual" of "upload"
    source = Column(String(50), nullable=False, server_default="manual")

    original_filename = Column(String(255), nullable=True)
    original_type = Column(String(50), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
