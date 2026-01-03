# backend/models/candidate.py
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from backend.database import Base


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)

    # "candidate" of "employer"
    role = Column(String(50), nullable=False, default="candidate")

    vacancies = relationship("Vacancy", back_populates="employer", cascade="all, delete-orphan")


