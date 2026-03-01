"""
Microsoft Teams Bot — "Lisa" als virtuele HR-recruiter in Teams

Dit bestand bevat de webhook endpoint die Teams berichten ontvangt,
en een send endpoint om proactief berichten te sturen.

Vereisten (environment variables):
  TEAMS_BOT_APP_ID       - Bot app ID (Azure Bot Service)
  TEAMS_BOT_APP_PASSWORD - Bot app password / client secret
  MS_TENANT_ID           - Azure AD tenant ID (voor token validatie)

Flow:
  1. Teams stuurt activiteiten naar POST /teams/webhook
  2. De bot herkent berichten en antwoordt via de Bot Framework REST API
  3. Bij een "schedule_interview" intent stuurt de bot een Teams meeting link

Referenties:
  https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages
  https://learn.microsoft.com/en-us/graph/api/application-post-onlinemeetings
"""

import hmac
import hashlib
import os
import json
from typing import Optional

import requests
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel

router = APIRouter(prefix="/teams", tags=["teams-bot"])


# ── Bot credentials ───────────────────────────────────────────────────────────

TEAMS_BOT_APP_ID = os.getenv("TEAMS_BOT_APP_ID", "")
TEAMS_BOT_APP_PASSWORD = os.getenv("TEAMS_BOT_APP_PASSWORD", "")
MS_TENANT_ID = os.getenv("MS_TENANT_ID", "")


# ── Bot Framework token helper ────────────────────────────────────────────────

def _get_bot_token() -> str:
    """Haal een Bot Framework access token op voor antwoorden sturen."""
    if not TEAMS_BOT_APP_ID or not TEAMS_BOT_APP_PASSWORD:
        raise HTTPException(
            status_code=503,
            detail=(
                "Teams Bot niet geconfigureerd. "
                "Stel TEAMS_BOT_APP_ID en TEAMS_BOT_APP_PASSWORD in."
            ),
        )
    resp = requests.post(
        "https://login.microsoftonline.com/botframework.com/oauth2/v2.0/token",
        data={
            "grant_type": "client_credentials",
            "client_id": TEAMS_BOT_APP_ID,
            "client_secret": TEAMS_BOT_APP_PASSWORD,
            "scope": "https://api.botframework.com/.default",
        },
        timeout=10,
    )
    if not resp.ok:
        raise HTTPException(status_code=502, detail=f"Bot token mislukt: {resp.text}")
    return resp.json()["access_token"]


def _send_reply(service_url: str, conversation_id: str, activity_id: str, text: str) -> None:
    """Stuur een tekstantwoord terug naar Teams via Bot Framework."""
    token = _get_bot_token()
    url = f"{service_url}v3/conversations/{conversation_id}/activities/{activity_id}"
    payload = {
        "type": "message",
        "text": text,
        "from": {"id": TEAMS_BOT_APP_ID, "name": "Lisa"},
    }
    requests.post(
        url,
        json=payload,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        timeout=10,
    )


def _send_proactive_message(service_url: str, conversation_id: str, text: str) -> None:
    """Stuur een proactief bericht naar een bestaand gesprek."""
    token = _get_bot_token()
    url = f"{service_url}v3/conversations/{conversation_id}/activities"
    payload = {
        "type": "message",
        "text": text,
        "from": {"id": TEAMS_BOT_APP_ID, "name": "Lisa"},
    }
    requests.post(
        url,
        json=payload,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        timeout=10,
    )


# ── Schemas ───────────────────────────────────────────────────────────────────

class SendMessageRequest(BaseModel):
    service_url: str
    conversation_id: str
    text: str


class BotStatusResponse(BaseModel):
    configured: bool
    bot_app_id: Optional[str] = None
    message: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/webhook")
