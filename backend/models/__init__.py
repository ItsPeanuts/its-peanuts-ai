from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Import models ONCE here (no autoload, no scanning)
from .user import User  # noqa: E402,F401
from .vacancy import Vacancy  # noqa: E402,F401
from .cv import CandidateCV  # noqa: E402,F401



