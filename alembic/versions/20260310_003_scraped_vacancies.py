"""scraped_vacancies tabel

Revision ID: d4e5f6a7b8c3
Revises: c3d4e5f6a7b2
Create Date: 2026-03-10
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "d4e5f6a7b8c3"
down_revision = "c3d4e5f6a7b2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    if "scraped_vacancies" in inspector.get_table_names():
        return

    op.create_table(
        "scraped_vacancies",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("company_name", sa.String(500), nullable=True),
        sa.Column("contact_email", sa.String(255), nullable=False),
        sa.Column("location", sa.String(255), nullable=True),
        sa.Column("source_url", sa.String(1000), nullable=True),
        sa.Column("source_name", sa.String(100), nullable=True),
        sa.Column("vacancy_id", sa.Integer(), sa.ForeignKey("vacancies.id", ondelete="SET NULL"), nullable=True),
        sa.Column("employer_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("claim_token", sa.String(64), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("claim_notified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("scraped_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("claimed_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("claim_token"),
    )
    op.create_index("ix_scraped_vacancies_status", "scraped_vacancies", ["status"])
    op.create_index("ix_scraped_vacancies_contact_email", "scraped_vacancies", ["contact_email"])


def downgrade() -> None:
    op.drop_index("ix_scraped_vacancies_contact_email", "scraped_vacancies")
    op.drop_index("ix_scraped_vacancies_status", "scraped_vacancies")
    op.drop_table("scraped_vacancies")
