from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import ALLOWED_ORIGINS
from backend.db import init_db

from backend.routers import ai, ats
from backend.routers import auth as auth_router
from backend.routers import profile as profile_router
from backend.routers import jobs as jobs_router
from backend.routers import applications as applications_router

init_db()

app = FastAPI(
    title="It's Peanuts AI Recruiter Suite",
    version="0.2.0"
)

origins = ["*"] if ALLOWED_ORIGINS.strip() == "*" else [o.strip() for o in ALLOWED_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "ok", "product": "Its Peanuts AI Recruiter Suite"}

# bestaande
app.include_router(ai.router, prefix="/ai", tags=["AI"])
app.include_router(ats.router, prefix="/ats", tags=["ATS"])

# nieuw (kandidaat platform)
app.include_router(auth_router.router, prefix="/auth", tags=["Auth"])
app.include_router(profile_router.router, prefix="/profile", tags=["Profile"])
app.include_router(jobs_router.router, prefix="/jobs", tags=["Jobs"])
app.include_router(applications_router.router, prefix="/applications", tags=["Applications"])



