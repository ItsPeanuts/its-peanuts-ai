"""
Billing — LemonSqueezy Checkout & Webhook

Endpoints:
  POST /billing/checkout   Maak LemonSqueezy Checkout aan voor een abonnement
  POST /billing/webhook    LemonSqueezy webhook: verwerk betaling en activeer plan

LemonSqueezy dashboard setup:
  1. Maak 4 varianten aan (recurring): normaal/premium × maand/jaar
  2. Kopieer de Variant IDs (niet Product IDs) naar env vars
  3. Maak een Webhook endpoint aan op:
       https://its-peanuts-backend.onrender.com/billing/webhook
     Events: subscription_created, subscription_cancelled,
             subscription_expired, subscription_resumed

Env vars:
  LEMONSQUEEZY_API_KEY              lemon_...
  LEMONSQUEEZY_WEBHOOK_SECRET       whsec_... (LS dashboard → Webhooks → Signing Secret)
  LEMONSQUEEZY_STORE_ID             123456 (numeriek store ID)
  LEMONSQUEEZY_VARIANT_NORMAAL_MAAND  111111
  LEMONSQUEEZY_VARIANT_NORMAAL_JAAR   222222
  LEMONSQUEEZY_VARIANT_PREMIUM_MAAND  333333
  LEMONSQUEEZY_VARIANT_PREMIUM_JAAR   444444
  FRONTEND_URL                        https://its-peanuts-frontend.onrender.com
"""

import os
import hmac
import hashlib
import json
import requests as http
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.db import get_db
from backend import models
from backend.routers.auth import get_current_user, require_role

router = APIRouter(prefix="/billing", tags=["billing"])

# ── LemonSqueezy configuratie ─────────────────────────────────────────────────

LS_API_KEY        = os.getenv("LEMONSQUEEZY_API_KEY", "")
LS_WEBHOOK_SECRET = os.getenv("LEMONSQUEEZY_WEBHOOK_SECRET", "")
LS_STORE_ID       = os.getenv("LEMONSQUEEZY_STORE_ID", "")
FRONTEND_URL      = os.getenv("FRONTEND_URL", "https://its-peanuts-frontend.onrender.com")

VARIANT_IDS: dict[tuple[str, str], str] = {
    ("normaal", "month"): os.getenv("LEMONSQUEEZY_VARIANT_NORMAAL_MAAND", ""),
    ("normaal", "year"):  os.getenv("LEMONSQUEEZY_VARIANT_NORMAAL_JAAR", ""),
    ("premium", "month"): os.getenv("LEMONSQUEEZY_VARIANT_PREMIUM_MAAND", ""),
    ("premium", "year"):  os.getenv("LEMONSQUEEZY_VARIANT_PREMIUM_JAAR", ""),
}

LS_VARIANT_PER_VACATURE = os.getenv("LEMONSQUEEZY_VARIANT_PER_VACATURE", "")

_LS_HEADERS = {
    "Content-Type": "application/vnd.api+json",
    "Accept": "application/vnd.api+json",
}


# ── Schemas ───────────────────────────────────────────────────────────────────

class CheckoutIn(BaseModel):
    plan: str       # "normaal" | "premium"
    interval: str   # "month" | "year"


# ── Helpers ───────────────────────────────────────────────────────────────────

