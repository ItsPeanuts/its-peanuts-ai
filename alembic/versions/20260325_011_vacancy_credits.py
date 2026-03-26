"""vacancy_credits kolom aan users

Revision ID: 20260325_011
Revises: 20260325_010
Create Date: 2026-03-25

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "20260325_011"
down_revision = "20260325_010"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)
    cols = [c["name"] for c in inspector.get_columns("users")]
    if "vacancy_credits" not in cols:
        op.add_column(
            "users",
            sa.Column("vacancy_credits", sa.Integer(), nullable=False, server_default="0"),
        )


def downgrade():
    op.drop_column("users", "vacancy_credits")
