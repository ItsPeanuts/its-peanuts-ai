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
# Als Render geen DATABASE_URL heeft, gebruiken we SQLite als fallback
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./its_peanuts.db")

# ========== OPENAI ==========
# Altijd definiëren, ook als hij leeg is (zodat imports nooit falen)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# Als je later modelnaam / org nodig hebt:
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_ORG_ID = os.getenv("OPENAI_ORG_ID", "")


