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
                email_verified=True,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            print(f"[seed] admin aangemaakt: {ADMIN_EMAIL}")
        else:
            # Altijd wachtwoord bijwerken zodat env var wijziging direct effect heeft
            admin.hashed_password = hash_password(ADMIN_PASSWORD)
            admin.role = "admin"
            admin.email_verified = True
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
                email_verified=True,
            )
            db.add(system_user)
            db.commit()
            db.refresh(system_user)
            print(f"[seed] systeem-werkgever aangemaakt: {SYSTEM_EMAIL}")
        else:
            system_user.email_verified = True
            db.commit()
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
                email_verified=True,
            )
            db.add(test_employer)
            db.commit()
            db.refresh(test_employer)
            print("[seed] test werkgever aangemaakt: werkgever@test.nl")
        else:
            # Zorg dat plan altijd normaal is (zodat vacature-limiet geen probleem is)
            test_employer.plan = "normaal"
            test_employer.email_verified = True
            db.commit()
            print("[seed] test werkgever bestaat al: werkgever@test.nl")

        # ── Test vacatures (altijd upsert zodat filters testbaar zijn) ───
        SEED_VACANCIES = [
            {
                "title": "Python Developer (Medior)",
                "location": "Amsterdam",
                "hours_per_week": "40",
                "salary_range": "€4.000 - €5.500",
                "employment_type": "fulltime",
                "work_location": "hybride",
                "description": (
                    "Wij zoeken een gedreven Python Developer die ons platform naar het volgende niveau brengt. "
                    "Je werkt aan de backend van ons AI-recruitmentsysteem en draagt bij aan nieuwe features.\n\n"
                    "Vereisten: 3+ jaar Python/FastAPI, PostgreSQL, affiniteit met AI."
                ),
            },
            {
                "title": "UX Designer (Parttime)",
                "location": "Rotterdam",
                "hours_per_week": "24",
                "salary_range": "€2.800 - €3.800",
                "employment_type": "parttime",
                "work_location": "hybride",
                "description": (
                    "Versterk ons designteam als UX Designer. "
                    "Je werkt aan de gebruikerservaring van ons recruitmentplatform.\n\n"
                    "Vereisten: Figma, gebruikersonderzoek, 2+ jaar ervaring."
                ),
            },
            {
                "title": "Frontend Developer (Freelance)",
                "location": "Utrecht",
                "hours_per_week": "32-40",
                "salary_range": "€65 - €85 per uur",
                "employment_type": "freelance",
                "work_location": "remote",
                "description": (
                    "Freelance opdracht voor een ervaren React/Next.js developer. "
                    "Bouw mee aan onze candidate-portal.\n\n"
                    "Vereisten: React, TypeScript, Next.js, minimaal 4 jaar ervaring."
                ),
            },
            {
                "title": "Marketing Stage",
                "location": "Den Haag",
                "hours_per_week": "32",
                "salary_range": "€500 stagevergoeding",
                "employment_type": "stage",
                "work_location": "op-locatie",
                "description": (
                    "Loopt je HBO of WO-studie richting marketing of communicatie? "
                    "Dan zoeken wij jou als stagiair voor ons groeiteam.\n\n"
                    "Vereisten: Studerend, creatief, social media ervaring is een pré."
                ),
            },
        ]

        for vd in SEED_VACANCIES:
            existing = (
                db.query(models.Vacancy)
                .filter_by(employer_id=test_employer.id, title=vd["title"])
                .first()
            )
            if not existing:
                db.add(models.Vacancy(
                    employer_id=test_employer.id,
                    title=vd["title"],
                    location=vd["location"],
                    hours_per_week=vd["hours_per_week"],
                    salary_range=vd["salary_range"],
                    employment_type=vd["employment_type"],
                    work_location=vd["work_location"],
                    description=vd["description"],
                    interview_type="both",
                    status="actief",
                ))
                print(f"[seed] test vacature aangemaakt: {vd['title']}")
            else:
                # Zorg dat alle velden altijd correct zijn
                existing.employment_type = vd["employment_type"]
                existing.work_location = vd["work_location"]
                existing.interview_type = "both"
                existing.status = "actief"
                print(f"[seed] test vacature bijgewerkt: {vd['title']}")
        db.commit()

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
