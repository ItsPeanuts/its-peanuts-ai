from sqlalchemy import Column, Integer, String, Text, DateTime, func

from backend.database import Base


class Vacancy(Base):
    __tablename__ = "vacancies"

    id = Column(Integer, primary_key=True, index=True)
    employer_id = Column(Integer, nullable=True, index=True)  # later koppelen aan employer user
    title = Column(String(255), nullable=False)
    raw_text = Column(Text, nullable=False)          # originele tekst (geschreven of uit upload)
    extracted_text = Column(Text, nullable=True)     # dezelfde tekst, maar "schoon" voor AI
    source = Column(String(50), nullable=False, default="text")  # text|upload
    file_name = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
