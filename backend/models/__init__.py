# backend/models/__init__.py

"""
Belangrijk:
- Alle SQLAlchemy modellen moeten hier geïmporteerd worden
  zodat Base.metadata.create_all() ze "ziet" en de tabellen aanmaakt.
"""

from backend.database import Base  # noqa: F401

# Importeer ALLE model-bestanden hieronder.
# Als je een modelbestand hernoemt, pas dit ook hier aan.

from .candidate import Candidate  # noqa: F401
from .employer import Employer  # noqa: F401
from .vacancy import Vacancy  # noqa: F401
from .candidate_cv import CandidateCV  # noqa: F401
from .questionnaire import ScreeningSession, ScreeningQuestion, ScreeningAnswer  # noqa: F401



