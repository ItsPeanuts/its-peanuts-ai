from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db import Base, engine
from routers import ai

# Database tabellen aanmaken (voor later als we meer modellen hebben)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="It's Peanuts AI Recruiter Suite",
    version="0.1.0"
)

# CORS (voor straks als de frontend erop komt)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # later eventueel beperken
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "ok", "product": "Its Peanuts AI Recruiter Suite"}


# AI-routes
app.include_router(ai.router, prefix="/ai", tags=["AI"])
