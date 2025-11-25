from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import Base, engine
from .routers import ai


# Later komen hier tabellen bij, voor nu is dit oké
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="It's Peanuts AI Recruiter Suite",
    version="0.1.0"
)

# CORS: zodat je frontend later met de backend mag praten
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # later kun je dit strenger maken
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "ok", "product": "Its Peanuts AI Recruiter Suite"}


# AI-routes
app.include_router(ai.router, prefix="/ai", tags=["AI"])
