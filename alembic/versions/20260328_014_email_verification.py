"""email verificatie velden op users

Revision ID: 20260328_014
Revises: 20260328_013
Create Date: 2026-03-28
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "20260328_014"
down_revision = "20260328_013"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)
    cols = [c["name"] for c in inspector.get_columns("users")]

    if "email_verified" not in cols:
        op.add_column(
            "users",
            sa.Column("email_verified", sa.Boolean(), nullable=False, server_default="1"),
        )
    if "email_verify_token" not in cols:
        op.add_column(
            "users",
            sa.Column("email_verify_token", sa.String(255), nullable=True),
        )


def downgrade():
    op.drop_column("users", "email_verify_token")
    op.drop_column("users", "email_verified")
