"""
Billing — Stripe Checkout & Webhook

Endpoints:
  POST /billing/checkout          Maak Stripe Checkout aan voor abonnement
  POST /billing/vacancy-checkout  Maak Stripe Checkout aan voor pay-per-vacature
  POST /billing/webhook           Stripe webhook: activeer / deactiveer plan

Stripe Dashboard setup (doe dit EENMALIG in testmodus — werkt zonder KvK):
  1. Dashboard → Products → Maak 4 recurring producten aan:
       Normaal Maandelijks  — €149/maand   (recurring, interval=month)
       Normaal Jaarlijks    — €1.490/jaar  (recurring, interval=year)
       Premium Maandelijks  — €349/maand   (recurring, interval=month)
       Premium Jaarlijks    — €3.490/jaar  (recurring, interval=year)
     → Kopieer de Price IDs (price_...) naar env vars
  2. Dashboard → Products → Maak 1 one-time product aan:
       Per Vacature Posting  — €89 (one-time)
  3. Dashboard → Developers → Webhooks → Add endpoint:
       URL:    https://its-peanuts-backend.onrender.com/billing/webhook
       Events: checkout.session.completed
               customer.subscription.deleted
               customer.subscription.updated
     → Kopieer de Signing Secret (whsec_...) naar STRIPE_WEBHOOK_SECRET

Env vars (Render → Environment):
  STRIPE_SECRET_KEY             sk_test_...  (of sk_live_... na KvK)
  STRIPE_WEBHOOK_SECRET         whsec_...
  STRIPE_PRICE_NORMAAL_MAAND    price_...
  STRIPE_PRICE_NORMAAL_JAAR     price_...
  STRIPE_PRICE_PREMIUM_MAAND    price_...
  STRIPE_PRICE_PREMIUM_JAAR     price_...
  STRIPE_PRICE_PER_VACATURE     price_...
  FRONTEND_URL                  https://vorzaiq.com

Live gaan (na KvK):
  Verander STRIPE_SECRET_KEY van sk_test_... naar sk_live_...
  Maak nieuwe webhook aan in live modus → update STRIPE_WEBHOOK_SECRET
"""

import os
from datetime import datetime
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.db import get_db
from backend import models
from backend.routers.auth import get_current_user, require_role
from backend.services.email import send_invoice_email

router = APIRouter(prefix="/billing", tags=["billing"])

# ── Stripe configuratie ────────────────────────────────────────────────────────

STRIPE_SECRET_KEY     = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
FRONTEND_URL          = os.getenv("FRONTEND_URL", "https://vorzaiq.com")

stripe.api_key = STRIPE_SECRET_KEY

PRICE_IDS: dict[tuple[str, str], str] = {
    ("normaal", "month"): os.getenv("STRIPE_PRICE_NORMAAL_MAAND", ""),
    ("normaal", "year"):  os.getenv("STRIPE_PRICE_NORMAAL_JAAR", ""),
    ("premium", "month"): os.getenv("STRIPE_PRICE_PREMIUM_MAAND", ""),
    ("premium", "year"):  os.getenv("STRIPE_PRICE_PREMIUM_JAAR", ""),
}

STRIPE_PRICE_PER_VACATURE = os.getenv("STRIPE_PRICE_PER_VACATURE", "")


# ── Schemas ────────────────────────────────────────────────────────────────────

