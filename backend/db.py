from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# DATABASE-URL ophalen
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./its-peanuts-ai.db")

# Engine maken
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

# Sessionmaker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base voor modellen
Base = declarative_base()


# ---- DIT IS WAT ONTBREEKT ----
# Zorgt ervoor dat elke request een database-sessie krijgt
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Tabellen aanmaken als ze nog niet bestaan
def init_db():
    Base.metadata.create_all(bind=engine)


