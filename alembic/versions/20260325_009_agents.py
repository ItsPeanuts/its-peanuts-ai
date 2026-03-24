"""Sales leads + marketing content tabellen voor admin AI-agents

Revision ID: 20260325_009
Revises: 20260325_007
Create Date: 2026-03-25
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "20260325_009"
down_revision = "20260325_007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = inspector.get_table_names()

    # ── sales_leads ───────────────────────────────────────────────────────────
    if "sales_leads" not in tables:
        op.create_table(
            "sales_leads",
            sa.Column("id",             sa.Integer(),    nullable=False),
            sa.Column("company_name",   sa.String(255),  nullable=False),
            sa.Column("sector",         sa.String(100),  nullable=True),
            sa.Column("company_size",   sa.String(20),   nullable=True),
            sa.Column("contact_name",   sa.String(255),  nullable=True),
            sa.Column("contact_role",   sa.String(255),  nullable=True),
            sa.Column("channel",        sa.String(20),   nullable=True),
            sa.Column("language",       sa.String(5),    nullable=True, server_default="nl"),
            sa.Column("custom_notes",   sa.Text(),       nullable=True),
            sa.Column("subject",        sa.String(255),  nullable=True),
            sa.Column("message",        sa.Text(),       nullable=True),
            sa.Column("follow_up",      sa.Text(),       nullable=True),
            sa.Column("key_usps",       sa.Text(),       nullable=True),
            sa.Column("status",         sa.String(20),   nullable=True, server_default="generated"),
            sa.Column("internal_notes", sa.Text(),       nullable=True),
            sa.Column("created_at",     sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_sales_leads_id", "sales_leads", ["id"])

    # ── marketing_content ─────────────────────────────────────────────────────
    if "marketing_content" not in tables:
        op.create_table(
            "marketing_content",
            sa.Column("id",           sa.Integer(),   nullable=False),
            sa.Column("platform",     sa.String(20),  nullable=True),
            sa.Column("audience",     sa.String(20),  nullable=True),
            sa.Column("topic",        sa.String(500), nullable=True),
            sa.Column("tone",         sa.String(20),  nullable=True),
            sa.Column("language",     sa.String(5),   nullable=True, server_default="nl"),
            sa.Column("posts",        sa.Text(),      nullable=True),
            sa.Column("calendar_tip", sa.String(500), nullable=True),
            sa.Column("status",       sa.String(20),  nullable=True, server_default="draft"),
            sa.Column("created_at",   sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_marketing_content_id", "marketing_content", ["id"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = inspector.get_table_names()

    if "marketing_content" in tables:
        op.drop_index("ix_marketing_content_id", table_name="marketing_content")
        op.drop_table("marketing_content")

    if "sales_leads" in tables:
        op.drop_index("ix_sales_leads_id", table_name="sales_leads")
        op.drop_table("sales_leads")
