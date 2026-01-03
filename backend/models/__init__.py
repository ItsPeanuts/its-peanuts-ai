# backend/models/__init__.py
from backend.database import Base

# Existing models
from .candidate import Candidate  # noqa: F401

# New model(s)
from .vacancy import Vacancy  # noqa: F401

# Relationships (backrefs) are declared inside models.


