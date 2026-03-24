"""vacancy status kolom (concept/actief/offline)

Revision ID: 20260324_006
Revises: 20260324_005
Create Date: 2026-03-24
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect, text

revision = "20260324_006"
down_revision = "20260324_005"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [c["name"] for c in inspector.get_columns("vacancies")]

    if "status" not in columns:
        op.add_column(
            "vacancies",
            sa.Column("status", sa.String(20), nullable=False, server_default="concept"),
        )
        # Bestaande vacatures als actief markeren zodat ze zichtbaar blijven
        bind.execute(text("UPDATE vacancies SET status = 'actief' WHERE status = 'concept'"))


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [c["name"] for c in inspector.get_columns("vacancies")]
    if "status" in columns:
        op.drop_column("vacancies", "status")
