import asyncio
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, WebSocket, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from backend.db import engine, SessionLocal
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
from backend.routers import employer_team as employer_team_router
from backend.routers import ws_chat
from backend.routers import virtual_interview
from backend.routers import billing as billing_router
from backend.routers import scraper_admin as scraper_admin_router
from backend.routers import promotions as promotions_router
from backend.routers import analytics as analytics_router
from backend.services.email import send_employer_review_reminder

logger = logging.getLogger(__name__)


# ── Dagelijkse herinnerings-taak ──────────────────────────────────────────────

def _send_pending_review_reminders() -> int:
    """
    Vind sollicitaties waar het interview 5+ dagen geleden is afgerond en de
    werkgever nog niet heeft gereageerd (status nog steeds 'applied').
    Stuur maximaal 3 herinneringen per sollicitatie (dag 5, 6, 7).
    Retourneert het aantal verzonden herinneringen.
    """
    from backend import models

    db = SessionLocal()
    sent = 0
    try:
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(days=5)

        # Sollicitaties met afgerond interview, status ongewijzigd, minder dan 3 reminders
        pending = (
            db.query(models.Application)
            .filter(
                models.Application.interview_completed_at.isnot(None),
                models.Application.interview_completed_at <= cutoff,
                models.Application.status == "applied",
                models.Application.employer_reminder_count < 3,
            )
            .all()
        )

        for app in pending:
            vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == app.vacancy_id).first()
            if not vacancy:
                continue
            employer = db.query(models.User).filter(models.User.id == vacancy.employer_id).first()
            candidate = db.query(models.User).filter(models.User.id == app.candidate_id).first()
            if not employer or not candidate:
                continue

            days_waiting = (now - app.interview_completed_at).days
            try:
                send_employer_review_reminder(
                    employer_email=employer.email,
                    candidate_name=candidate.full_name or "Kandidaat",
                    vacancy_title=vacancy.title or "Vacature",
                    days_waiting=days_waiting,
                )
                app.employer_reminder_count += 1
                db.commit()
                sent += 1
            except Exception as exc:
                logger.warning("[reminder] Fout bij herinnering app=%s: %s", app.id, exc)
    finally:
        db.close()
    return sent


async def _daily_reminder_loop() -> None:
    """Achtergrondtaak die elke 24 uur herinneringen verstuurt."""
    while True:
        await asyncio.sleep(60 * 60 * 24)  # 24 uur
        try:
            sent = _send_pending_review_reminders()
            if sent:
                logger.info("[reminder] %d herinneringen verstuurd", sent)
        except Exception as exc:
            logger.error("[reminder] Dagelijkse taak mislukt: %s", exc)


@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    # Startup: plan dagelijkse herinneringen
    task = asyncio.create_task(_daily_reminder_loop())
    # Stuur ook meteen bij opstarten (voor gemiste reminders)
    try:
        sent = _send_pending_review_reminders()
        if sent:
            logger.info("[reminder] Startup: %d herinneringen verstuurd", sent)
    except Exception as exc:
        logger.error("[reminder] Startup check mislukt: %s", exc)
    yield
    # Shutdown
    task.cancel()


# ── Rate limiter ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="ItsPeanuts AI",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    lifespan=lifespan,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS — alleen eigen domeinen ──────────────────────────────────────────────
ALLOWED_ORIGINS = [
    "https://vorzaiq.com",
    "https://www.vorzaiq.com",
    "https://api.vorzaiq.com",
]

# Lokale ontwikkeling alleen toestaan als expliciet geconfigureerd
if os.getenv("ALLOW_LOCAL_CORS", "false").lower() == "true":
    ALLOWED_ORIGINS += ["http://localhost:3000", "http://localhost:8000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
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
app.include_router(employer_team_router.router)
app.include_router(ws_chat.router)
app.include_router(virtual_interview.router)
app.include_router(billing_router.router)
app.include_router(scraper_admin_router.router)
app.include_router(promotions_router.router)
app.include_router(analytics_router.router)
app.include_router(public_router)


@app.get("/status", tags=["status"])
def site_status():
    """Publiek endpoint — geeft maintenance-status terug."""
    from backend import state
    return {"maintenance": state.maintenance["enabled"], "message": state.maintenance["message"]}


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
    from backend.db import SessionLocal
    from sqlalchemy import text
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return {"status": "ok", "db": "ok"}
    except Exception as e:
        return {"status": "degraded", "db": str(e)}


@app.websocket("/live-chat/{app_id}")
async def live_chat_alias(ws: WebSocket, app_id: int, token: str = ""):
    """
    Alias WebSocket endpoint — zelfde logica als /ws/chat/{app_id}.
    Gebruikt een ander pad om te werken als Cloudflare /ws/* paden blokkeert.
    """
    await ws_chat.ws_chat(ws, app_id, token)
