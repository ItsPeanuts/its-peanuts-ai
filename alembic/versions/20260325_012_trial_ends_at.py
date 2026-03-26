"""trial_ends_at kolom aan users

Revision ID: 20260325_012
Revises: 20260325_011
Create Date: 2026-03-25

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "20260325_012"
down_revision = "20260325_011"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)
    cols = [c["name"] for c in inspector.get_columns("users")]
    if "trial_ends_at" not in cols:
        op.add_column(
            "users",
            sa.Column("trial_ends_at", sa.DateTime(timezone=True), nullable=True),
        )
        # Bestaande employers: trial = created_at + 30 dagen
        op.execute("""
            UPDATE users
            SET trial_ends_at = created_at + INTERVAL '30 days'
            WHERE role = 'employer' AND trial_ends_at IS NULL
        """)


def downgrade():
    op.drop_column("users", "trial_ends_at")
