from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import engine

# Belangrijk: importeer models zodat alle tabellen geregistreerd zijn op Base.metadata
from backend import models  # noqa: F401
from backend.models import Base

from backend.routers import auth as auth_router
from backend.routers import employer_vacancies as employer_vacancies_router

app = FastAPI(title="It's Peanuts AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables automatically on boot
Base.metadata.create_all(bind=engine)

# Routers
app.include_router(auth_router.router)
app.include_router(employer_vacancies_router.router)


@app.get("/healthz")
def healthz():
    return {"status": "ok"}














