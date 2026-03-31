"""
Vacature Promoties — Stripe Checkout (eenmalige betaling)

Prijzen (alle platforms: Facebook, Instagram, Google, TikTok, LinkedIn):
  7 dagen  → €299
  14 dagen → €499
  30 dagen → €899

Flow:
1. POST /promotions/vacancies/{id}/checkout  → Stripe Checkout Session aanmaken
2. Stripe redirect naar success_url na betaling
3. POST /promotions/webhook                  → status="paid", email admin
4. Admin zet campagnes op, markeert als "active" via admin panel

Stripe Dashboard setup:
  1. Dashboard → Products → Maak 3 one-time producten aan:
       Promotie 7 dagen   — €299 (eenmalig)
       Promotie 14 dagen  — €499 (eenmalig)
       Promotie 30 dagen  — €899 (eenmalig)
  2. Dashboard → Developers → Webhooks → Add endpoint:
       URL:    https://its-peanuts-backend.onrender.com/promotions/webhook
       Events: checkout.session.completed
     → Kopieer de Signing Secret → STRIPE_WEBHOOK_SECRET_PROMO
     (Of gebruik STRIPE_WEBHOOK_SECRET als je één gedeeld secret wilt)

Env vars:
  STRIPE_SECRET_KEY              sk_test_... (of sk_live_... na KvK)
  STRIPE_WEBHOOK_SECRET_PROMO    whsec_...  (apart of zelfde als billing)
  STRIPE_PRICE_PROMO_7D          price_...
  STRIPE_PRICE_PROMO_14D         price_...
  STRIPE_PRICE_PROMO_30D         price_...
  FRONTEND_URL                   https://vorzaiq.com
"""

import os
import stripe
import json
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.db import get_db
from backend import models
from backend.routers.auth import get_current_user, require_role
from backend.services.email import send_promotion_notification

router = APIRouter(prefix="/promotions", tags=["promotions"])

# ── Stripe configuratie ────────────────────────────────────────────────────────

STRIPE_SECRET_KEY     = os.getenv("STRIPE_SECRET_KEY", "")
# Aparte webhook secret voor promoties — valt terug op de billing secret
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET_PROMO") or os.getenv("STRIPE_WEBHOOK_SECRET", "")
FRONTEND_URL          = os.getenv("FRONTEND_URL", "https://vorzaiq.com")

stripe.api_key = STRIPE_SECRET_KEY

PROMO_PRICE_IDS: dict[int, str] = {
    7:  os.getenv("STRIPE_PRICE_PROMO_7D", ""),
    14: os.getenv("STRIPE_PRICE_PROMO_14D", ""),
    30: os.getenv("STRIPE_PRICE_PROMO_30D", ""),
}

PRICES: dict[int, float] = {
    7:  299.0,
    14: 499.0,
    30: 899.0,
}

PLATFORMS = ["facebook", "instagram", "google", "tiktok", "linkedin"]
PLATFORMS_JSON = json.dumps(PLATFORMS)


# ── Schemas ────────────────────────────────────────────────────────────────────

class CheckoutIn(BaseModel):
    duration_days: int   # 7, 14 of 30


class PromotionOut(BaseModel):
    id: int
    vacancy_id: int
    duration_days: int
    total_price: float
    status: str
    platforms: list
    created_at: str
    paid_at: Optional[str] = None
    starts_at: Optional[str] = None
    ends_at: Optional[str] = None

    class Config:
        from_attributes = True


# ── Helpers ────────────────────────────────────────────────────────────────────

