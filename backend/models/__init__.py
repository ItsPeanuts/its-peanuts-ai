from backend.database import Base

# Import all models so SQLAlchemy can discover them
from .candidate import Candidate
from .vacancy import Vacancy
from .candidate_cv import CandidateCV

__all__ = [
    "Base",
    "Candidate",
    "Vacancy",
    "CandidateCV",
]


