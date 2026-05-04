"""proposed_dates kolom op interview_sessions

Revision ID: 20260504_017
Revises: 20260425_016
Create Date: 2026-05-04
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "20260504_017"
down_revision = "20260425_016"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)
    cols = [c["name"] for c in inspector.get_columns("interview_sessions")]

    if "proposed_dates" not in cols:
        op.add_column(
            "interview_sessions",
            sa.Column("proposed_dates", sa.Text(), nullable=True),
        )


def downgrade():
    op.drop_column("interview_sessions", "proposed_dates")
