from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from backend.models.base import Base


class PaymentLog(Base):
    __tablename__ = "payment_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user_email = Column(String, nullable=True)   # snapshot
    user_name = Column(String, nullable=True)    # snapshot
    plan = Column(String, nullable=True)         # normaal | premium | per_vacature
    interval = Column(String, nullable=True)     # month | year | None
    amount = Column(Float, nullable=True)        # in euros (excl. VAT)
    amount_total = Column(Float, nullable=True)  # as charged (from Stripe amount_total)
    currency = Column(String, default="eur")
    payment_type = Column(String, nullable=True) # subscription | per_vacature
    stripe_session_id = Column(String, nullable=True, unique=True)
    invoice_number = Column(String, nullable=True, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)
