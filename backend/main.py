import os
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.db import engine
from backend.models import Base

Base.metadata.create_all(bind=engine)

from backend.seed import seed_test_data
seed_test_data()

from backend.routers import auth, employer_vacancies
from backend.routers import candidate_applications, employer_applications
from backend.routers import candidate_cv, candidate_analyze
from backend.routers import ai as ai_router
from backend.routers.public_vacancies import router as public_router
from backend.routers import recruiter_chat
from backend.routers import interview_scheduler
from backend.routers import teams_bot
from backend.routers import crm_integration
from backend.routers import integrations_status
from backend.routers import intake as intake_router
from backend.routers import admin as admin_router
from backend.routers import ws_chat
from backend.routers import virtual_interview
from backend.routers import billing as billing_router
from backend.routers import scraper_admin as scraper_admin_router
from backend.routers import promotions as promotions_router

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
app.include_router(integrations_status.router)
app.include_router(intake_router.router)
app.include_router(admin_router.router)
app.include_router(ws_chat.router)
app.include_router(virtual_interview.router)
app.include_router(billing_router.router)
app.include_router(scraper_admin_router.router)
app.include_router(promotions_router.router)
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

@app.get("/debug/routes")
async def debug_routes():
    """Tijdelijk endpoint: geeft alle geregistreerde routes terug voor diagnose."""
    from fastapi.routing import APIRoute, APIWebSocketRoute
    routes = []
    for r in app.router.routes:
        if hasattr(r, "path"):
            routes.append({
                "path": r.path,
                "type": "websocket" if isinstance(r, APIWebSocketRoute) else "http",
            })
    return {"count": len(routes), "routes": routes}


@app.websocket("/live-chat/{app_id}")
async def live_chat_alias(ws: WebSocket, app_id: int, token: str = ""):
    """
    Alias WebSocket endpoint — zelfde logica als /ws/chat/{app_id}.
    Gebruikt een ander pad om te werken als Cloudflare /ws/* paden blokkeert.
    """
    await ws_chat.ws_chat(ws, app_id, token)
