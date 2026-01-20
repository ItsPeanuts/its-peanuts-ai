from __future__ import annotations

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text, inspect

from backend.db import engine
from backend import models
from backend.models import Base

from backend.routers.auth import router as auth_router
from backend.routers.employer_vacancies import router as employer_vacancies_router
from backend.routers.candidate_cv import router as candidate_cv_router
from backend.routers.candidate_applications import router as candidate_applications_router
from backend.routers.employer_applications import router as employer_applications_router
from backend.routers.intake import router as intake_router
from backend.routers.candidate_analyze import router as candidate_analyze_router


def ensure_db_schema():
    # Create missing tables
    Base.metadata.create_all(bind=engine)

    # Fix missing columns on existing tables (your earlier pain)
    insp = inspect(engine)

    def ensure_column(table: str, col: str, ddl: str):
        if not insp.has_table(table):
            return
        cols = {c["name"] for c in insp.get_columns(table)}
        if col in cols:
            return
        with engine.begin() as conn:
            conn.execute(text(f'ALTER TABLE "{table}" ADD COLUMN IF NOT EXISTS {ddl};'))

    # candidate_cvs must contain these columns for analyze
    ensure_column("candidate_cvs", "source_filename", "source_filename VARCHAR(255)")
    ensure_column("candidate_cvs", "source_content_type", "source_content_type VARCHAR(100)")
    ensure_column("candidate_cvs", "extracted_text", "extracted_text TEXT")

    # users plan (optional)
    ensure_column("users", "plan", "plan VARCHAR(50)")


app = FastAPI(
    title="It's Peanuts AI",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup():
    ensure_db_schema()


# Routers
app.include_router(auth_router)
app.include_router(employer_vacancies_router)
app.include_router(candidate_cv_router)
app.include_router(candidate_applications_router)
app.include_router(employer_applications_router)
app.include_router(intake_router)
app.include_router(candidate_analyze_router)


@app.get("/health", tags=["health"])
def health():
    return {"ok": True, "env": os.getenv("RENDER", "0")}













