from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import engine
from backend.models import Base

# Belangrijk: dit triggert het autoloaden van alle model-modules in backend/models/
import backend.models  # noqa: F401

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

# Tables aanmaken bij boot
Base.metadata.create_all(bind=engine)

# Routers
app.include_router(auth_router.router)
app.include_router(employer_vacancies_router.router)


@app.get("/healthz")
def healthz():
    return {"status": "ok"}















