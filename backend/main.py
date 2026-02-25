import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.routers import auth as auth_router
from backend.routers import employer_vacancies as emp_vac_router
from backend.routers import candidate_cv as cand_cv_router
from backend.routers import candidate_applications as cand_app_router
from backend.routers import candidate_analyze as cand_analyze_router
from backend.routers import employer_applications as emp_app_router
from backend.routers import intake as intake_router
from backend.routers import ai as ai_router
from backend.routers import public_vacancies as public_vac_router

from backend.db import engine
from backend.models import Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="ItsPeanuts AI", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Register routers ---
app.include_router(auth_router.router)
app.include_router(emp_vac_router.router)
app.include_router(cand_cv_router.router)
app.include_router(cand_app_router.router)
app.include_router(cand_analyze_router.router)
app.include_router(emp_app_router.router)
app.include_router(intake_router.router)
app.include_router(ai_router.router, prefix="/ai", tags=["ai"])
app.include_router(public_vac_router.router)

frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")

if os.path.exists(frontend_path):
    app.mount("/static", StaticFiles(directory=frontend_path), name="static")

@app.get("/")
async def root():
    index_path = os.path.join(frontend_path, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Welcome to ItsPeanuts AI"}

@app.get("/health")
async def health():
    return {"status": "ok"}
