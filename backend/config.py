import os

# ========== APP / ENV ==========
APP_ENV = os.getenv("APP_ENV", "production")

# ========== CORS / ORIGINS ==========
raw_origins = os.getenv("ALLOWED_ORIGINS", "*").strip()
if raw_origins in ("*", ""):
    ALLOWED_ORIGINS = ["*"]
else:
    ALLOWED_ORIGINS = [o.strip() for o in raw_origins.split(",") if o.strip()]

# ========== DATABASE ==========
# Fallback naar SQLite als Render geen DATABASE_URL heeft
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./its_peanuts.db")

# ========== OPENAI ==========
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_ORG_ID = os.getenv("OPENAI_ORG_ID", "")

# ========== AUTH / JWT ==========
# Let op: voor productie wil je deze via Render env vars instellen.
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALG = os.getenv("JWT_ALG", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "43200"))  # 30 dagen

# ========== OPTIONAL: COOKIE / FRONTEND ==========
FRONTEND_URL = os.getenv("FRONTEND_URL", "")



