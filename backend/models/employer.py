# backend/models/employer.py

from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.sql import func

from backend.database import Base


class Employer(Base):
    __tablename__ = "employers"

    id = Column(Integer, primary_key=True, index=True)

    # Koppeling met Candidate user record (de employer user die inlogt)
    # In fase B houden we dit simpel: opslaan als integer (geen FK hard enforce)
    user_id = Column(Integer, nullable=False, index=True)

    company_name = Column(String(255), nullable=True)
    website = Column(String(255), nullable=True)
    industry = Column(String(255), nullable=True)

    # optioneel later: adres, kvk, btw, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
