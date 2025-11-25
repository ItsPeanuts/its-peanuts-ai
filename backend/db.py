from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Voor nu gebruiken we een simpel lokaal bestand als database (SQLite)
DATABASE_URL = "sqlite:///./its_peanuts_ai.db"

# De 'engine' maakt verbinding met de database
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

# SessionLocal gebruiken we later om met de database te praten
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base is de basis voor al onze datamodellen
Base = declarative_base()


def get_db():
    """Elke keer dat we met de database werken, gebruiken we deze helper."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
