"""
Integraties Status Endpoint

GET /integrations/status
  → Controleert alle externe integraties (OpenAI, Microsoft Graph, Teams Bot, CRM)
  → Test de credentials live door een echte API call te doen
  → Geeft per integratie: configured | ok | error + foutmelding

Gebruikt door de werkgever settings pagina.
"""

import os
from typing import Optional

import requests as http
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.db import get_db
from backend import models
from backend.routers.auth import get_current_user, require_role

router = APIRouter(prefix="/integrations", tags=["integrations"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class IntegrationStatus(BaseModel):
    name: str
    configured: bool
    ok: bool
    message: str
    details: Optional[str] = None


class IntegrationsStatusResponse(BaseModel):
    openai: IntegrationStatus
    microsoft_graph: IntegrationStatus
    teams_bot: IntegrationStatus
    crm: IntegrationStatus


# ── Checks ────────────────────────────────────────────────────────────────────

def _check_openai() -> IntegrationStatus:
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        return IntegrationStatus(
            name="OpenAI",
            configured=False,
            ok=False,
            message="Niet geconfigureerd. Stel OPENAI_API_KEY in via Render.",
        )
    try:
        # Goedkope test: haal model lijst op
        resp = http.get(
            "https://api.openai.com/v1/models",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=8,
        )
        if resp.ok:
            return IntegrationStatus(
                name="OpenAI",
                configured=True,
                ok=True,
                message="Verbinding geslaagd. Lisa AI recruiter is actief.",
            )
        else:
            err = resp.json().get("error", {}).get("message", resp.text)
            return IntegrationStatus(
                name="OpenAI",
                configured=True,
                ok=False,
                message=f"API sleutel ongeldig of verlopen.",
                details=err,
            )
    except Exception as e:
        return IntegrationStatus(
            name="OpenAI",
            configured=True,
            ok=False,
            message="Verbinding mislukt (netwerk timeout?).",
            details=str(e),
        )


def _check_microsoft_graph() -> IntegrationStatus:
    tenant_id = os.getenv("MS_TENANT_ID", "")
    client_id = os.getenv("MS_CLIENT_ID", "")
    client_secret = os.getenv("MS_CLIENT_SECRET", "")
    organizer_email = os.getenv("MS_ORGANIZER_EMAIL", "")

    missing = [k for k, v in {
        "MS_TENANT_ID": tenant_id,
        "MS_CLIENT_ID": client_id,
        "MS_CLIENT_SECRET": client_secret,
        "MS_ORGANIZER_EMAIL": organizer_email,
    }.items() if not v]

    if missing:
        return IntegrationStatus(
            name="Microsoft Graph (Teams meetings)",
            configured=False,
            ok=False,
            message=f"Niet geconfigureerd. Ontbrekende variabelen: {', '.join(missing)}",
            details=(
                "Aanmaken via: https://portal.azure.com → Azure Active Directory → "
                "App registrations → New registration. "
                "Geef permissions: Calendars.ReadWrite + OnlineMeetings.ReadWrite"
            ),
        )

    try:
        token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
        resp = http.post(
            token_url,
            data={
                "grant_type": "client_credentials",
                "client_id": client_id,
                "client_secret": client_secret,
                "scope": "https://graph.microsoft.com/.default",
            },
            timeout=10,
        )
        if resp.ok and resp.json().get("access_token"):
            return IntegrationStatus(
                name="Microsoft Graph (Teams meetings)",
                configured=True,
                ok=True,
                message=f"Verbinding geslaagd. Teams meetings worden aangemaakt via {organizer_email}.",
            )
        else:
            err = resp.json().get("error_description", resp.text)
            return IntegrationStatus(
                name="Microsoft Graph (Teams meetings)",
                configured=True,
                ok=False,
                message="Authenticatie mislukt. Controleer tenant ID, client ID en secret.",
                details=err,
            )
    except Exception as e:
        return IntegrationStatus(
            name="Microsoft Graph (Teams meetings)",
            configured=True,
            ok=False,
            message="Verbinding mislukt.",
            details=str(e),
        )


def _check_teams_bot() -> IntegrationStatus:
    bot_app_id = os.getenv("TEAMS_BOT_APP_ID", "")
    bot_password = os.getenv("TEAMS_BOT_APP_PASSWORD", "")

    if not bot_app_id or not bot_password:
        missing = [k for k, v in {"TEAMS_BOT_APP_ID": bot_app_id, "TEAMS_BOT_APP_PASSWORD": bot_password}.items() if not v]
        return IntegrationStatus(
            name="Teams Bot (Lisa in Teams)",
            configured=False,
            ok=False,
            message=f"Niet geconfigureerd. Ontbrekende variabelen: {', '.join(missing)}",
            details=(
                "Aanmaken via: https://dev.botframework.com of Azure Portal → Bot Services → Create. "
                "Webhook URL instellen op: https://its-peanuts-backend.onrender.com/teams/webhook"
            ),
        )

    try:
        resp = http.post(
            "https://login.microsoftonline.com/botframework.com/oauth2/v2.0/token",
            data={
                "grant_type": "client_credentials",
                "client_id": bot_app_id,
                "client_secret": bot_password,
                "scope": "https://api.botframework.com/.default",
            },
            timeout=10,
        )
        if resp.ok and resp.json().get("access_token"):
            return IntegrationStatus(
                name="Teams Bot (Lisa in Teams)",
                configured=True,
                ok=True,
                message="Bot credentials geldig. Lisa is bereikbaar in Microsoft Teams.",
            )
        else:
            err = resp.json().get("error_description", resp.text)
            return IntegrationStatus(
                name="Teams Bot (Lisa in Teams)",
                configured=True,
                ok=False,
                message="Bot credentials ongeldig.",
                details=err,
            )
    except Exception as e:
        return IntegrationStatus(
            name="Teams Bot (Lisa in Teams)",
            configured=True,
            ok=False,
            message="Verbinding mislukt.",
            details=str(e),
        )


def _check_crm() -> IntegrationStatus:
    provider = os.getenv("CRM_PROVIDER", "hubspot")
    api_key = os.getenv("CRM_API_KEY", "")

    if not api_key:
        return IntegrationStatus(
            name=f"CRM ({provider.title()})",
            configured=False,
            ok=False,
            message="Niet geconfigureerd. Stel CRM_API_KEY in via Render.",
            details=(
                "HubSpot: ga naar https://app.hubspot.com/private-apps → "
                "Maak een Private App → kopieer het token als CRM_API_KEY. "
                "Geef scopes: crm.objects.contacts.write + crm.objects.deals.write + crm.objects.notes.write"
            ),
        )

    try:
        if provider == "hubspot":
            resp = http.get(
                "https://api.hubapi.com/crm/v3/objects/contacts?limit=1",
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=8,
            )
            if resp.ok:
                return IntegrationStatus(
                    name=f"CRM (HubSpot)",
                    configured=True,
                    ok=True,
                    message="Verbinding geslaagd. Kandidaten worden gesynchroniseerd naar HubSpot.",
                )
            else:
                err = resp.json().get("message", resp.text)
                return IntegrationStatus(
                    name=f"CRM (HubSpot)",
                    configured=True,
                    ok=False,
                    message="API token ongeldig of verlopen.",
                    details=err,
                )
        elif provider == "pipedrive":
            resp = http.get(
                "https://api.pipedrive.com/v1/users/me",
                params={"api_token": api_key},
                timeout=8,
            )
            if resp.ok and resp.json().get("success"):
                user_name = resp.json().get("data", {}).get("name", "")
                return IntegrationStatus(
                    name="CRM (Pipedrive)",
                    configured=True,
                    ok=True,
                    message=f"Verbinding geslaagd. Ingelogd als: {user_name}.",
                )
            else:
                err = resp.json().get("error", resp.text)
                return IntegrationStatus(
                    name="CRM (Pipedrive)",
                    configured=True,
                    ok=False,
                    message="API token ongeldig of verlopen.",
                    details=str(err),
                )
        else:
            return IntegrationStatus(
                name=f"CRM ({provider.title()})",
                configured=True,
                ok=False,
                message=f"Provider '{provider}' wordt nog niet ondersteund voor live-test.",
            )
    except Exception as e:
        return IntegrationStatus(
            name=f"CRM ({provider.title()})",
            configured=True,
            ok=False,
            message="Verbinding mislukt.",
            details=str(e),
        )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/status", response_model=IntegrationsStatusResponse)
def get_integrations_status(
    current_user: models.User = Depends(get_current_user),
):
    """
    Test alle integraties live en geef de status terug.
    Beschikbaar voor werkgevers én kandidaten (voor eigen inzicht).
    """
    return IntegrationsStatusResponse(
        openai=_check_openai(),
        microsoft_graph=_check_microsoft_graph(),
        teams_bot=_check_teams_bot(),
        crm=_check_crm(),
    )
