"""wachtwoord reset velden op users

Revision ID: 20260328_015
Revises: 20260328_014
Create Date: 2026-03-28
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "20260328_015"
down_revision = "20260328_014"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)
    cols = [c["name"] for c in inspector.get_columns("users")]

    if "password_reset_token" not in cols:
        op.add_column(
            "users",
            sa.Column("password_reset_token", sa.String(255), nullable=True),
        )
    if "password_reset_expires_at" not in cols:
        op.add_column(
            "users",
            sa.Column("password_reset_expires_at", sa.DateTime(timezone=True), nullable=True),
        )


def downgrade():
    op.drop_column("users", "password_reset_expires_at")
    op.drop_column("users", "password_reset_token")
