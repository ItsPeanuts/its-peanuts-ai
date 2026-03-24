"""
Vacature Promoties — Social Media Advertising via Stripe Checkout

Prijzen (alle platforms: Facebook, Instagram, Google, TikTok, LinkedIn):
  7 dagen  → €299
  14 dagen → €499
  30 dagen → €899

Flow:
1. POST /promotions/vacancies/{id}/checkout  → Stripe Checkout Session aanmaken
2. Stripe redirect naar success_url na betaling
3. POST /promotions/webhook                  → status="paid", email admin
4. Admin zet campagnes op, markeert als "active" via admin panel

Env vars (deelt met billing.py):
  STRIPE_SECRET_KEY      sk_live_... of sk_test_...
  STRIPE_WEBHOOK_SECRET  whsec_... (registreer /promotions/webhook in Stripe dashboard)
  FRONTEND_URL           https://its-peanuts-frontend.onrender.com
"""

import os
import json
import stripe
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
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
FRONTEND_URL          = os.getenv("FRONTEND_URL", "https://its-peanuts-frontend.onrender.com")

if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY

# Prijzen in centen (inclusief BTW, excl. Stripe fee)
PRICES: dict[int, int] = {
    7:  29900,   # €299
    14: 49900,   # €499
    30: 89900,   # €899
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

    # Controleer dat de vacature van deze werkgever is
    vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == vacancy_id).first()
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacature niet gevonden")
    if vacancy.employer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Geen toegang tot deze vacature")

    if not STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=503,
            detail=(
                "Stripe is niet geconfigureerd. "
                "Stel STRIPE_SECRET_KEY in als omgevingsvariabele."
            ),
        )

    price_cents = PRICES[payload.duration_days]
    price_euros = price_cents / 100

    # Maak PromotionRequest aan
    promo = models.PromotionRequest(
        vacancy_id=vacancy_id,
        employer_id=current_user.id,
        platforms=PLATFORMS_JSON,
        duration_days=payload.duration_days,
        total_price=price_euros,
        status="pending_payment",
    )
    db.add(promo)
    db.commit()
    db.refresh(promo)

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card", "ideal"],
            line_items=[{
                "price_data": {
                    "currency": "eur",
                    "unit_amount": price_cents,
                    "product_data": {
                        "name": f"Vacature promoten: {vacancy.title}",
                        "description": (
                            f"{payload.duration_days} dagen op Facebook, Instagram, "
                            f"Google, TikTok en LinkedIn"
                        ),
                    },
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=f"{FRONTEND_URL}/employer/promotie/succes?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{FRONTEND_URL}/employer/promotie/geannuleerd",
            customer_email=current_user.email,
            metadata={
                "promotion_id": str(promo.id),
                "vacancy_id": str(vacancy_id),
                "employer_id": str(current_user.id),
                "duration_days": str(payload.duration_days),
            },
        )
    except stripe.StripeError as e:
        # Verwijder de aanvraag als Stripe mislukt
        db.delete(promo)
        db.commit()
        raise HTTPException(status_code=502, detail=f"Stripe fout: {str(e)}")

    # Sla Stripe session ID op
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
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Stripe webhook voor promotie-betalingen.
    Registreer in Stripe Dashboard: https://.../promotions/webhook
    Events: checkout.session.completed
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    if not STRIPE_WEBHOOK_SECRET:
        import json as _json
        event = stripe.Event.construct_from(_json.loads(payload), stripe.api_key)
    else:
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
        except stripe.errors.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Ongeldige Stripe handtekening")

    if event["type"] == "checkout.session.completed":
        session_obj = event["data"]["object"]
        metadata = session_obj.get("metadata", {})
        promotion_id = int(metadata.get("promotion_id", 0))

        if promotion_id:
            promo = db.query(models.PromotionRequest).filter(
                models.PromotionRequest.id == promotion_id
            ).first()

            if promo and promo.status == "pending_payment":
                promo.status = "paid"
                promo.paid_at = datetime.now(timezone.utc)
                promo.stripe_payment_intent_id = session_obj.get("payment_intent")
                db.commit()

                # Email naar admin
                vacancy = db.query(models.Vacancy).filter(
                    models.Vacancy.id == promo.vacancy_id
                ).first()
                employer = db.query(models.User).filter(
                    models.User.id == promo.employer_id
                ).first()

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
