"""virtual_interview_sessions tabel

Revision ID: b2c3d4e5f6a1
Revises: a1b2c3d4e5f0
Create Date: 2026-03-04
"""
from alembic import op
import sqlalchemy as sa

revision = "b2c3d4e5f6a1"
down_revision = "a1b2c3d4e5f0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "virtual_interview_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("application_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("transcript", sa.Text(), nullable=True),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.Column("score_summary", sa.Text(), nullable=True),
        sa.Column("followup_interview_id", sa.Integer(), nullable=True),
        sa.Column("did_stream_id", sa.String(255), nullable=True),
        sa.Column("did_session_id", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("application_id"),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["followup_interview_id"], ["interview_sessions.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_virtual_interview_sessions_id", "virtual_interview_sessions", ["id"])
    op.create_index("ix_virtual_interview_sessions_application_id", "virtual_interview_sessions", ["application_id"])


def downgrade() -> None:
    op.drop_index("ix_virtual_interview_sessions_application_id", "virtual_interview_sessions")
    op.drop_index("ix_virtual_interview_sessions_id", "virtual_interview_sessions")
    op.drop_table("virtual_interview_sessions")
