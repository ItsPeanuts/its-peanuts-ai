from sqlalchemy import text
from sqlalchemy.engine import Engine


def _has_column_postgres(engine: Engine, table: str, column: str) -> bool:
    q = text(
        """
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = :table AND column_name = :column
        LIMIT 1
        """
    )
    with engine.connect() as conn:
        return conn.execute(q, {"table": table, "column": column}).first() is not None


def ensure_schema(engine: Engine) -> None:
    """
    Minimal MVP schema patch:
    - Add candidates.role if missing (older DB)
    """
    dialect = engine.dialect.name

    # Alleen echt nodig voor Postgres (Render)
    if dialect == "postgresql":
        if not _has_column_postgres(engine, "candidates", "role"):
            with engine.begin() as conn:
                conn.execute(
                    text(
                        "ALTER TABLE candidates "
                        "ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'candidate'"
                    )
                )
