from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import synonym

from backend.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)

    # ✅ DB column is hashed_password (NOT NULL)
    hashed_password = Column(String, nullable=False)

    # ✅ Backwards-compatible alias: existing code can keep using user.password_hash
    password_hash = synonym("hashed_password")

    role = Column(String, nullable=False, default="candidate")
    plan = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)






