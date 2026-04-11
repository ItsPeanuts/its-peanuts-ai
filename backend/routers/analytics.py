"""
Analytics — anonieme bezoekersregistratie.

POST /analytics/visit  — geen auth vereist, registreert een uniek dagbezoek via session token
"""

from datetime import date, datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from backend.db import get_db
from backend import models

router = APIRouter(prefix="/analytics", tags=["analytics"])


class VisitIn(BaseModel):
    session_id: str   # anonieme token vanuit browser (sessionStorage)


@router.post("/visit", status_code=200)
def record_visit(payload: VisitIn, db: Session = Depends(get_db)):
    """Registreer een uniek dagbezoek. Dubbele (session_id, date) combinaties worden genegeerd."""
    if not payload.session_id or len(payload.session_id) < 8:
        return {"ok": False}

    today = date.today()
    log = models.VisitorLog(session_id=payload.session_id[:64], date=today)
    db.add(log)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()  # al geregistreerd vandaag

    return {"ok": True}
