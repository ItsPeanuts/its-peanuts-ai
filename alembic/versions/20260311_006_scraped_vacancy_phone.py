"""Add contact_phone to scraped_vacancies

Revision ID: 20260311_006
Revises: 20260310_005
Create Date: 2026-03-11
"""
from alembic import op
import sqlalchemy as sa

revision = "20260311_006"
down_revision = "20260310_005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    cols = [row[1] for row in conn.execute(sa.text("PRAGMA table_info(scraped_vacancies)")).fetchall()] \
        if conn.dialect.name == "sqlite" \
        else [row[0] for row in conn.execute(sa.text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='scraped_vacancies'"
        )).fetchall()]

    if "contact_phone" not in cols:
        op.add_column("scraped_vacancies", sa.Column("contact_phone", sa.String(50), nullable=True))


def downgrade() -> None:
    op.drop_column("scraped_vacancies", "contact_phone")
