# backend/models/candidate.py

from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.sql import func

from backend.database import Base


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)

    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=True)

    # Auth
    hashed_password = Column(String(255), nullable=False)

    # Role: "candidate" of "employer" (voor simpele fase B)
    role = Column(String(50), nullable=False, default="candidate")

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


