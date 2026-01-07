# backend/main.py
from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.models import Base
from backend.db import engine

from backend.routers.auth import router as auth_router
from backend.routers.employer_vacancies import router as employer_vacancies_router
from backend.routers.candidate_cv import router as candidate_cv_router


app = FastAPI(title="It's Peanuts AI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # later beperken
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MVP: create tables on startup (later vervangen door Alembic migrations)
Base.metadata.create_all(bind=engine)

app.include_router(auth_router)
app.include_router(employer_vacancies_router)
app.include_router(candidate_cv_router)












