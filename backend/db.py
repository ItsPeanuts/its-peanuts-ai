from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import DATABASE_URL

# Engine: verbinding met de database
if DATABASE_URL.startswith("sqlite"):
    # Voor SQLite (lokaal bestand)
    engine = create_engine(
        DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    # Voor Postgres / andere databases
    engine = create_engine(DATABASE_URL)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class voor alle modellen
Base = declarative_base()


def init_db():
    """
    Zorgt ervoor dat alle tabellen uit models.py worden aangemaakt.
    """
    from . import models  # belangrijk: zorgt dat de modellen bekend zijn

    Base.metadata.create_all(bind=engine)