class CheckoutIn(BaseModel):
    plan: str      # "normaal" | "premium"
    interval: str  # "month" | "year"


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/cancel-trial")
def cancel_trial(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Werkgever annuleert zijn gratis trial en stapt over naar het gratis plan."""
    if current_user.trial_ends_at is None:
        raise HTTPException(status_code=400, detail="Geen actieve trial gevonden")
    current_user.plan = "gratis"
    current_user.trial_ends_at = None
    db.commit()
    db.refresh(current_user)
    return {"ok": True, "plan": "gratis"}


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
            detail="Stripe is niet geconfigureerd. Stel STRIPE_SECRET_KEY in.",
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
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            customer_email=current_user.email,
            allow_promotion_codes=True,
            # Metadata op de Session zelf (voor checkout.session.completed)
            metadata={"user_id": str(current_user.id), "plan": payload.plan},
            # Metadata op het Subscription object (voor subscription.deleted/updated)
            subscription_data={"metadata": {"user_id": str(current_user.id), "plan": payload.plan}},
            success_url=f"{FRONTEND_URL}/abonnementen?success=1",
            cancel_url=f"{FRONTEND_URL}/abonnementen?cancelled=1",
        )
    except stripe.StripeError as e:
        raise HTTPException(status_code=502, detail=f"Stripe fout: {getattr(e, 'user_message', str(e))}")

    return {"checkout_url": session.url}


@router.post("/vacancy-checkout")
def create_vacancy_checkout(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Maak een Stripe Checkout Session aan voor pay-per-vacature (€89 eenmalig).
    Na betaling ontvangt de gebruiker 1 vacancy_credit via de webhook.
    """
    require_role(current_user, "employer")

    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Stripe is niet geconfigureerd.")
    if not STRIPE_PRICE_PER_VACATURE:
        raise HTTPException(status_code=503, detail="STRIPE_PRICE_PER_VACATURE niet ingesteld.")

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            line_items=[{"price": STRIPE_PRICE_PER_VACATURE, "quantity": 1}],
            customer_email=current_user.email,
            metadata={"user_id": str(current_user.id), "type": "per_vacature"},
            success_url=f"{FRONTEND_URL}/employer?vacature_betaald=1",
            cancel_url=f"{FRONTEND_URL}/employer",
        )
    except stripe.StripeError as e:
        raise HTTPException(status_code=502, detail=f"Stripe fout: {getattr(e, 'user_message', str(e))}")

    return {"checkout_url": session.url}


