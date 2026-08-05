"""
Add city, lat, lng, job_alerts columns to users table
and lat, lng columns to vacancies table.

Usage:
    python -m backend.migrations.add_job_alert_columns
"""
import os
import sys

from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set")
    sys.exit(1)

engine = create_engine(DATABASE_URL)

with engine.begin() as conn:
    conn.execute(text("""
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS city VARCHAR(255) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS job_alerts BOOLEAN NOT NULL DEFAULT TRUE
    """))
    conn.execute(text("""
        ALTER TABLE vacancies
        ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION DEFAULT NULL
    """))
    print("OK — job alert columns added to users and vacancies tables.")
