"""
WebSocket router voor Lisa AI recruiter chat.

Vervangt het HTTP polling model met een echte WebSocket verbinding.
De kandidaat stuurt berichten en ontvangt Lisa's antwoord streaming.

Endpoint: WS /ws/chat/{app_id}?token=<jwt>
"""

import json
import os
from typing import Dict

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from backend.db import SessionLocal
from backend import models
from backend.security import SECRET_KEY, ALGORITHM
from backend.routers.recruiter_chat import (
    _get_application_context,
    _build_system_prompt,
    _count_recruiter_messages,
    _get_conversation_history,
    _save_message,
    _call_ai,
    MAX_QUESTIONS,
)

router = APIRouter(tags=["websocket"])


class ConnectionManager:
    """Beheert actieve WebSocket verbindingen per applicatie."""

    def __init__(self):
        # app_id → list of active websockets
        self.active: Dict[int, list[WebSocket]] = {}

    async def connect(self, app_id: int, ws: WebSocket):
        await ws.accept()
        self.active.setdefault(app_id, []).append(ws)

    def disconnect(self, app_id: int, ws: WebSocket):
        if app_id in self.active:
            self.active[app_id] = [w for w in self.active[app_id] if w is not ws]

    async def send(self, ws: WebSocket, data: dict):
        await ws.send_text(json.dumps(data, ensure_ascii=False))


manager = ConnectionManager()


def _auth_user(token: str, db: Session) -> models.User | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub", 0))
        return db.query(models.User).filter(models.User.id == user_id).first()
    except (JWTError, ValueError):
        return None


@router.websocket("/ws/chat/{app_id}")
async def ws_chat(ws: WebSocket, app_id: int, token: str = ""):
    """
    WebSocket Lisa chat.

    Client stuurt: { "content": "antwoord van kandidaat" }
    Server stuurt: { "role": "recruiter"|"candidate", "content": "...", "ended": bool }
    """
    db: Session = SessionLocal()

    try:
        # Auth
        user = _auth_user(token, db)
        if not user or user.role not in ("candidate", "admin"):
            await ws.accept()
            await ws.send_text(json.dumps({"error": "Niet geautoriseerd"}))
            await ws.close(code=4001)
            return

        # Verificeer dat sollicitatie van deze kandidaat is (admin mag alles)
        app_query = db.query(models.Application).filter(models.Application.id == app_id)
        if user.role != "admin":
            app_query = app_query.filter(models.Application.candidate_id == user.id)
        app = app_query.first()
        if not app:
            await ws.accept()
            await ws.send_text(json.dumps({"error": "Sollicitatie niet gevonden"}))
            await ws.close(code=4004)
            return

        await manager.connect(app_id, ws)

        # Stuur bestaande chatgeschiedenis bij verbinden
        history_msgs = db.query(models.RecruiterChatMessage).filter(
            models.RecruiterChatMessage.application_id == app_id
        ).order_by(models.RecruiterChatMessage.created_at.asc()).all()

        recruiter_count = sum(1 for m in history_msgs if m.role == "recruiter")
        ended = recruiter_count > MAX_QUESTIONS

        for m in history_msgs:
            await manager.send(ws, {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "ended": ended,
            })

        # Wacht op berichten van kandidaat
        while True:
            try:
                raw = await ws.receive_text()
                data = json.loads(raw)
                content = (data.get("content") or "").strip()
                if not content:
                    continue

                if ended:
                    await manager.send(ws, {"error": "Gesprek is afgerond", "ended": True})
                    continue

                # Sla kandidaat bericht op
                candidate_msg = _save_message(app_id, "candidate", content, db)
                await manager.send(ws, {
                    "id": candidate_msg.id,
                    "role": "candidate",
                    "content": content,
                    "ended": False,
                })

                # Genereer Lisa's antwoord
                recruiter_count = _count_recruiter_messages(app_id, db)
                ctx = _get_application_context(app_id, db)
                system_prompt = _build_system_prompt(ctx)
                conv_history = _get_conversation_history(app_id, db)

                if recruiter_count >= MAX_QUESTIONS:
                    closing = (
                        f"Dit is je LAATSTE bericht. Bedank {ctx['candidate_name']} hartelijk voor de antwoorden. "
                        f"Zeg dat de werkgever zo snel mogelijk contact opneemt. Sluit vriendelijk af. "
                        f"BELANGRIJK: Stel ABSOLUUT GEEN nieuwe vragen meer. Eindig het gesprek definitief."
                    )
                    conv_history.append({"role": "user", "content": closing})
                    ended = True

                response_text = _call_ai(system_prompt, conv_history)
                recruiter_msg = _save_message(app_id, "recruiter", response_text, db)

                await manager.send(ws, {
                    "id": recruiter_msg.id,
                    "role": "recruiter",
                    "content": response_text,
                    "ended": ended,
                })

            except WebSocketDisconnect:
                break
            except json.JSONDecodeError:
                await manager.send(ws, {"error": "Ongeldig JSON formaat"})

    finally:
        manager.disconnect(app_id, ws)
        db.close()
