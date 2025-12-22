import os

# CORS / Origins
raw_origins = os.getenv("ALLOWED_ORIGINS", "*").strip()
if raw_origins == "*" or raw_origins == "":
    ALLOWED_ORIGINS = ["*"]
else:
    ALLOWED_ORIGINS = [o.strip() for o in raw_origins.split(",") if o.strip()]

# Database
# Als Render geen DATABASE_URL heeft, gebruiken we SQLite als fallback
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./its_peanuts.db")

# Omgevingsnaam (optioneel)
APP_ENV = os.getenv("APP_ENV", "production")