def _log_payment_and_invoice(
    db: Session,
    user: models.User,
    session_data: dict,
    plan: str,
    interval: str | None,
    payment_type: str,
) -> None:
    """Log een betaling en stuur een factuur e-mail."""
    stripe_session_id = session_data.get("id", "")

    # Voorkom dubbele logs bij herhaalde webhooks
    existing = db.query(models.PaymentLog).filter(
        models.PaymentLog.stripe_session_id == stripe_session_id
    ).first()
    if existing:
        return

    # Stripe stuurt amount_total in centen
    amount_cents = session_data.get("amount_total") or 0
    amount_total = round(amount_cents / 100, 2)

    # Genereer factuurnummer: INV-JAAR-{volgnummer}
    year = datetime.utcnow().year
    count = db.query(models.PaymentLog).filter(
        models.PaymentLog.invoice_number.like(f"INV-{year}-%")
    ).count()
    invoice_number = f"INV-{year}-{count + 1:04d}"

    # Detecteer interval uit price ID (optioneel, valt terug op None)
    detected_interval = interval
    if not detected_interval and payment_type == "subscription":
        price_id = ""
        line_items = session_data.get("line_items") or {}
        # Probeer interval te bepalen via PRICE_IDS mapping
        for (p, iv), pid in PRICE_IDS.items():
            if p == plan and pid:
                detected_interval = detected_interval  # blijft None als we het niet weten

    log = models.PaymentLog(
        user_id=user.id,
        user_email=user.email,
        user_name=user.full_name or "",
        plan=plan,
        interval=detected_interval,
        amount_total=amount_total,
        currency=session_data.get("currency", "eur"),
        payment_type=payment_type,
        stripe_session_id=stripe_session_id,
        invoice_number=invoice_number,
    )
    db.add(log)
    db.commit()

    # Stuur factuur
    try:
        send_invoice_email(
            employer_email=user.email,
            employer_name=user.full_name or user.email,
            invoice_number=invoice_number,
            plan=plan,
            interval=detected_interval,
            amount_total=amount_total,
            invoice_date=datetime.utcnow().strftime("%d-%m-%Y"),
            language="nl",
        )
    except Exception as exc:
        import logging
        logging.getLogger(__name__).error("[billing] Factuur versturen mislukt: %s", exc)


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Stripe webhook — verwerk betaling- en abonnement-events.

    Registreer in Stripe Dashboard → Webhooks:
      Events: checkout.session.completed
              customer.subscription.deleted
              customer.subscription.updated
    """
    raw_body = await request.body()
    sig = request.headers.get("stripe-signature", "")

    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="STRIPE_WEBHOOK_SECRET niet geconfigureerd")

    try:
        event = stripe.Webhook.construct_event(raw_body, sig, STRIPE_WEBHOOK_SECRET)
    except stripe.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Ongeldige Stripe handtekening")
    except Exception:
        raise HTTPException(status_code=400, detail="Webhook verwerking mislukt")

    # Normaliseer naar dict voor type-veilige toegang
    event_dict: dict = dict(event)
    etype: str = str(event_dict.get("type", ""))
    data: dict = dict((event_dict.get("data") or {}).get("object") or {})

    # ── checkout.session.completed ──────────────────────────────────────────
    if etype == "checkout.session.completed":
        meta  = data.get("metadata") or {}
        mode  = data.get("mode", "")
        plan  = meta.get("plan", "")
        ptype = meta.get("type", "")

        try:
            user_id = int(meta.get("user_id", 0) or 0)
        except (ValueError, TypeError):
            user_id = 0

        user = None
        if user_id:
            user = db.query(models.User).filter(models.User.id == user_id).first()

        # Launch links hebben geen user_id — zoek op customer_email
        if not user:
            customer_email = data.get("customer_email") or data.get("customer_details", {}).get("email")
            if customer_email:
                user = db.query(models.User).filter(models.User.email == customer_email).first()

        if not user:
            return {"status": "ok"}

        if mode == "subscription" and plan in ("normaal", "premium"):
            user.plan = plan
            user.trial_ends_at = None
            db.commit()

            # Zorg dat subscription metadata de user_id bevat (voor launch links
            # waar die initieel ontbrak) — nodig voor subscription.deleted/updated
            sub_id = data.get("subscription")
            if sub_id and not meta.get("user_id"):
                try:
                    stripe.Subscription.modify(sub_id, metadata={
                        "user_id": str(user.id), "plan": plan,
                    })
                except Exception:
                    pass  # niet-fataal

            _log_payment_and_invoice(db, user, data, plan=plan, interval=None, payment_type="subscription")

        elif mode == "payment" and ptype == "per_vacature":
            user.vacancy_credits = (user.vacancy_credits or 0) + 1
            db.commit()
            _log_payment_and_invoice(db, user, data, plan="per_vacature", interval=None, payment_type="per_vacature")

    # ── customer.subscription.deleted ──────────────────────────────────────
    elif etype == "customer.subscription.deleted":
        meta = data.get("metadata") or {}
        try:
            user_id = int(meta.get("user_id", 0) or 0)
        except (ValueError, TypeError):
            user_id = 0

        if user_id:
            user = db.query(models.User).filter(models.User.id == user_id).first()
            if user:
                user.plan = "gratis"
                db.commit()

    # ── customer.subscription.updated ──────────────────────────────────────
    elif etype == "customer.subscription.updated":
        meta   = data.get("metadata") or {}
        status = data.get("status", "")

        try:
            user_id = int(meta.get("user_id", 0) or 0)
        except (ValueError, TypeError):
            user_id = 0

        if not user_id:
            return {"status": "ok"}

        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            return {"status": "ok"}

        if status in ("canceled", "unpaid", "past_due"):
            user.plan = "gratis"
            db.commit()
        elif status == "active":
            plan = meta.get("plan", "")
            if plan in ("normaal", "premium"):
                user.plan = plan
                user.trial_ends_at = None
                db.commit()

    return {"status": "ok"}


# ── Admin: genereer launch checkout link ─────────────────────────────────────

LAUNCH_COUPON_ID = os.getenv("STRIPE_LAUNCH_COUPON", "7bzV8eqk")


class LaunchLinkIn(BaseModel):
    email: str | None = None  # optioneel: pre-fill email in checkout


@router.post("/generate-launch-link")
def generate_launch_link(
    payload: LaunchLinkIn,
    current_user: models.User = Depends(get_current_user),
):
    """
    Admin-only: genereer een directe Stripe Checkout link voor Scale met
    de launch coupon (6 maanden gratis) al toegepast.
    Stuur deze link naar een bedrijf — zij klikken, vullen gegevens in, klaar.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Alleen admins")

    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Stripe niet geconfigureerd")

    price_id = PRICE_IDS.get(("premium", "month"))
    if not price_id:
        raise HTTPException(status_code=503, detail="Scale maandprijs niet ingesteld")

    try:
        params: dict = {
            "mode": "subscription",
            "line_items": [{"price": price_id, "quantity": 1}],
            "discounts": [{"coupon": LAUNCH_COUPON_ID}],
            "metadata": {"plan": "premium", "launch": "true"},
            "subscription_data": {"metadata": {"plan": "premium", "launch": "true"}},
            "success_url": f"{FRONTEND_URL}/employer?welcome=1",
            "cancel_url": f"{FRONTEND_URL}/abonnementen",
        }
        if payload.email:
            params["customer_email"] = payload.email

        session = stripe.checkout.Session.create(**params)
    except stripe.StripeError as e:
        raise HTTPException(status_code=502, detail=f"Stripe fout: {getattr(e, 'user_message', str(e))}")

    return {"checkout_url": session.url}
