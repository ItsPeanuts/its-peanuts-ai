"""
Add terms_accepted_at and terms_version columns to users table.
Run once on the production database.

Usage:
    python -m backend.migrations.add_terms_columns
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
        ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS terms_version VARCHAR(20) DEFAULT NULL
    """))
    print("OK — columns terms_accepted_at and terms_version added to users table.")