def verify_ls_signature(raw_body: bytes, signature: str) -> bool:
    """Verifieer LemonSqueezy webhook handtekening (HMAC-SHA256)."""
    if not LS_WEBHOOK_SECRET:
        return True  # Dev: geen verificatie als secret niet ingesteld
    digest = hmac.new(LS_WEBHOOK_SECRET.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(digest, signature)


def create_ls_checkout(
    variant_id: str,
    email: str,
    custom_data: dict,
    redirect_url: str,
) -> str:
    """Maak een LemonSqueezy Checkout aan en geef de checkout URL terug."""
    body = {
        "data": {
            "type": "checkouts",
            "attributes": {
                "checkout_data": {
                    "email": email,
                    "custom": {k: str(v) for k, v in custom_data.items()},
                },
                "product_options": {
                    "redirect_url": redirect_url,
                },
            },
            "relationships": {
                "store": {
                    "data": {"type": "stores", "id": str(LS_STORE_ID)}
                },
                "variant": {
                    "data": {"type": "variants", "id": str(variant_id)}
                },
            },
        }
    }
    resp = http.post(
        "https://api.lemonsqueezy.com/v1/checkouts",
        headers={**_LS_HEADERS, "Authorization": f"Bearer {LS_API_KEY}"},
        json=body,
        timeout=10,
    )
    if not resp.ok:
        raise HTTPException(
            status_code=502,
            detail=f"LemonSqueezy fout: {resp.status_code} — {resp.text[:200]}",
        )
    return resp.json()["data"]["attributes"]["url"]


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/vacancy-checkout")
def create_vacancy_checkout(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Maak een LemonSqueezy Checkout aan voor pay-per-vacature (€89).
    Na betaling ontvangt de gebruiker 1 vacancy_credit via de webhook.
    """
    require_role(current_user, "employer")

    if not LS_API_KEY:
        raise HTTPException(status_code=503, detail="LemonSqueezy is niet geconfigureerd.")

    if not LS_VARIANT_PER_VACATURE:
        raise HTTPException(status_code=503, detail="LEMONSQUEEZY_VARIANT_PER_VACATURE niet ingesteld.")

    checkout_url = create_ls_checkout(
        variant_id=LS_VARIANT_PER_VACATURE,
        email=current_user.email,
        custom_data={"user_id": current_user.id, "type": "per_vacature"},
        redirect_url=f"{FRONTEND_URL}/employer?vacature_betaald=1",
    )
    return {"checkout_url": checkout_url}


@router.post("/checkout")
def create_checkout_session(
    payload: CheckoutIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Maak een LemonSqueezy Checkout aan voor een abonnement.
    Geeft { checkout_url } terug — frontend redirect hier naartoe.
    """
    require_role(current_user, "employer")

    if not LS_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="LemonSqueezy is niet geconfigureerd. Stel LEMONSQUEEZY_API_KEY in.",
        )

    if payload.plan not in ("normaal", "premium"):
        raise HTTPException(status_code=400, detail="Ongeldig plan (kies normaal of premium)")
    if payload.interval not in ("month", "year"):
        raise HTTPException(status_code=400, detail="Ongeldig interval (kies month of year)")

    variant_id = VARIANT_IDS.get((payload.plan, payload.interval))
    if not variant_id:
        raise HTTPException(
            status_code=503,
            detail=f"Variant ID niet ingesteld voor {payload.plan}/{payload.interval}",
        )

    checkout_url = create_ls_checkout(
        variant_id=variant_id,
        email=current_user.email,
        custom_data={"user_id": current_user.id, "plan": payload.plan},
        redirect_url=f"{FRONTEND_URL}/abonnementen?success=1",
    )
    return {"checkout_url": checkout_url}


@router.post("/webhook")
async def ls_webhook(request: Request, db: Session = Depends(get_db)):
    """
    LemonSqueezy webhook — verwerk abonnement-events en update user.plan.
    Geen JWT-authenticatie: LemonSqueezy ondertekent het verzoek met LEMONSQUEEZY_WEBHOOK_SECRET.
    """
    raw_body = await request.body()
    signature = request.headers.get("x-signature", "")

    if not verify_ls_signature(raw_body, signature):
        raise HTTPException(status_code=400, detail="Ongeldige LemonSqueezy handtekening")

    event = json.loads(raw_body)
    event_name = event.get("meta", {}).get("event_name", "")
    custom_data = event.get("meta", {}).get("custom_data", {})

    user_id_raw = custom_data.get("user_id", 0)
    plan = custom_data.get("plan", "")

    try:
        user_id = int(user_id_raw)
    except (ValueError, TypeError):
        return {"status": "ok"}

    if not user_id:
        return {"status": "ok"}

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return {"status": "ok"}

    if event_name in ("subscription_created", "subscription_resumed"):
        if plan in ("normaal", "premium"):
            user.plan = plan
            db.commit()

    elif event_name in ("subscription_cancelled", "subscription_expired"):
        user.plan = "gratis"
        db.commit()

    elif event_name == "order_created":
        if custom_data.get("type") == "per_vacature":
            user.vacancy_credits = (user.vacancy_credits or 0) + 1
            db.commit()

    return {"status": "ok"}
