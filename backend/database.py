import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# If DATABASE_URL is missing, fall back to local sqlite so the service can boot.
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

if not DATABASE_URL:
    # Works anywhere, including Render. Data is ephemeral on Render, but the API boots.
    DATABASE_URL = "sqlite:///./app.db"

# SQLite needs special connect args
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()



