# backend/models/__init__.py
from __future__ import annotations

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Import models once so metadata is complete
from .user import User  # noqa: F401,E402
from .vacancy import Vacancy  # noqa: F401,E402



