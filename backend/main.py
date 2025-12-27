from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# DB (tabellen automatisch aanmaken)
from backend.db import Base, engine

# Routers (als je bestanden/routers bestaan in jouw repo)
from backend.routers import ai, ats
from backend.routers import auth as auth_router

app = FastAPI(title="It's Peanuts AI", version="1.0.0")

# 1) Maak DB tabellen aan bij start
#    (Voor MVP is dit prima. Later vervangen we dit door migrations.)
Base.metadata.create_all(bind=engine)

# 2) CORS: probeer ALLOWED_ORIGINS uit config te halen, anders fallback
try:
    from backend.config import ALLOWED_ORIGINS  # type: ignore
    allowed_origins = ALLOWED_ORIGINS
except Exception:
    allowed_origins = [
        "http://localhost",
        "http://localhost:3000",
        "http://127.0.0.1:5500",
        "http://127.0.0.1:5173",
        "https://its-peanuts-ai.onrender.com",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3) Routers registreren
app.include_router(auth_router.router)
app.include_router(ai.router)
app.include_router(ats.router)

# 4) Health endpoint (Render health check)
@app.get("/healthz")
def healthz():
    return {"status": "ok"}




