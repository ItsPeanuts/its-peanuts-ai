"""Add preferred_language column to users table."""

import os
import sqlalchemy as sa

def run():
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL not set")
    engine = sa.create_engine(url)
    with engine.begin() as conn:
        conn.execute(sa.text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT NULL"
        ))
    print("OK — preferred_language column added to users table.")

if __name__ == "__main__":
    run()
