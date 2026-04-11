from datetime import datetime
from sqlalchemy import Column, Integer, String, Date, DateTime, UniqueConstraint
from backend.models.base import Base


class VisitorLog(Base):
    __tablename__ = "visitor_logs"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, nullable=False)   # anonymous browser session token
    date = Column(Date, nullable=False)            # UTC date of visit
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (UniqueConstraint("session_id", "date", name="uq_visitor_session_date"),)
