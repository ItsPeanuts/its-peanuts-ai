from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Voor nu SQLite; later kunnen we dit vervangen door een echte Postgres-URL van Render / Supabase
DATABASE_URL = "sqlite:///./its_peanuts_ai.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
