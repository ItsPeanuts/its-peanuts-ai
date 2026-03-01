"""
CRM Integratie — HubSpot (primair) + uitbreidbaar naar Salesforce / Pipedrive

Synchroniseert kandidaten, sollicitaties en activiteiten naar een extern CRM systeem.
Ondersteunt ook het aanmaken van CRM-deals, taken en afspraken.

Vereisten (environment variables):
  CRM_PROVIDER    - "hubspot" | "salesforce" | "pipedrive" | "custom" (default: hubspot)
  CRM_API_KEY     - HubSpot Private App token (of API sleutel voor andere providers)
  CRM_PORTAL_ID   - HubSpot Portal/Account ID (optioneel, voor diepere integratie)

HubSpot inrichten:
  1. Ga naar https://app.hubspot.com/private-apps
  2. Maak een Private App aan
  3. Geef scopes: crm.objects.contacts.write, crm.objects.deals.write, crm.objects.notes.write
  4. Kopieer het token → CRM_API_KEY in Render

Salesforce inrichten:
  1. Connected App aanmaken in Setup → App Manager
  2. OAuth scopes: api, refresh_token
  3. Consumer Key = CRM_API_KEY, Consumer Secret = CRM_API_SECRET
"""

import json
import os
from datetime import datetime, timezone
from typing import Optional, List

import requests
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.db import get_db
from backend import models
from backend.routers.auth import get_current_user, require_role

router = APIRouter(prefix="/crm", tags=["crm"])


# ── CRM credentials ───────────────────────────────────────────────────────────

CRM_PROVIDER = os.getenv("CRM_PROVIDER", "hubspot")
CRM_API_KEY = os.getenv("CRM_API_KEY", "")
CRM_PORTAL_ID = os.getenv("CRM_PORTAL_ID", "")


# ── Schemas ───────────────────────────────────────────────────────────────────

class CRMSyncOut(BaseModel):
    id: int
    candidate_id: int
    application_id: Optional[int] = None
    crm_provider: str
    crm_contact_id: Optional[str] = None
    crm_deal_id: Optional[str] = None
    crm_activity_id: Optional[str] = None
    sync_status: str
    sync_error: Optional[str] = None
    last_synced_at: Optional[str] = None

    class Config:
        from_attributes = True


class CRMStatusResponse(BaseModel):
    configured: bool
    provider: str
    message: str


class LogActivityIn(BaseModel):
    application_id: int
    activity_type: str   # "interview_scheduled" | "status_changed" | "chat_completed" | "note"
    description: str
    scheduled_at: Optional[str] = None  # ISO 8601, voor interviews


# ── HubSpot helpers ───────────────────────────────────────────────────────────

def _hubspot_headers() -> dict:
    if not CRM_API_KEY:
        raise HTTPException(
            status_code=503,
            detail=(
                "CRM niet geconfigureerd. "
                "Stel CRM_API_KEY in als omgevingsvariabele (HubSpot Private App token)."
            ),
        )
    return {
        "Authorization": f"Bearer {CRM_API_KEY}",
        "Content-Type": "application/json",
    }


def _hubspot_upsert_contact(candidate: models.User) -> str:
    """
    Maak een HubSpot contact aan of update een bestaand contact op basis van e-mail.
    Geeft het HubSpot contact ID terug.
    """
    name_parts = candidate.full_name.split(" ", 1)
    firstname = name_parts[0]
    lastname = name_parts[1] if len(name_parts) > 1 else ""

    # Zoek bestaand contact op e-mail
    search_url = "https://api.hubapi.com/crm/v3/objects/contacts/search"
    search_body = {
        "filterGroups": [{"filters": [{"propertyName": "email", "operator": "EQ", "value": candidate.email}]}],
        "properties": ["email", "firstname", "lastname"],
    }
    search_resp = requests.post(search_url, json=search_body, headers=_hubspot_headers(), timeout=10)

    if search_resp.ok and search_resp.json().get("total", 0) > 0:
        contact_id = search_resp.json()["results"][0]["id"]
        # Update bestaande contact
        patch_url = f"https://api.hubapi.com/crm/v3/objects/contacts/{contact_id}"
        requests.patch(
            patch_url,
            json={"properties": {"firstname": firstname, "lastname": lastname}},
            headers=_hubspot_headers(),
            timeout=10,
        )
        return contact_id

    # Nieuw contact aanmaken
    create_url = "https://api.hubapi.com/crm/v3/objects/contacts"
    create_body = {
        "properties": {
            "email": candidate.email,
            "firstname": firstname,
            "lastname": lastname,
            "hs_lead_status": "IN_PROGRESS",
        }
    }
    create_resp = requests.post(create_url, json=create_body, headers=_hubspot_headers(), timeout=10)
    if not create_resp.ok:
        raise HTTPException(status_code=502, detail=f"HubSpot contact aanmaken mislukt: {create_resp.text}")
    return create_resp.json()["id"]


