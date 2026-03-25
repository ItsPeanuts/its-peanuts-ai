"""LemonSqueezy kolommen toevoegen aan promotion_requests

Revision ID: 20260325_010
Revises: 20260325_009
Create Date: 2026-03-25
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "20260325_010"
down_revision = "20260325_009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col["name"] for col in inspector.get_columns("promotion_requests")]

    if "ls_checkout_id" not in columns:
        op.add_column(
            "promotion_requests",
            sa.Column("ls_checkout_id", sa.String(255), nullable=True),
        )

    if "ls_order_id" not in columns:
        op.add_column(
            "promotion_requests",
            sa.Column("ls_order_id", sa.String(255), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col["name"] for col in inspector.get_columns("promotion_requests")]

    if "ls_order_id" in columns:
        op.drop_column("promotion_requests", "ls_order_id")

    if "ls_checkout_id" in columns:
        op.drop_column("promotion_requests", "ls_checkout_id")
