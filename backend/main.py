from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.db import engine
from backend.models import Base
from backend.routers import auth, employer_vacancies

app = FastAPI(
    title="It's Peanuts AI",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# DATABASE TABLES
Base.metadata.create_all(bind=engine)

# ROUTERS
app.include_router(auth.router)
app.include_router(employer_vacancies.router)


@app.get("/healthz")
def healthz():
    return {"status": "ok"}















