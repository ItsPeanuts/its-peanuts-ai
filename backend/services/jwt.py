from datetime import datetime, timedelta, timezone
from jose import jwt
from backend.settings import settings


def create_access_token(subject: str, expires_minutes: int | None = None) -> str:
    """
    Create a signed JWT access token.
    subject: usually the user id (string)
    """
    if expires_minutes is None:
        expires_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES

    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=expires_minutes)

    payload = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }

    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