def _hubspot_create_deal(contact_id: str, vacancy: models.Vacancy, application: models.Application) -> str:
    """
    Maak een HubSpot deal aan voor de sollicitatie.
    Geeft het deal ID terug.
    """
    deals_url = "https://api.hubapi.com/crm/v3/objects/deals"
    deal_body = {
        "properties": {
            "dealname": f"Sollicitatie: {vacancy.title}",
            "dealstage": "presentationscheduled",  # aanpassen aan jouw pipeline
            "pipeline": "default",
            "amount": "",
            "closedate": "",
        },
        "associations": [
            {
                "to": {"id": contact_id},
                "types": [{"associationCategory": "HUBSPOT_DEFINED", "associationTypeId": 3}],
            }
        ],
    }
    deal_resp = requests.post(deals_url, json=deal_body, headers=_hubspot_headers(), timeout=10)
    if not deal_resp.ok:
        raise HTTPException(status_code=502, detail=f"HubSpot deal aanmaken mislukt: {deal_resp.text}")
    return deal_resp.json()["id"]


def _hubspot_log_note(contact_id: str, deal_id: Optional[str], note_body: str) -> str:
    """Log een notitie/activiteit in HubSpot."""
    notes_url = "https://api.hubapi.com/crm/v3/objects/notes"
    associations = [
        {
            "to": {"id": contact_id},
            "types": [{"associationCategory": "HUBSPOT_DEFINED", "associationTypeId": 202}],
        }
    ]
    if deal_id:
        associations.append({
            "to": {"id": deal_id},
            "types": [{"associationCategory": "HUBSPOT_DEFINED", "associationTypeId": 214}],
        })
    note_data = {
        "properties": {
            "hs_note_body": note_body,
            "hs_timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        },
        "associations": associations,
    }
    note_resp = requests.post(notes_url, json=note_data, headers=_hubspot_headers(), timeout=10)
    if not note_resp.ok:
        return ""
    return note_resp.json().get("id", "")


def _hubspot_create_meeting(contact_id: str, title: str, scheduled_at_iso: str, duration_ms: int = 1800000) -> str:
    """
    Maak een meeting/engagement aan in HubSpot.
    Geeft de engagement ID terug.
    """
    meetings_url = "https://api.hubapi.com/engagements/v1/engagements"
    scheduled_ts = int(datetime.fromisoformat(scheduled_at_iso).timestamp() * 1000)
    engagement_body = {
        "engagement": {
            "active": True,
            "type": "MEETING",
            "timestamp": scheduled_ts,
        },
        "associations": {
            "contactIds": [int(contact_id)],
        },
        "metadata": {
            "title": title,
            "startTime": scheduled_ts,
            "endTime": scheduled_ts + duration_ms,
            "body": f"Gesprek ingepland via It's Peanuts AI — {title}",
        },
    }
    resp = requests.post(meetings_url, json=engagement_body, headers=_hubspot_headers(), timeout=10)
    if not resp.ok:
        return ""
    return str(resp.json().get("engagement", {}).get("id", ""))


# ── Salesforce helpers (stub — uitbreidbaar) ──────────────────────────────────

def _salesforce_upsert_lead(candidate: models.User, vacancy_title: str) -> str:
    """
    Stub voor Salesforce lead aanmaken.
    Vereist: OAuth token via CRM_API_KEY (Salesforce access token).
    """
    # TODO: Salesforce REST API endpoint
    # POST https://{instance}.salesforce.com/services/data/v58.0/sobjects/Lead
    raise HTTPException(
        status_code=501,
        detail="Salesforce integratie is beschikbaar als add-on. Neem contact op met It's Peanuts AI.",
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/status", response_model=CRMStatusResponse)
def crm_status():
    """Controleer of het CRM geconfigureerd is."""
    configured = bool(CRM_API_KEY)
    return CRMStatusResponse(
        configured=configured,
        provider=CRM_PROVIDER,
        message=(
            f"{CRM_PROVIDER.title()} CRM is geconfigureerd."
            if configured
            else (
                f"CRM is NIET geconfigureerd. "
                f"Stel CRM_PROVIDER en CRM_API_KEY in via Render environment variables. "
                f"Ondersteunde providers: hubspot, salesforce, pipedrive."
            )
        ),
    )


@router.post("/sync/{candidate_id}", response_model=CRMSyncOut)
def sync_candidate_to_crm(
    candidate_id: int,
    application_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Synchroniseer een kandidaat (en optioneel een sollicitatie) naar het CRM.
    Maakt contact + deal aan in HubSpot.
    """
    require_role(current_user, "employer")

    candidate = db.query(models.User).filter(models.User.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Kandidaat niet gevonden")

    # Controleer of er al een sync record is
    existing_sync = (
        db.query(models.CRMSync)
        .filter(
            models.CRMSync.candidate_id == candidate_id,
            models.CRMSync.crm_provider == CRM_PROVIDER,
        )
        .first()
    )

    sync_record = existing_sync or models.CRMSync(
        candidate_id=candidate_id,
        application_id=application_id,
        crm_provider=CRM_PROVIDER,
    )

    vacancy = None
    if application_id:
        app = db.query(models.Application).filter(models.Application.id == application_id).first()
        if app:
            vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == app.vacancy_id).first()

    try:
        if CRM_PROVIDER == "hubspot":
            contact_id = _hubspot_upsert_contact(candidate)
            sync_record.crm_contact_id = contact_id

            if vacancy and not sync_record.crm_deal_id:
                app = db.query(models.Application).filter(models.Application.id == application_id).first()
                deal_id = _hubspot_create_deal(contact_id, vacancy, app)
                sync_record.crm_deal_id = deal_id

        elif CRM_PROVIDER == "salesforce":
            _salesforce_upsert_lead(candidate, vacancy.title if vacancy else "")

        else:
            raise HTTPException(
                status_code=501,
                detail=f"Provider '{CRM_PROVIDER}' is nog niet geïmplementeerd.",
            )

        sync_record.sync_status = "synced"
        sync_record.sync_error = None
        sync_record.last_synced_at = datetime.now(timezone.utc)

    except HTTPException as e:
        sync_record.sync_status = "error"
        sync_record.sync_error = e.detail
        if not existing_sync:
            db.add(sync_record)
        db.commit()
        raise

    except Exception as e:
        sync_record.sync_status = "error"
        sync_record.sync_error = str(e)
        if not existing_sync:
            db.add(sync_record)
        db.commit()
        raise HTTPException(status_code=502, detail=f"CRM sync mislukt: {str(e)}")

    if not existing_sync:
        db.add(sync_record)
    db.commit()
    db.refresh(sync_record)

    return CRMSyncOut(
        id=sync_record.id,
        candidate_id=sync_record.candidate_id,
        application_id=sync_record.application_id,
        crm_provider=sync_record.crm_provider,
        crm_contact_id=sync_record.crm_contact_id,
        crm_deal_id=sync_record.crm_deal_id,
        crm_activity_id=sync_record.crm_activity_id,
        sync_status=sync_record.sync_status,
        sync_error=sync_record.sync_error,
        last_synced_at=str(sync_record.last_synced_at) if sync_record.last_synced_at else None,
    )


@router.post("/activity", response_model=dict)
def log_crm_activity(
    payload: LogActivityIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Log een activiteit in het CRM (interview gepland, status gewijzigd, chat afgerond).
    Maakt automatisch ook een CRM meeting/afspraak aan als type = 'interview_scheduled'.
    """
    require_role(current_user, "employer")

    app = db.query(models.Application).filter(models.Application.id == payload.application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Sollicitatie niet gevonden")

    vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == app.vacancy_id).first()
    candidate = db.query(models.User).filter(models.User.id == app.candidate_id).first()

    # Controleer of er een CRM sync bestaat
    sync_record = (
        db.query(models.CRMSync)
        .filter(
            models.CRMSync.candidate_id == app.candidate_id,
            models.CRMSync.crm_provider == CRM_PROVIDER,
        )
        .first()
    )

    if not sync_record or not sync_record.crm_contact_id:
        raise HTTPException(
            status_code=400,
            detail="Kandidaat is nog niet gesynchroniseerd naar het CRM. Voer eerst een sync uit.",
        )

    activity_id = ""
    try:
        if CRM_PROVIDER == "hubspot":
            if payload.activity_type == "interview_scheduled" and payload.scheduled_at:
                activity_id = _hubspot_create_meeting(
                    contact_id=sync_record.crm_contact_id,
                    title=f"Interview: {candidate.full_name if candidate else 'Kandidaat'} — {vacancy.title if vacancy else 'Vacature'}",
                    scheduled_at_iso=payload.scheduled_at,
                    duration_ms=1800000,  # 30 minuten
                )
            else:
                activity_id = _hubspot_log_note(
                    contact_id=sync_record.crm_contact_id,
                    deal_id=sync_record.crm_deal_id,
                    note_body=f"[{payload.activity_type.upper()}] {payload.description}",
                )

            if activity_id:
                sync_record.crm_activity_id = activity_id
                db.commit()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"CRM activiteit loggen mislukt: {str(e)}")

    return {
        "success": True,
        "activity_id": activity_id,
        "provider": CRM_PROVIDER,
    }


@router.get("/contact/{candidate_id}", response_model=dict)
def get_crm_contact(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Haal de CRM sync status + contact URL op voor een kandidaat."""
    require_role(current_user, "employer")

    sync = (
        db.query(models.CRMSync)
        .filter(
            models.CRMSync.candidate_id == candidate_id,
            models.CRMSync.crm_provider == CRM_PROVIDER,
        )
        .first()
    )

    if not sync:
        return {"synced": False, "provider": CRM_PROVIDER, "contact_url": None}

    # Bouw de CRM contact URL op
    contact_url = None
    if CRM_PROVIDER == "hubspot" and sync.crm_contact_id and CRM_PORTAL_ID:
        contact_url = f"https://app.hubspot.com/contacts/{CRM_PORTAL_ID}/contact/{sync.crm_contact_id}"

    return {
        "synced": sync.sync_status == "synced",
        "provider": CRM_PROVIDER,
        "crm_contact_id": sync.crm_contact_id,
        "crm_deal_id": sync.crm_deal_id,
        "contact_url": contact_url,
        "last_synced_at": str(sync.last_synced_at) if sync.last_synced_at else None,
    }
