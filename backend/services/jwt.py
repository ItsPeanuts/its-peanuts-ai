# backend/services/jwt.py

from datetime import datetime, timedelta, timezone
from jose import jwt

# Render: zet JWT_SECRET in Environment Variables
JWT_SECRET = "change-me"  # wordt overschreven door env, zie onder
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30


def create_access_token(subject: str) -> str:
    """
    subject = user_id als string
    """
    now = datetime.now(timezone.utc)
    exp = now + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)

    payload = {
        "sub": str(subject),
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }

    # JWT_SECRET liever uit env halen (zie stap 3)
    import os
    secret = os.getenv("JWT_SECRET", JWT_SECRET)

    return jwt.encode(payload, secret, algorithm=JWT_ALGORITHM)

