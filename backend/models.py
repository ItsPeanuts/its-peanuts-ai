from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func

from backend.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)

    # ✅ DB kolom heet hashed_password
    # ✅ Code gebruikt overal user.password_hash
    password_hash = Column("hashed_password", String, nullable=False)

    role = Column(String, nullable=False, default="candidate")
    plan = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)







