import os
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError

ALGORITHM = "HS256"
JWT_SECRET = os.getenv("JWT_SECRET", "")

if not JWT_SECRET:
    # Fallback to something explicit so it fails clearly in prod if forgotten
    raise RuntimeError("JWT_SECRET is not set")


def create_access_token(subject: str, expires_days: int = 30) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=expires_days)
    payload = {"sub": subject, "iat": int(now.timestamp()), "exp": int(expire.timestamp())}
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
    except JWTError as e:
        raise ValueError("Invalid token") from e



