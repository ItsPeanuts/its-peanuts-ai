from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime

from backend.database import Base


class Vacancy(Base):
    __tablename__ = "vacancies"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String(255), nullable=False)
    text = Column(Text, nullable=True)

    # "upload" of "text"
    source = Column(String(50), default="text", nullable=False)
    file_name = Column(String(255), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
