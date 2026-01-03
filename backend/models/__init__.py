# backend/models/__init__.py

from backend.database import Base

from .candidate import Candidate
from .cv import CandidateCV
from .vacancy import Vacancy
from .application import Application

__all__ = ["Base", "Candidate", "CandidateCV", "Vacancy", "Application"]
