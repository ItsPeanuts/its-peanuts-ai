"""baseline — markeert de initiële staat; tabellen aangemaakt via create_all

Revision ID: a1b2c3d4e5f0
Revises:
Create Date: 2026-03-03 00:00:00.000000
"""
from alembic import op

revision = "a1b2c3d4e5f0"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Tabellen zijn aangemaakt door SQLAlchemy Base.metadata.create_all()
    # Deze migratie dient als startpunt voor toekomstige schema-wijzigingen.
    pass


def downgrade() -> None:
    pass
