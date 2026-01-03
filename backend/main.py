from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import engine
from backend.models import Base
from backend.schema_patch import ensure_schema

from backend.routers import auth as auth_router
from backend.routers import employer as employer_router
from backend.routers import candidate as candidate_router

app = FastAPI(title="It's Peanuts AI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    # 1) maak ontbrekende tabellen aan
    Base.metadata.create_all(bind=engine)
    # 2) patch bestaande tabellen (oude DB) -> bv role toevoegen
    ensure_schema(engine)


app.include_router(auth_router.router)
app.include_router(employer_router.router)
app.include_router(candidate_router.router)


@app.get("/healthz")
def healthz():
    return {"status": "ok"}













