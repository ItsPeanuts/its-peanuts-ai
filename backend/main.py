import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.routers import auth, employer_vacancies
from backend.routers import candidate_applications, employer_applications
from backend.routers import candidate_cv, candidate_analyze
from backend.routers import ai as ai_router
from backend.routers.public_vacancies import router as public_router
from backend.routers import recruiter_chat
from backend.routers import interview_scheduler
from backend.routers import teams_bot
from backend.routers import crm_integration

app = FastAPI(title="ItsPeanuts AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(employer_vacancies.router)
app.include_router(candidate_applications.router)
app.include_router(employer_applications.router)
app.include_router(candidate_cv.router)
app.include_router(candidate_analyze.router)
app.include_router(ai_router.router, prefix="/ai", tags=["ai"])
app.include_router(recruiter_chat.router)
app.include_router(interview_scheduler.router)
app.include_router(teams_bot.router)
app.include_router(crm_integration.router)
app.include_router(public_router)

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
