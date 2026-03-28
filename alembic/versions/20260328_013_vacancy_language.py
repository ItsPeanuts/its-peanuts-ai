"""language kolom aan vacancies

Revision ID: 20260328_013
Revises: 20260325_012
Create Date: 2026-03-28

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "20260328_013"
down_revision = "20260325_012"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)
    cols = [c["name"] for c in inspector.get_columns("vacancies")]
    if "language" not in cols:
        op.add_column("vacancies", sa.Column("language", sa.String(5), nullable=True))


def downgrade():
    op.drop_column("vacancies", "language")
