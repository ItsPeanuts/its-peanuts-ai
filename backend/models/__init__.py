from backend.database import Base

from .candidate import Candidate
from .candidate_cv import CandidateCV
from .vacancy import Vacancy

__all__ = [
    "Base",
    "Candidate",
    "CandidateCV",
    "Vacancy",
]