def _to_out(p: models.PromotionRequest) -> PromotionOut:
    return PromotionOut(
        id=p.id,
        vacancy_id=p.vacancy_id,
        duration_days=p.duration_days,
        total_price=p.total_price,
        status=p.status,
        platforms=json.loads(p.platforms) if p.platforms else PLATFORMS,
        created_at=str(p.created_at),
        paid_at=str(p.paid_at) if p.paid_at else None,
        starts_at=str(p.starts_at) if p.starts_at else None,
        ends_at=str(p.ends_at) if p.ends_at else None,
    )


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/vacancies/{vacancy_id}/checkout")
def create_checkout(
    vacancy_id: int,
    payload: CheckoutIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Maak een Stripe Checkout Session aan voor een vacature-promotie.
    Geeft { checkout_url } terug — frontend redirect hier naartoe.
    """
    require_role(current_user, "employer")

    if payload.duration_days not in PRICES:
        raise HTTPException(status_code=400, detail="Ongeldige duur (kies 7, 14 of 30 dagen)")

    vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == vacancy_id).first()
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacature niet gevonden")
    if vacancy.employer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Geen toegang tot deze vacature")

    if not STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=503,
            detail="Stripe is niet geconfigureerd. Stel STRIPE_SECRET_KEY in.",
        )

    price_id = PROMO_PRICE_IDS.get(payload.duration_days)
    if not price_id:
        raise HTTPException(
            status_code=503,
            detail=f"Stripe Price ID niet ingesteld voor {payload.duration_days} dagen promotie",
        )

    # Maak PromotionRequest aan vóór checkout zodat we het ID als metadata kunnen meesturen
    promo = models.PromotionRequest(
        vacancy_id=vacancy_id,
        employer_id=current_user.id,
        platforms=PLATFORMS_JSON,
        duration_days=payload.duration_days,
        total_price=PRICES[payload.duration_days],
        status="pending_payment",
    )
    db.add(promo)
    db.commit()
    db.refresh(promo)

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            line_items=[{"price": price_id, "quantity": 1}],
            customer_email=current_user.email,
            metadata={
                "user_id":      str(current_user.id),
                "vacancy_id":   str(vacancy_id),
                "promotion_id": str(promo.id),
                "type":         "promotie",
            },
            success_url=f"{FRONTEND_URL}/employer?promo_success=1",
            cancel_url=f"{FRONTEND_URL}/employer",
        )
    except stripe.StripeError as e:
        db.delete(promo)
        db.commit()
        raise HTTPException(status_code=502, detail=f"Stripe fout: {getattr(e, 'user_message', str(e))}")

    promo.stripe_session_id = session.id
    db.commit()

    return {"checkout_url": session.url}


@router.get("/vacancies/{vacancy_id}", response_model=List[PromotionOut])
def list_vacancy_promotions(
    vacancy_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Lijst van alle promoties voor een specifieke vacature."""
    vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == vacancy_id).first()
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacature niet gevonden")
    if vacancy.employer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Geen toegang")

    promos = (
        db.query(models.PromotionRequest)
        .filter(models.PromotionRequest.vacancy_id == vacancy_id)
        .order_by(models.PromotionRequest.created_at.desc())
        .all()
    )
    return [_to_out(p) for p in promos]


@router.get("/", response_model=List[PromotionOut])
def list_my_promotions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Alle promoties van de ingelogde werkgever."""
    require_role(current_user, "employer")
    promos = (
        db.query(models.PromotionRequest)
        .filter(models.PromotionRequest.employer_id == current_user.id)
        .order_by(models.PromotionRequest.created_at.desc())
        .all()
    )
    return [_to_out(p) for p in promos]


@router.post("/webhook")
async def stripe_webhook_promotions(request: Request, db: Session = Depends(get_db)):
    """
    Stripe webhook voor promotie-betalingen (eenmalig).
    Registreer in Stripe Dashboard → Webhooks:
      URL:    https://its-peanuts-backend.onrender.com/promotions/webhook
      Events: checkout.session.completed
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

    event_dict: dict = dict(event)
    etype: str = str(event_dict.get("type", ""))
    data: dict = dict((event_dict.get("data") or {}).get("object") or {})

    if etype != "checkout.session.completed":
        return {"status": "ok"}

    meta = data.get("metadata") or {}
    if meta.get("type") != "promotie":
        return {"status": "ok"}  # Niet van ons (bijv. billing checkout)

    try:
        promotion_id = int(meta.get("promotion_id", 0) or 0)
    except (ValueError, TypeError):
        return {"status": "ok"}

    if not promotion_id:
        return {"status": "ok"}

    promo = db.query(models.PromotionRequest).filter(
        models.PromotionRequest.id == promotion_id
    ).first()

    if promo and promo.status == "pending_payment":
        promo.status = "paid"
        promo.paid_at = datetime.now(timezone.utc)
        promo.stripe_payment_intent_id = str(data.get("payment_intent") or "")
        db.commit()

        # Stuur admin notificatie
        vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == promo.vacancy_id).first()
        employer = db.query(models.User).filter(models.User.id == promo.employer_id).first()

        if vacancy and employer:
            try:
                send_promotion_notification(
                    vacancy_title=vacancy.title,
                    employer_name=employer.full_name or employer.email,
                    employer_email=employer.email,
                    duration_days=promo.duration_days,
                    total_price=promo.total_price,
                    promotion_id=promo.id,
                )
            except Exception:
                pass  # Email fout is niet fataal

    return {"status": "ok"}


@router.post("/{promotion_id}/activate")
def activate_promotion(
    promotion_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Admin markeert promotie als actief (campagnes zijn live)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Alleen admins kunnen promoties activeren")

    promo = db.query(models.PromotionRequest).filter(
        models.PromotionRequest.id == promotion_id
    ).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Promotie niet gevonden")

    now = datetime.now(timezone.utc)
    promo.status = "active"
    promo.starts_at = now
    promo.ends_at = now + timedelta(days=promo.duration_days)
    db.commit()
    return _to_out(promo)


@router.post("/{promotion_id}/complete")
def complete_promotion(
    promotion_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Admin markeert promotie als voltooid (campagnes zijn gestopt)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Alleen admins kunnen promoties voltooien")

    promo = db.query(models.PromotionRequest).filter(
        models.PromotionRequest.id == promotion_id
    ).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Promotie niet gevonden")

    promo.status = "completed"
    db.commit()
    return _to_out(promo)
