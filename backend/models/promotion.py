from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func

from backend.models.base import Base


class PromotionRequest(Base):
    """
    Werkgever-aanvraag om een vacature te promoten op social media.
    Betaling via Stripe Checkout (eenmalige betaling).

    Platforms: altijd alle 5 — Facebook, Instagram, Google, TikTok, LinkedIn.
    Status: pending_payment → paid → active → completed (of cancelled)
    """
    __tablename__ = "promotion_requests"

    id = Column(Integer, primary_key=True, index=True)

    vacancy_id = Column(
        Integer,
        ForeignKey("vacancies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    employer_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # JSON: altijd ["facebook","instagram","google","tiktok","linkedin"]
    platforms = Column(
        String(255),
        nullable=False,
        default='["facebook","instagram","google","tiktok","linkedin"]',
    )

    duration_days = Column(Integer, nullable=False)   # 7, 14 of 30
    total_price = Column(Float, nullable=False)       # 299, 499 of 899

    # pending_payment | paid | active | completed | cancelled
    status = Column(String(30), nullable=False, default="pending_payment")

    stripe_session_id = Column(String(255), nullable=True)
    stripe_payment_intent_id = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    paid_at = Column(DateTime(timezone=True), nullable=True)
    starts_at = Column(DateTime(timezone=True), nullable=True)
    ends_at = Column(DateTime(timezone=True), nullable=True)
