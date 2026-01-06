# backend/main.py
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.db import engine
from backend.models import Base

# Import model modules so tables are registered on Base.metadata
from backend.models import user as _user  # noqa: F401
from backend.models import vacancy as _vacancy  # noqa: F401
from backend.models import cv as _cv  # noqa: F401

from backend.routers.auth import router as auth_router
from backend.routers.employer_vacancies import router as employer_vacancies_router
from backend.routers.candidate_cv import router as candidate_cv_router


Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="It's Peanuts AI",
    version="0.1.0",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # later beperken
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(employer_vacancies_router)
app.include_router(candidate_cv_router)


@app.get("/")
def root():
    return {"status": "ok"}













