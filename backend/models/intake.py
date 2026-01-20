from __future__ import annotations

from sqlalchemy import Column, Integer, String, Text, DateTime, func, ForeignKey
from sqlalchemy.orm import relationship

from backend.models.base import Base


class IntakeQuestion(Base):
    __tablename__ = "intake_questions"

    id = Column(Integer, primary_key=True, index=True)
    vacancy_id = Column(Integer, ForeignKey("vacancies.id", ondelete="CASCADE"), nullable=False, index=True)

    # text | yes_no | single_choice | multi_choice | number
    qtype = Column(String(50), nullable=False, default="text")
    question = Column(Text, nullable=False)

    # JSON string (optional) for choice options
    options_json = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    vacancy = relationship("Vacancy", lazy="joined")


class IntakeAnswer(Base):
    __tablename__ = "intake_answers"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("intake_questions.id", ondelete="CASCADE"), nullable=False, index=True)

    answer = Column(Text, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    application = relationship("Application", back_populates="intake_answers", lazy="joined")
    question = relationship("IntakeQuestion", lazy="joined")
