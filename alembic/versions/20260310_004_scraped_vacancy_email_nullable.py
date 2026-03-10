"""scraped_vacancies.contact_email nullable maken

Revision ID: e5f6a7b8c9d4
Revises: d4e5f6a7b8c3
Create Date: 2026-03-10
"""

from alembic import op
import sqlalchemy as sa

revision = "e5f6a7b8c9d4"
down_revision = "d4e5f6a7b8c3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("scraped_vacancies") as batch_op:
        batch_op.alter_column(
            "contact_email",
            existing_type=sa.String(255),
            nullable=True,
        )


def downgrade() -> None:
    # Zet lege waarden eerst op placeholder zodat NOT NULL niet faalt
    op.execute("UPDATE scraped_vacancies SET contact_email = 'unknown@unknown.nl' WHERE contact_email IS NULL")
    with op.batch_alter_table("scraped_vacancies") as batch_op:
        batch_op.alter_column(
            "contact_email",
            existing_type=sa.String(255),
            nullable=False,
        )
