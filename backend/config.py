import os
from dotenv import load_dotenv

# Laad .env (alleen lokaal, niet op Render)
load_dotenv()

# DATABASE URL — Render geeft hem in ENV
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./its-peanuts-ai.db")

# OPENAI API KEY
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# APP ENV
APP_ENV = os.getenv("APP_ENV", "production")

