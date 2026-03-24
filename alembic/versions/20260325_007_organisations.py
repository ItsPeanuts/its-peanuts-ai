"""Organisaties: multi-user werkgever support

Revision ID: 20260325_007
Revises: 20260324_006
Create Date: 2026-03-25
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect, text

revision = "20260325_007"
down_revision = "20260324_006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = inspector.get_table_names()

    # ── Maak organisations tabel aan ────────────────────────────────────────
    if "organisations" not in tables:
        op.create_table(
            "organisations",
            sa.Column("id",         sa.Integer(),     nullable=False),
            sa.Column("name",       sa.String(255),   nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_organisations_id", "organisations", ["id"])

    # ── Voeg org_id kolom toe aan users ─────────────────────────────────────
    if "users" in tables:
        existing_cols = [c["name"] for c in inspector.get_columns("users")]
        if "org_id" not in existing_cols:
            op.add_column(
                "users",
                sa.Column("org_id", sa.Integer(), nullable=True),
            )
            # FK constraint (SQLite ondersteunt geen ALTER TABLE ADD CONSTRAINT, dus alleen voor PostgreSQL)
            try:
                op.create_foreign_key(
                    "fk_users_org_id",
                    "users", "organisations",
                    ["org_id"], ["id"],
                    ondelete="SET NULL",
                )
            except Exception:
                pass  # SQLite: FK's worden genegeerd, werkt toch
            op.create_index("ix_users_org_id", "users", ["org_id"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if "users" in inspector.get_table_names():
        existing_cols = [c["name"] for c in inspector.get_columns("users")]
        if "org_id" in existing_cols:
            try:
                op.drop_index("ix_users_org_id", table_name="users")
            except Exception:
                pass
            op.drop_column("users", "org_id")

    if "organisations" in inspector.get_table_names():
        op.drop_index("ix_organisations_id", table_name="organisations")
        op.drop_table("organisations")
