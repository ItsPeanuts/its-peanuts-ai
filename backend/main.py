from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import engine
from backend.models import Base
from backend.routers import auth as auth_router
from backend.routers import vacancies as vacancies_router
from backend.routers import cv as cv_router

app = FastAPI(title="It's Peanuts AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables automatically on boot (Postgres)
Base.metadata.create_all(bind=engine)

# Routers
app.include_router(auth_router.router)
app.include_router(vacancies_router.router)
app.include_router(cv_router.router)


@app.get("/healthz")
def healthz():
    return {"status": "ok"}











