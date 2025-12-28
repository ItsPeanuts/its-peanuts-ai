import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend import models
from backend.services.auth import hash_password

router = APIRouter(prefix="/dev", tags=["dev"])

@router.post("/seed-candidate")
def seed_candidate(db: Session = Depends(get_db)):
    if os.getenv("ALLOW_DEV_SEED", "false").lower() != "true":
        raise HTTPException(status_code=403, detail="Seeding disabled")

    email = "admin@itspeanuts.ai"
    password = "Admin1234!"

    existing = db.query(models.Candidate).filter(models.Candidate.email == email).first()
    if existing:
        return {"status": "exists", "email": email}

    c = models.Candidate(
        email=email,
        hashed_password=hash_password(password),
        full_name="Admin",
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"status": "created", "id": c.id, "email": c.email, "password": password}
