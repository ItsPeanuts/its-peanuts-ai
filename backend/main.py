# backend/main.py
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.db import engine
from backend.models import Base  # imports User/Vacancy via __init__
from backend.routers import auth, employer_vacancies

# Create tables (MVP). Later: Alembic migrations.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="It's Peanuts AI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(employer_vacancies.router)

@app.get("/health")
def health():
    return {"status": "ok"}













