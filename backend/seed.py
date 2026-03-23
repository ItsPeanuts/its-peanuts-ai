"""
Seed: vaste accounts worden aangemaakt bij elke opstart als ze er nog niet zijn.

Inloggegevens:
  Admin          : zie ADMIN_EMAIL + ADMIN_PASSWORD env vars
                   (default: admin@itspeanuts.ai / AdminPeanuts2025!)
  Systeem-user   : system@itspeanuts.ai (eigenaar van gescrapete vacatures)
"""

import os
from backend.db import SessionLocal
from backend import models
from backend.security import hash_password

SYSTEM_EMAIL = "system@itspeanuts.ai"

# Admin account — configureerbaar via env vars zodat het wachtwoord veilig is
ADMIN_EMAIL    = os.getenv("ADMIN_EMAIL", "admin@itspeanuts.ai")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "AdminPeanuts2025!")


def seed_test_data() -> None:
    db = SessionLocal()
    try:
        # ── Admin account ───────────────────────────────────────────────
        admin = db.query(models.User).filter_by(email=ADMIN_EMAIL).first()
        if not admin:
            admin = models.User(
                email=ADMIN_EMAIL,
                full_name="Admin",
                hashed_password=hash_password(ADMIN_PASSWORD),
                role="admin",
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            print(f"[seed] admin aangemaakt: {ADMIN_EMAIL}")
        else:
            # Altijd wachtwoord bijwerken zodat env var wijziging direct effect heeft
            admin.hashed_password = hash_password(ADMIN_PASSWORD)
            admin.role = "admin"
            db.commit()
            print(f"[seed] admin bijgewerkt: {ADMIN_EMAIL}")

        # ── Systeem-werkgever (eigenaar van gescrapete vacatures) ───────
        system_user = db.query(models.User).filter_by(email=SYSTEM_EMAIL).first()
        if not system_user:
            system_user = models.User(
                email=SYSTEM_EMAIL,
                full_name="ItsPeanuts AI Platform",
                hashed_password=hash_password("SysP3anutsX!2025#"),
                role="employer",
                plan="normaal",
            )
            db.add(system_user)
            db.commit()
            db.refresh(system_user)
            print(f"[seed] systeem-werkgever aangemaakt: {SYSTEM_EMAIL}")
        else:
            print(f"[seed] systeem-werkgever bestaat al: {SYSTEM_EMAIL}")

    finally:
        db.close()
