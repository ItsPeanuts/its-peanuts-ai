"""
Seed: vaste test-accounts en een demo-vacature worden aangemaakt bij
elke opstart als ze er nog niet zijn. Zo gaan ze niet verloren na een
Render-herstart.

Inloggegevens:
  Admin     : zie ADMIN_EMAIL + ADMIN_PASSWORD env vars
              (default: admin@itspeanuts.ai / AdminPeanuts2025!)
  Werkgever : werkgever@test.nl  / TestPeanuts2025!
  Kandidaat : kandidaat@test.nl  / TestPeanuts2025!
"""

import os
from backend.db import SessionLocal
from backend import models
from backend.security import hash_password

WERKGEVER_EMAIL = "werkgever@test.nl"
KANDIDAAT_EMAIL = "kandidaat@test.nl"
TEST_PASSWORD   = "TestPeanuts2025!"

# Admin account — configureerbaar via env vars zodat het wachtwoord veilig is
ADMIN_EMAIL    = os.getenv("ADMIN_EMAIL", "admin@itspeanuts.ai")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "AdminPeanuts2025!")


def seed_test_data() -> None:
    db = SessionLocal()
    try:
        # ── 0. Admin account ───────────────────────────────────────────
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

        # ── 1. Test werkgever ──────────────────────────────────────────
        werkgever = db.query(models.User).filter_by(email=WERKGEVER_EMAIL).first()
        if not werkgever:
            werkgever = models.User(
                email=WERKGEVER_EMAIL,
                full_name="Test Werkgever",
                hashed_password=hash_password(TEST_PASSWORD),
                role="employer",
                plan="premium",
            )
            db.add(werkgever)
            db.commit()
            db.refresh(werkgever)
            print(f"[seed] werkgever aangemaakt: {WERKGEVER_EMAIL}")
        else:
            if werkgever.plan not in ("gratis", "normaal", "premium"):
                werkgever.plan = "premium"
                db.commit()
            print(f"[seed] werkgever bestaat al: {WERKGEVER_EMAIL}")

        # ── 2. Test kandidaat ──────────────────────────────────────────
        kandidaat = db.query(models.User).filter_by(email=KANDIDAAT_EMAIL).first()
        if not kandidaat:
            kandidaat = models.User(
                email=KANDIDAAT_EMAIL,
                full_name="Test Kandidaat",
                hashed_password=hash_password(TEST_PASSWORD),
                role="candidate",
            )
            db.add(kandidaat)
            db.commit()
            db.refresh(kandidaat)
            print(f"[seed] kandidaat aangemaakt: {KANDIDAAT_EMAIL}")
        else:
            print(f"[seed] kandidaat bestaat al: {KANDIDAAT_EMAIL}")

        # ── 3. Demo-vacature (gekoppeld aan test werkgever) ────────────
        existing_vacancy = (
            db.query(models.Vacancy)
            .filter_by(employer_id=werkgever.id, title="Full-Stack Developer (Demo)")
            .first()
        )
        if not existing_vacancy:
            vacancy = models.Vacancy(
                employer_id=werkgever.id,
                title="Full-Stack Developer (Demo)",
                location="Amsterdam (hybride)",
                hours_per_week="40 uur",
                salary_range="€3.500 – €5.500 per maand",
                description=(
                    "Wij zoeken een ervaren Full-Stack Developer die ons product "
                    "naar het volgende niveau helpt.\n\n"
                    "**Wat ga je doen?**\n"
                    "- Bouwen en onderhouden van onze Next.js/React frontend\n"
                    "- Ontwikkelen van FastAPI/Python backend services\n"
                    "- Opzetten en beheren van PostgreSQL databases\n"
                    "- Samenwerken in een Agile/Scrum team\n\n"
                    "**Wat breng je mee?**\n"
                    "- 3+ jaar ervaring met Python en/of TypeScript\n"
                    "- Kennis van React, Next.js of vergelijkbare frameworks\n"
                    "- Ervaring met REST API's en SQL databases\n"
                    "- Affiniteit met AI/ML is een pré\n\n"
                    "**Wat bieden wij?**\n"
                    "- Marktconform salaris + bonusregeling\n"
                    "- 25 vakantiedagen\n"
                    "- Laptop naar keuze\n"
                    "- Flexibele werktijden en thuiswerkmogelijkheden"
                ),
            )
            db.add(vacancy)
            db.commit()
            print("[seed] demo-vacature aangemaakt")
        else:
            print("[seed] demo-vacature bestaat al")

    finally:
        db.close()
