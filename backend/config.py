import os

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALG = os.getenv("JWT_ALG", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))

DATABASE_URL = os.getenv("DATABASE_URL", "")

BOOTSTRAP_TOKEN = os.getenv("BOOTSTRAP_TOKEN", "")



