"""vacancy interview_type kolom

Revision ID: c3d4e5f6a7b2
Revises: b2c3d4e5f6a1
Create Date: 2026-03-04
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "c3d4e5f6a7b2"
down_revision = "b2c3d4e5f6a1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Idempotent: sla over als kolom al bestaat
    conn = op.get_bind()
    inspector = inspect(conn)
    cols = [c["name"] for c in inspector.get_columns("vacancies")]
    if "interview_type" in cols:
        return

    op.add_column(
        "vacancies",
        sa.Column(
            "interview_type",
            sa.String(20),
            nullable=False,
            server_default="both",
        ),
    )


def downgrade() -> None:
    op.drop_column("vacancies", "interview_type")
