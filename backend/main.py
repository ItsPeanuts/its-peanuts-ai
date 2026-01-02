from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import engine
from backend.models import Base
from backend.routers import auth as auth_router

# IMPORTANT:
# Importing security dependency registers the Bearer scheme in OpenAPI
# (Swagger "Authorize" button appears when a security scheme exists.)
from backend.services.auth import oauth2_scheme  # noqa: F401

app = FastAPI(title="It's Peanuts AI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables automatically on boot
Base.metadata.create_all(bind=engine)

app.include_router(auth_router.router)


@app.get("/healthz")
def healthz():
    return {"status": "ok"}









