from __future__ import annotations

from sqlalchemy import Column, Integer, String, DateTime, func, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from backend.models.base import Base


class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (
        # 1 kandidaat kan maar 1x op dezelfde vacancy solliciteren
        UniqueConstraint("candidate_id", "vacancy_id", name="uq_app_candidate_vacancy"),
    )

    id = Column(Integer, primary_key=True, index=True)

    candidate_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    vacancy_id = Column(Integer, ForeignKey("vacancies.id", ondelete="CASCADE"), nullable=False, index=True)

    # applied | shortlisted | interview | rejected | hired
    status = Column(String(50), nullable=False, default="applied", index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    candidate = relationship("User", lazy="joined")
    vacancy = relationship("Vacancy", lazy="joined")
    intake_answers = relationship("IntakeAnswer", back_populates="application", cascade="all, delete-orphan")
    ai_results = relationship("AIResult", back_populates="application", cascade="all, delete-orphan")
