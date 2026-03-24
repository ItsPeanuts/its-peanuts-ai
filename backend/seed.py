"""
Seed: vaste accounts worden aangemaakt bij elke opstart als ze er nog niet zijn.

Inloggegevens:
  Admin          : zie ADMIN_EMAIL + ADMIN_PASSWORD env vars
                   (default: admin@itspeanuts.ai / AdminPeanuts2025!)
  Systeem-user   : system@itspeanuts.ai (eigenaar van gescrapete vacatures)
  Test werkgever : werkgever@test.nl / TestPeanuts2025!
  Test kandidaat : kandidaat@test.nl / TestPeanuts2025!
"""

import os
from backend.db import SessionLocal
from backend import models
from backend.security import hash_password

SYSTEM_EMAIL = "system@itspeanuts.ai"

# Admin account — configureerbaar via env vars zodat het wachtwoord veilig is
ADMIN_EMAIL    = os.getenv("ADMIN_EMAIL", "admin@itspeanuts.ai")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "AdminPeanuts2025!")

TEST_PASSWORD = "TestPeanuts2025!"


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

        # ── Test werkgever ───────────────────────────────────────────────
        test_employer = db.query(models.User).filter_by(email="werkgever@test.nl").first()
        if not test_employer:
            test_employer = models.User(
                email="werkgever@test.nl",
                full_name="Test Werkgever BV",
                hashed_password=hash_password(TEST_PASSWORD),
                role="employer",
                plan="normaal",
            )
            db.add(test_employer)
            db.commit()
            db.refresh(test_employer)
            print(f"[seed] test werkgever aangemaakt: werkgever@test.nl")

            # Voeg een test vacature toe (actief zodat deze zichtbaar is)
            test_vacancy = models.Vacancy(
                employer_id=test_employer.id,
                title="Python Developer (Medior)",
                location="Amsterdam",
                hours_per_week="40",
                salary_range="€4.000 - €5.500",
                description=(
                    "Wij zoeken een gedreven Python Developer die ons platform naar het volgende niveau brengt. "
                    "Je werkt aan de backend van ons AI-recruitmentsysteem en draagt bij aan nieuwe features.\n\n"
                    "Wat je meebrengt:\n"
                    "- 3+ jaar ervaring met Python en FastAPI of Django\n"
                    "- Kennis van PostgreSQL en REST API's\n"
                    "- Affiniteit met AI en machine learning is een pré\n\n"
                    "Wat wij bieden:\n"
                    "- Marktconform salaris\n"
                    "- Hybride werken (2 dagen kantoor, rest remote)\n"
                    "- Laptop naar keuze en thuiswerkvergoeding"
                ),
                employment_type="fulltime",
                work_location="hybride",
                interview_type="both",
                status="actief",
            )
            db.add(test_vacancy)
            db.commit()
            print("[seed] test vacature aangemaakt: Python Developer (Medior)")
        else:
            print("[seed] test werkgever bestaat al: werkgever@test.nl")

        # ── Test kandidaat ───────────────────────────────────────────────
        test_candidate = db.query(models.User).filter_by(email="kandidaat@test.nl").first()
        if not test_candidate:
            test_candidate = models.User(
                email="kandidaat@test.nl",
                full_name="Test Kandidaat",
                hashed_password=hash_password(TEST_PASSWORD),
                role="candidate",
            )
            db.add(test_candidate)
            db.commit()
            print(f"[seed] test kandidaat aangemaakt: kandidaat@test.nl")
        else:
            print(f"[seed] test kandidaat bestaat al: kandidaat@test.nl")

    finally:
        db.close()
