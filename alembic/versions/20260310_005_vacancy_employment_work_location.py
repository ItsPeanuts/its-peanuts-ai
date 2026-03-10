"""Add employment_type + work_location to vacancies

Revision ID: 20260310_005
Revises: 20260310_004
Create Date: 2026-03-10
"""
from alembic import op
import sqlalchemy as sa

revision = "20260310_005"
down_revision = "20260310_004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c["name"] for c in inspector.get_columns("vacancies")]

    if "employment_type" not in columns:
        op.add_column("vacancies", sa.Column("employment_type", sa.String(50), nullable=True))

    if "work_location" not in columns:
        op.add_column("vacancies", sa.Column("work_location", sa.String(50), nullable=True))


def downgrade() -> None:
    op.drop_column("vacancies", "work_location")
    op.drop_column("vacancies", "employment_type")
