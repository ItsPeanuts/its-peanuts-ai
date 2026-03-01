from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func

from backend.models.base import Base


class CRMSync(Base):
    """
    Bijhoudt de synchronisatiestatus van kandidaten/sollicitaties naar een extern CRM
    (HubSpot, Salesforce, Pipedrive, of een custom systeem).

    Elke rij vertegenwoordigt één sync-record per kandidaat per CRM-provider.
    """
    __tablename__ = "crm_syncs"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    application_id = Column(
        Integer,
        ForeignKey("applications.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # Welk CRM systeem
    crm_provider = Column(String(50), nullable=False)  # "hubspot" | "salesforce" | "pipedrive" | "custom"

    # IDs in het externe CRM
    crm_contact_id = Column(String(500), nullable=True)   # HubSpot contact ID
    crm_deal_id = Column(String(500), nullable=True)      # HubSpot deal / Salesforce opportunity
    crm_activity_id = Column(String(500), nullable=True)  # Activiteit (interview gepland)

    # Sync status & foutmelding
    sync_status = Column(String(20), default="pending")   # "pending" | "synced" | "error"
    sync_error = Column(Text, nullable=True)

    # Ruwe response JSON van het CRM (handig voor debugging)
    raw_response = Column(Text, nullable=True)

    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
