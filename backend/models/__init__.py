# backend/models/__init__.py

from backend.database import Base  # noqa: F401

# Importeer elk model exact 1x zodat SQLAlchemy registry en MetaData niet dubbel vullen.
from .candidate import Candidate  # noqa: F401
from .cv import CandidateCV  # noqa: F401
from .employer import Employer  # noqa: F401
from .vacancy import Vacancy  # noqa: F401




