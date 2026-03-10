"""
ScrapedVacancy — opgeslagen vacatures die automatisch gescraped zijn van externe bronnen.

Flow:
1. Scraper vindt vacature met e-mailadres → ScrapedVacancy (status=pending)
2. Admin keurt goed → Vacancy aangemaakt onder systeem-werkgever (status=published)
3. Kandidaat solliciteert → claim-mail naar contact_email (eenmalig)
4. Werkgever claimt via link → account aangemaakt, vacancy overgedragen (status=claimed)
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from backend.models.base import Base


def _generate_token() -> str:
    return uuid.uuid4().hex + uuid.uuid4().hex  # 64-karakter token


class ScrapedVacancy(Base):
    __tablename__ = "scraped_vacancies"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Gescrapede inhoud
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    company_name = Column(String(500), nullable=True)
    contact_email = Column(String(255), nullable=True)  # None als geen e-mail gevonden op de pagina
    location = Column(String(255), nullable=True)
    source_url = Column(String(1000), nullable=True)
    source_name = Column(String(100), nullable=True)  # "adzuna"|"nvb"|"werkzoeken"|"custom"

    # Platform-koppelingen
    vacancy_id = Column(Integer, ForeignKey("vacancies.id", ondelete="SET NULL"), nullable=True)
    employer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Claim flow
    claim_token = Column(String(64), unique=True, nullable=False, default=_generate_token)
    status = Column(String(50), nullable=False, default="pending")
    # "pending" → nog niet goedgekeurd door admin
    # "published" → live als Vacancy, wacht op claim
    # "claimed" → werkgever heeft account aangemaakt

    claim_notified = Column(Boolean, default=False, nullable=False)
    # True zodra claim-mail verstuurd is (wordt maar 1x verstuurd)

    scraped_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    published_at = Column(DateTime(timezone=True), nullable=True)
    claimed_at = Column(DateTime(timezone=True), nullable=True)

    # Relaties
    vacancy = relationship("Vacancy", foreign_keys=[vacancy_id])
    employer = relationship("User", foreign_keys=[employer_id])
