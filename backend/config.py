import os

def _get(name: str, default: str | None = None) -> str | None:
    return os.getenv(name, default)

APP_ENV = _get("APP_ENV", "prod")

DATABASE_URL = _get("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set")

JWT_SECRET = _get("JWT_SECRET", "change-me-in-render")
JWT_ALG = "HS256"
JWT_EXPIRE_MINUTES = int(_get("JWT_EXPIRE_MINUTES", "43200"))  # 30 dagen

OPENAI_API_KEY = _get("OPENAI_API_KEY", "")

ALLOWED_ORIGINS = _get("ALLOWED_ORIGINS", "*")  # kommapunt/komma separated of *