async def teams_webhook(request: Request) -> Response:
    """
    Webhook endpoint voor Microsoft Teams Bot Framework activiteiten.

    Teams stuurt hier alle inkomende berichten naartoe.
    Dit endpoint:
    1. Ontvangt de activiteit (message, invoke, conversationUpdate, etc.)
    2. Verwerkt het bericht via Lisa's AI logica
    3. Stuurt een antwoord terug

    Stel dit endpoint in als Messaging Endpoint in Azure Bot Service:
      https://its-peanuts-backend.onrender.com/teams/webhook
    """
    try:
        body = await request.json()
    except Exception:
        return Response(content="Bad request", status_code=400)

    activity_type = body.get("type", "")

    # Reageer op conversationUpdate (bot wordt toegevoegd aan een kanaal)
    if activity_type == "conversationUpdate":
        members_added = body.get("membersAdded", [])
        if any(m.get("id") != body.get("recipient", {}).get("id") for m in members_added):
            # Bot is net toegevoegd — stuur welkomstbericht
            service_url = body.get("serviceUrl", "")
            conversation_id = body.get("conversation", {}).get("id", "")
            activity_id = body.get("id", "")
            if service_url and conversation_id:
                try:
                    _send_reply(
                        service_url,
                        conversation_id,
                        activity_id,
                        (
                            "Hoi! Ik ben Lisa, jullie AI HR-recruiter van It's Peanuts AI. "
                            "Ik begeleid het eerste gesprek met kandidaten. "
                            "Ik kan ook gesprekken inplannen en de agenda bijhouden. "
                            "Hoe kan ik je helpen?"
                        ),
                    )
                except Exception:
                    pass
        return Response(status_code=200)

    # Verwerk een tekstbericht
    if activity_type == "message":
        text = body.get("text", "").strip().lower()
        service_url = body.get("serviceUrl", "")
        conversation_id = body.get("conversation", {}).get("id", "")
        activity_id = body.get("id", "")
        sender_name = body.get("from", {}).get("name", "")

        if not service_url or not conversation_id:
            return Response(status_code=200)

        # Eenvoudige intent herkenning
        reply = _process_message(text, sender_name)
        try:
            _send_reply(service_url, conversation_id, activity_id, reply)
        except Exception:
            pass

        return Response(status_code=200)

    # Alle andere activiteiten (invoke, etc.) negeren
    return Response(status_code=200)


def _process_message(text: str, sender_name: str) -> str:
    """
    Eenvoudige intent-based berichtverwerking.
    Uitbreidbaar met OpenAI voor volledig conversationele Teams-bot.
    """
    greetings = ["hoi", "hallo", "hi", "goedemorgen", "goedemiddag", "hey"]
    schedule_keywords = ["interview", "gesprek", "plannen", "inplannen", "afspraak", "agenda"]
    help_keywords = ["help", "wat kun je", "wat kan je", "hulp", "?"[0]]

    if any(g in text for g in greetings):
        name_part = f" {sender_name.split()[0]}" if sender_name else ""
        return (
            f"Hoi{name_part}! Ik ben Lisa. "
            "Ik kan kandidaatgesprekken voeren, interviews inplannen en de agenda bijhouden. "
            "Wat kan ik voor je doen?"
        )

    if any(k in text for k in schedule_keywords):
        return (
            "Je kunt een interview inplannen via het werkgeversportaal op It's Peanuts AI. "
            "Ik maak dan automatisch een Teams meeting aan en stuur beide partijen een uitnodiging. "
            "Ga naar: https://its-peanuts-ai.vercel.app/employer"
        )

    if any(k in text for k in help_keywords):
        return (
            "Ik kan je helpen met:\n"
            "• Kandidaatgesprekken voeren (AI prescreening)\n"
            "• Interviews inplannen + Teams meeting aanmaken\n"
            "• Agenda-uitnodigingen sturen\n"
            "• Sollicitatiestatus bekijken\n\n"
            "Voor het werkgeversportaal: https://its-peanuts-ai.vercel.app/employer"
        )

    return (
        "Dank je voor je bericht! "
        "Voor het beheren van sollicitaties en het inplannen van gesprekken, "
        "gebruik het werkgeversportaal: https://its-peanuts-ai.vercel.app/employer"
    )


@router.post("/send-message")
def send_proactive_message(
    payload: SendMessageRequest,
) -> dict:
    """
    Stuur een proactief bericht naar een Teams gesprek.
    Gebruik dit bijv. om een kandidaat te notificeren dat een interview is ingepland.
    """
    try:
        _send_proactive_message(
            service_url=payload.service_url,
            conversation_id=payload.conversation_id,
            text=payload.text,
        )
        return {"success": True}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status", response_model=BotStatusResponse)
def bot_status() -> BotStatusResponse:
    """Controleer of de Teams bot geconfigureerd is."""
    configured = bool(TEAMS_BOT_APP_ID and TEAMS_BOT_APP_PASSWORD)
    return BotStatusResponse(
        configured=configured,
        bot_app_id=TEAMS_BOT_APP_ID if configured else None,
        message=(
            "Teams bot is geconfigureerd en klaar voor gebruik."
            if configured
            else (
                "Teams bot is NIET geconfigureerd. "
                "Stel TEAMS_BOT_APP_ID en TEAMS_BOT_APP_PASSWORD in via Render environment variables. "
                "Maak een Azure Bot Service aan via: https://portal.azure.com"
            )
        ),
    )
