from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import APP_ENV
from backend.db import init_db
from backend.routers import ai, ats

# Maak database tabellen aan
init_db()

app = FastAPI(
    title="It's Peanuts AI Recruiter Suite",
    version="0.1.0"
)

# CORS: frontend toegang geven tot API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # later kun je dit beperken
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "ok", "product": "Its Peanuts AI Recruiter Suite"}

# Routers toevoegen
app.include_router(ai.router, prefix="/ai", tags=["AI"])
app.include_router(ats.router, prefix="/ats", tags=["ATS"])


