"""promotion_requests tabel

Revision ID: 20260324_005
Revises: 20260311_006
Create Date: 2026-03-24
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "20260324_005"
down_revision = "20260311_006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    if "promotion_requests" in inspector.get_table_names():
        return

    op.create_table(
        "promotion_requests",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column(
            "vacancy_id",
            sa.Integer(),
            sa.ForeignKey("vacancies.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "employer_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "platforms",
            sa.String(255),
            nullable=False,
            server_default='["facebook","instagram","google","tiktok","linkedin"]',
        ),
        sa.Column("duration_days", sa.Integer(), nullable=False),
        sa.Column("total_price", sa.Float(), nullable=False),
        sa.Column("status", sa.String(30), nullable=False, server_default="pending_payment"),
        sa.Column("stripe_session_id", sa.String(255), nullable=True),
        sa.Column("stripe_payment_intent_id", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_promotion_requests_vacancy_id", "promotion_requests", ["vacancy_id"])
    op.create_index("ix_promotion_requests_employer_id", "promotion_requests", ["employer_id"])
    op.create_index("ix_promotion_requests_status", "promotion_requests", ["status"])


def downgrade() -> None:
    op.drop_index("ix_promotion_requests_status", "promotion_requests")
    op.drop_index("ix_promotion_requests_employer_id", "promotion_requests")
    op.drop_index("ix_promotion_requests_vacancy_id", "promotion_requests")
    op.drop_table("promotion_requests")
