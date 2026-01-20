from __future__ import annotations

import os
import sys
import time
from typing import Optional

from fastapi import FastAPI
from fastapi.responses import PlainTextResponse
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError


def _database_url() -> str:
    url = os.getenv("DATABASE_URL", "").strip()
    if not url:
        raise RuntimeError("DATABASE_URL is not set")

    # Render Postgres often provides postgres:// which SQLAlchemy expects as postgresql://
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    return url


def _make_engine():
    url = _database_url()

    # Keep it simple & robust for Render
    # pool_pre_ping helps with stale connections
    return create_engine(url, pool_pre_ping=True, future=True)


def _wait_for_db(engine, timeout_seconds: int = 25) -> None:
    """DB can be briefly unavailable on deploy/restart; wait a bit to reduce startup flakiness."""
    start = time.time()
    last_err: Optional[Exception] = None
    while time.time() - start < timeout_seconds:
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return
        except Exception as e:  # noqa: BLE001
            last_err = e
            time.sleep(1)
    raise RuntimeError(f"Database not reachable after {timeout_seconds}s: {last_err}") from last_err


def _ensure_schema_minimum(engine) -> None:
    """
    Minimal 'self-healing' migrations.
    This avoids 500 errors like:
    - users.password_hash does not exist
    - candidate_cvs.source_filename does not exist
    and similar.
    """
    # These ALTERs are safe: IF NOT EXISTS prevents failure if column already exists.
    # NOTE: We do NOT drop anything here.
    stmts = [
        # ---- USERS ----
        "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);",
        "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS role VARCHAR(50);",
        "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS plan VARCHAR(50);",
        "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;",

        # ---- CANDIDATE_CVS ----
        "ALTER TABLE IF EXISTS candidate_cvs ADD COLUMN IF NOT EXISTS source_filename VARCHAR(255);",
        "ALTER TABLE IF EXISTS candidate_cvs ADD COLUMN IF NOT EXISTS source_content_type VARCHAR(100);",
        "ALTER TABLE IF EXISTS candidate_cvs ADD COLUMN IF NOT EXISTS extracted_text TEXT;",
        "ALTER TABLE IF EXISTS candidate_cvs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;",

        # ---- VACANCIES ----
        "ALTER TABLE IF EXISTS vacancies ADD COLUMN IF NOT EXISTS extracted_text TEXT;",
        "ALTER TABLE IF EXISTS vacancies ADD COLUMN IF NOT EXISTS source_type VARCHAR(50);",
        "ALTER TABLE IF EXISTS vacancies ADD COLUMN IF NOT EXISTS source_filename VARCHAR(255);",
        "ALTER TABLE IF EXISTS vacancies ADD COLUMN IF NOT EXISTS source_storage_key VARCHAR(255);",
        "ALTER TABLE IF EXISTS vacancies ADD COLUMN IF NOT EXISTS source_content_type VARCHAR(100);",

        # ---- APPLICATIONS / AI RESULTS (if tables exist) ----
        "ALTER TABLE IF EXISTS applications ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;",
        "ALTER TABLE IF EXISTS ai_results ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;",
    ]

    with engine.begin() as conn:
        for s in stmts:
            conn.execute(text(s))


def _try_import_real_app() -> Optional[FastAPI]:
    """
    We try to import your real FastAPI app from your existing code.
    This prevents breaking all your endpoints.
    """
    candidates = [
        ("backend.main_app", "app"),
        ("backend.app", "app"),
        ("backend.api", "app"),
        ("backend.main", "app_real"),  # in case you renamed it
    ]
    for module_name, attr in candidates:
        try:
            mod = __import__(module_name, fromlist=[attr])
            app = getattr(mod, attr)
            if isinstance(app, FastAPI):
                return app
        except Exception:
            continue
    return None


def _build_bootstrap_app(startup_error: str) -> FastAPI:
    app = FastAPI(title="It's Peanuts AI (bootstrap)")

    @app.get("/", response_class=PlainTextResponse)
    def root():
        return "Service is starting / bootstrap mode"

    @app.get("/health", response_class=PlainTextResponse)
    def health():
        return "ok"

    @app.get("/_bootstrap_error", response_class=PlainTextResponse)
    def bootstrap_error():
        return startup_error

    return app


# ---------- Startup sequence ----------
startup_error_msg = ""
try:
    engine = _make_engine()
    _wait_for_db(engine, timeout_seconds=25)
    _ensure_schema_minimum(engine)
except Exception as e:  # noqa: BLE001
    startup_error_msg = f"BOOTSTRAP FAILED: {type(e).__name__}: {e}"

# Try to import the real app AFTER schema fixes
_real = None
if not startup_error_msg:
    try:
        # Import your original app module (your endpoints) if it exists
        # You likely have `app = FastAPI()` somewhere else already.
        # If not found, bootstrap stays active.
        _real = _try_import_real_app()
    except Exception as e:  # noqa: BLE001
        startup_error_msg = f"REAL APP IMPORT FAILED: {type(e).__name__}: {e}"

# Expose FastAPI app to uvicorn
if _real is not None:
    app = _real
else:
    app = _build_bootstrap_app(startup_error_msg or "Real app not found")












