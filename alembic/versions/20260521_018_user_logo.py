"""Add logo_key column to users table

Revision ID: 20260521_018
Revises: 20260504_017
Create Date: 2026-05-21
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "20260521_018"
down_revision = "20260504_017"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)
    cols = [c["name"] for c in inspector.get_columns("users")]

    if "logo_key" not in cols:
        op.add_column(
            "users",
            sa.Column("logo_key", sa.String(255), nullable=True),
        )


def downgrade():
    op.drop_column("users", "logo_key")
