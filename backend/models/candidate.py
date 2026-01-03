from sqlalchemy import Column, Integer, String, DateTime, func
from backend.database import Base


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)

    # "candidate" of "employer"
    role = Column(String(50), nullable=False, server_default="candidate")

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

