from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import engine
from backend.models import Base
from backend.routers import auth as auth_router

# Import registers bearer scheme for OpenAPI/Swagger
from backend.services.auth import oauth2_scheme  # noqa: F401

app = FastAPI(title="It's Peanuts AI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

app.include_router(auth_router.router)


@app.get("/healthz")
def healthz():
    return {"status": "ok"}










