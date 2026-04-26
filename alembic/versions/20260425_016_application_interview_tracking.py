"""interview_completed_at en employer_reminder_count op applications

Revision ID: 20260425_016
Revises: 20260328_015
Create Date: 2026-04-25
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "20260425_016"
down_revision = "20260328_015"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)
    cols = [c["name"] for c in inspector.get_columns("applications")]

    if "interview_completed_at" not in cols:
        op.add_column(
            "applications",
            sa.Column("interview_completed_at", sa.DateTime(timezone=True), nullable=True),
        )
    if "employer_reminder_count" not in cols:
        op.add_column(
            "applications",
            sa.Column("employer_reminder_count", sa.Integer(), nullable=False, server_default="0"),
        )


def downgrade():
    op.drop_column("applications", "employer_reminder_count")
    op.drop_column("applications", "interview_completed_at")
