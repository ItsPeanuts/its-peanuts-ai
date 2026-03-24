"""
Billing — Stripe Checkout & Webhook

Endpoints:
  POST /billing/checkout   Maak Stripe Checkout Session aan voor een abonnement
  POST /billing/webhook    Stripe webhook: verwerk betaling en activeer plan

Stripe dashboard setup:
  1. Maak 4 Prices aan in Stripe dashboard (normaal/premium × maand/jaar)
  2. Kopieer de Price IDs naar env vars
  3. Maak een Webhook endpoint aan op:
       https://its-peanuts-backend.onrender.com/billing/webhook
     Events: checkout.session.completed, customer.subscription.deleted

Env vars:
  STRIPE_SECRET_KEY           sk_live_... of sk_test_...
  STRIPE_WEBHOOK_SECRET       whsec_...
  STRIPE_PRICE_NORMAAL_MAAND  price_...
  STRIPE_PRICE_NORMAAL_JAAR   price_...
  STRIPE_PRICE_PREMIUM_MAAND  price_...
  STRIPE_PRICE_PREMIUM_JAAR   price_...
  FRONTEND_URL                https://its-peanuts-frontend.onrender.com
"""

import os
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.db import get_db
from backend import models
from backend.routers.auth import get_current_user, require_role

router = APIRouter(prefix="/billing", tags=["billing"])

# ── Stripe configuratie ───────────────────────────────────────────────────────

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://its-peanuts-frontend.onrender.com")

# Stripe Price IDs per plan × interval
PRICE_IDS = {
    ("normaal", "month"): os.getenv("STRIPE_PRICE_NORMAAL_MAAND", ""),
    ("normaal", "year"):  os.getenv("STRIPE_PRICE_NORMAAL_JAAR", ""),
    ("premium", "month"): os.getenv("STRIPE_PRICE_PREMIUM_MAAND", ""),
    ("premium", "year"):  os.getenv("STRIPE_PRICE_PREMIUM_JAAR", ""),
}

if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY


# ── Schemas ───────────────────────────────────────────────────────────────────

class CheckoutIn(BaseModel):
    plan: str       # "normaal" | "premium"
    interval: str   # "month" | "year"


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/checkout")
def create_checkout_session(
    payload: CheckoutIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Maak een Stripe Checkout Session aan voor een abonnement.
    Geeft { checkout_url } terug — frontend redirect hier naartoe.
    """
    require_role(current_user, "employer")

    if not STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=503,
            detail=(
                "Stripe is niet geconfigureerd. "
                "Stel STRIPE_SECRET_KEY in als omgevingsvariabele."
            ),
        )

    if payload.plan not in ("normaal", "premium"):
        raise HTTPException(status_code=400, detail="Ongeldig plan (kies normaal of premium)")
    if payload.interval not in ("month", "year"):
        raise HTTPException(status_code=400, detail="Ongeldig interval (kies month of year)")

    price_id = PRICE_IDS.get((payload.plan, payload.interval))
    if not price_id:
        raise HTTPException(
            status_code=503,
            detail=f"Stripe Price ID niet ingesteld voor {payload.plan}/{payload.interval}",
        )

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card", "ideal"],
            line_items=[{"price": price_id, "quantity": 1}],
            mode="subscription",
            success_url=f"{FRONTEND_URL}/abonnementen?success=1",
            cancel_url=f"{FRONTEND_URL}/abonnementen",
            customer_email=current_user.email,
            metadata={
                "user_id": str(current_user.id),
                "plan": payload.plan,
            },
        )
    except stripe.StripeError as e:
        raise HTTPException(status_code=502, detail=f"Stripe fout: {str(e)}")

    return {"checkout_url": session.url}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Stripe webhook — verwerk betaling en activeer plan in DB.
    Geen JWT-authenticatie: Stripe ondertekent het verzoek met STRIPE_WEBHOOK_SECRET.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    if not STRIPE_WEBHOOK_SECRET:
        # Webhook secret niet ingesteld — verwerk zonder verificatie (alleen voor dev)
        import json
        event = stripe.Event.construct_from(json.loads(payload), stripe.api_key)
    else:
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
        except stripe.error.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Ongeldige Stripe handtekening")

    if event["type"] == "checkout.session.completed":
        session_obj = event["data"]["object"]
        user_id = int(session_obj.get("metadata", {}).get("user_id", 0))
        plan = session_obj.get("metadata", {}).get("plan", "")

        if user_id and plan in ("normaal", "premium"):
            user = db.query(models.User).filter(models.User.id == user_id).first()
            if user:
                user.plan = plan
                db.commit()

    elif event["type"] in ("customer.subscription.deleted", "customer.subscription.paused"):
        # Abonnement opgezegd: terugzetten naar gratis
        # We kunnen de user_id niet direct uit dit event halen zonder extra lookup
        # Sla Stripe customer_id op in user als je dit later wilt implementeren
        pass

    return {"status": "ok"}
