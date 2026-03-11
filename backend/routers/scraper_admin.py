"""
Scraper Admin Router + Claim Flow

Endpoints (admin):
  POST /admin/scrape                      → start scraping
  GET  /admin/scraped-vacancies           → lijst per status
  POST /admin/scraped-vacancies/{id}/publish → publiceer als Vacancy
  DELETE /admin/scraped-vacancies/{id}    → verwijder record

Endpoints (publiek — claim flow):
  GET  /claim/{token}  → vacature info voor claim-pagina
  POST /claim/{token}  → werkgever registreert + vacancy wordt overgedragen
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.db import get_db, SessionLocal
from backend import models
from backend.routers.auth import get_current_user, require_role
from backend.security import hash_password, create_access_token
from backend.services.scraper import run_scraper

logger = logging.getLogger(__name__)

router = APIRouter(tags=["scraper-admin"])

SYSTEM_EMAIL = "system@itspeanuts.ai"


# ── Schemas ──────────────────────────────────────────────────────────────────

class ScrapeRequest(BaseModel):
    source: str  # "adzuna"|"arbeitnow"|"remoteok"|"google_jobs"|"jobbird"|"indeed"|"werkzoeken"|"custom"|"all"
    urls: Optional[List[str]] = None  # alleen bij source="custom"


class ScrapedVacancyOut(BaseModel):
    id: int
    title: str
    company_name: Optional[str]
    contact_email: Optional[str]  # optioneel — niet alle bronnen bevatten een e-mail
    location: Optional[str]
    source_name: Optional[str]
    source_url: Optional[str]
    status: str
    claim_notified: bool
    scraped_at: Optional[str]
    published_at: Optional[str]
    claimed_at: Optional[str]
    vacancy_id: Optional[int]

    class Config:
        from_attributes = True


class ScrapeResult(BaseModel):
    scraped: int
    saved: int
    skipped_duplicates: int


class ScrapeStarted(BaseModel):
    status: str
    message: str


class ClaimInfoOut(BaseModel):
    vacancy_title: str
    company_name: Optional[str]
    status: str


class ClaimRequest(BaseModel):
    company_name: str
    password: str


class ClaimResponse(BaseModel):
    access_token: str
    user_id: int
    vacancy_id: int


# ── Achtergrond-taak: opslaan na scrape ──────────────────────────────────────

def _save_batch(db: Session, raw: list) -> tuple:
    """Sla een lijst scraper-resultaten op. Geeft (saved, skipped) terug."""
    saved = 0
    skipped = 0
    for item in raw:
        src_url = item.get("source_url") or ""
        email = item.get("contact_email") or ""

        if src_url:
            existing = (
                db.query(models.ScrapedVacancy)
                .filter(models.ScrapedVacancy.source_url == src_url)
                .first()
            )
        elif email:
            existing = (
                db.query(models.ScrapedVacancy)
                .filter(
                    models.ScrapedVacancy.contact_email == email.lower(),
                    models.ScrapedVacancy.title == item["title"],
                )
                .first()
            )
        else:
            existing = None

        if existing:
            skipped += 1
            continue

        sv = models.ScrapedVacancy(
            title=item["title"],
            description=item.get("description"),
            company_name=item.get("company_name"),
            contact_email=email.lower() if email else None,
            location=item.get("location"),
            source_url=src_url or None,
            source_name=item.get("source_name"),
        )
        db.add(sv)
        saved += 1
    return saved, skipped


def _run_scrape_and_save(source: str, custom_urls: Optional[List[str]]) -> None:
    """
    Voert de scraper uit en slaat resultaten op in een eigen DB-sessie.
    Wordt aangeroepen als BackgroundTask zodat de HTTP-response meteen terugkomt.

    Bij source='all': elke bron wordt apart gerund en direct gecommit zodat
    een hangende bron (bijv. werkzoeken) de andere resultaten niet blokkeert.
    werkzoeken wordt NIET meegenomen in 'all' — te traag/onbetrouwbaar op cloud.
    """
    # Bij 'all': loop per bron en commit tussendoor
    if source == "all":
        sources = ["arbeitnow", "remoteok", "jobbird", "adzuna", "google_jobs", "indeed"]
    elif source == "custom":
        sources = ["custom"]
    else:
        sources = [source]

    db: Session = SessionLocal()
    total_found = 0
    total_saved = 0
    total_skipped = 0
    try:
        for src in sources:
            try:
                raw = run_scraper(source=src, custom_urls=custom_urls)
                saved, skipped = _save_batch(db, raw)
                db.commit()
                total_found += len(raw)
                total_saved += saved
                total_skipped += skipped
                logger.info(
                    "[scraper-admin] %s: %d gevonden, %d opgeslagen, %d skip",
                    src, len(raw), saved, skipped,
                )
            except Exception as exc:
                logger.error("[scraper-admin] %s mislukt: %s", src, exc, exc_info=True)
                db.rollback()

        logger.info(
            "[scraper-admin] Scrape TOTAAL: %d gevonden, %d opgeslagen, %d skip",
            total_found, total_saved, total_skipped,
        )
    finally:
        db.close()


# ── Admin endpoints ───────────────────────────────────────────────────────────

@router.post("/admin/scrape", response_model=ScrapeStarted)
def trigger_scrape(
    payload: ScrapeRequest,
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(get_current_user),
):
    """
    Start scraping op de achtergrond en retourneert meteen.
    Resultaten verschijnen in GET /admin/scraped-vacancies zodra de taak klaar is.
    """
    require_role(current_user, "admin")
    background_tasks.add_task(_run_scrape_and_save, payload.source, payload.urls)
    logger.info("[scraper-admin] Scrape gestart op achtergrond: source=%s", payload.source)
    return ScrapeStarted(
        status="started",
        message=f"Scraping '{payload.source}' gestart op de achtergrond. Resultaten verschijnen binnen 60 seconden in /admin/scraped-vacancies.",
    )


@router.get("/admin/scraped-vacancies", response_model=List[ScrapedVacancyOut])
def list_scraped_vacancies(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Lijst van gescrapede vacatures, optioneel gefilterd op status."""
    require_role(current_user, "admin")
    query = db.query(models.ScrapedVacancy).order_by(models.ScrapedVacancy.scraped_at.desc())
    if status:
        query = query.filter(models.ScrapedVacancy.status == status)
    items = query.offset(skip).limit(limit).all()

    return [
        ScrapedVacancyOut(
            id=sv.id,
            title=sv.title,
            company_name=sv.company_name,
            contact_email=sv.contact_email,
            location=sv.location,
            source_name=sv.source_name,
            source_url=sv.source_url,
            status=sv.status,
            claim_notified=sv.claim_notified,
            scraped_at=str(sv.scraped_at) if sv.scraped_at else None,
            published_at=str(sv.published_at) if sv.published_at else None,
            claimed_at=str(sv.claimed_at) if sv.claimed_at else None,
            vacancy_id=sv.vacancy_id,
        )
        for sv in items
    ]


@router.post("/admin/scraped-vacancies/{sv_id}/publish")
def publish_scraped_vacancy(
    sv_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Publiceer een gescrapede vacature:
    - Maak een Vacancy aan onder de systeem-werkgever
    - Zet status op 'published'
    """
    require_role(current_user, "admin")
    sv = db.query(models.ScrapedVacancy).filter(models.ScrapedVacancy.id == sv_id).first()
    if not sv:
        raise HTTPException(status_code=404, detail="ScrapedVacancy niet gevonden")
    if sv.status != "pending":
        raise HTTPException(status_code=409, detail=f"Status is al '{sv.status}', niet pending")

    # Zoek systeem-werkgever
    system_employer = (
        db.query(models.User).filter(models.User.email == SYSTEM_EMAIL).first()
    )
    if not system_employer:
        raise HTTPException(
            status_code=500,
            detail="Systeem-werkgever niet gevonden. Voer seed opnieuw uit.",
        )

    # Maak Vacancy aan
    vacancy = models.Vacancy(
        employer_id=system_employer.id,
        title=sv.title,
        description=sv.description or "",
        location=sv.location,
        source_type="scraped",
    )
    db.add(vacancy)
    db.commit()
    db.refresh(vacancy)

    # Update ScrapedVacancy
    sv.vacancy_id = vacancy.id
    sv.status = "published"
    sv.published_at = datetime.now(timezone.utc)
    db.commit()

    logger.info("[scraper-admin] ScrapedVacancy %d gepubliceerd als Vacancy %d", sv_id, vacancy.id)
    return {"vacancy_id": vacancy.id, "status": "published"}


@router.post("/admin/scraped-vacancies/publish-all")
def publish_all_pending(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Publiceer alle pending ScrapedVacancies in één keer.
    Handig voor bulk-import na een scrape-run.
    """
    require_role(current_user, "admin")

    system_employer = db.query(models.User).filter(models.User.email == SYSTEM_EMAIL).first()
    if not system_employer:
        raise HTTPException(status_code=500, detail="Systeem-werkgever niet gevonden. Voer seed opnieuw uit.")

    pending = db.query(models.ScrapedVacancy).filter(models.ScrapedVacancy.status == "pending").all()
    published = 0

    for sv in pending:
        vacancy = models.Vacancy(
            employer_id=system_employer.id,
            title=sv.title,
            description=sv.description or "",
            location=sv.location,
            source_type="scraped",
        )
        db.add(vacancy)
        db.flush()  # krijg vacancy.id
        sv.vacancy_id = vacancy.id
        sv.status = "published"
        sv.published_at = datetime.now(timezone.utc)
        published += 1

    db.commit()
    logger.info("[scraper-admin] Bulk publish: %d vacatures gepubliceerd", published)
    return {"published": published}


@router.delete("/admin/scraped-vacancies/{sv_id}")
def delete_scraped_vacancy(
    sv_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Verwijder een gescrapede vacature (en de bijbehorende Vacancy als die bestaat)."""
    require_role(current_user, "admin")
    sv = db.query(models.ScrapedVacancy).filter(models.ScrapedVacancy.id == sv_id).first()
    if not sv:
        raise HTTPException(status_code=404, detail="ScrapedVacancy niet gevonden")

    # Verwijder gekoppelde Vacancy (optioneel — als die er is)
    if sv.vacancy_id:
        vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == sv.vacancy_id).first()
        if vacancy:
            db.delete(vacancy)

    db.delete(sv)
    db.commit()
    return {"deleted": True}


# ── Claim endpoints (publiek) ─────────────────────────────────────────────────

@router.get("/claim/{token}", response_model=ClaimInfoOut)
def get_claim_info(token: str, db: Session = Depends(get_db)):
    """Geef vacature-info terug voor de claim-pagina (publiek)."""
    sv = (
        db.query(models.ScrapedVacancy)
        .filter(models.ScrapedVacancy.claim_token == token)
        .first()
    )
    if not sv:
        raise HTTPException(status_code=404, detail="Ongeldige of verlopen claim-link")
    if sv.status == "claimed":
        raise HTTPException(status_code=409, detail="Dit account is al geactiveerd")

    return ClaimInfoOut(
        vacancy_title=sv.title,
        company_name=sv.company_name,
        status=sv.status,
    )


@router.post("/claim/{token}", response_model=ClaimResponse)
def claim_vacancy(token: str, payload: ClaimRequest, db: Session = Depends(get_db)):
    """
    Werkgever activeert gratis account via claim-link:
    1. Maak employer User aan (email = contact_email uit ScrapedVacancy)
    2. Draag Vacancy over aan de nieuwe werkgever
    3. Update ScrapedVacancy.status = 'claimed'
    4. Geef JWT terug (werkgever direct ingelogd)
    """
    sv = (
        db.query(models.ScrapedVacancy)
        .filter(models.ScrapedVacancy.claim_token == token)
        .first()
    )
    if not sv:
        raise HTTPException(status_code=404, detail="Ongeldige of verlopen claim-link")
    if sv.status == "claimed":
        raise HTTPException(status_code=409, detail="Dit account is al geactiveerd")
    if sv.status != "published":
        raise HTTPException(
            status_code=400,
            detail="De vacature is nog niet goedgekeurd door de beheerder",
        )
    if not sv.vacancy_id:
        raise HTTPException(status_code=500, detail="Geen gekoppelde vacature gevonden")

    # Controleer wachtwoord-sterkte
    if len(payload.password) < 8:
        raise HTTPException(status_code=422, detail="Wachtwoord moet minimaal 8 tekens bevatten")

    # E-mail al in gebruik?
    existing = db.query(models.User).filter(models.User.email == sv.contact_email).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Er bestaat al een account met dit e-mailadres. Log in via de normale inlogpagina.",
        )

    # Werkgever aanmaken
    employer = models.User(
        email=sv.contact_email,
        full_name=payload.company_name.strip(),
        hashed_password=hash_password(payload.password),
        role="employer",
        plan="normaal",
    )
    db.add(employer)
    db.commit()
    db.refresh(employer)

    # Vacancy overdragen
    vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == sv.vacancy_id).first()
    if vacancy:
        vacancy.employer_id = employer.id
        db.commit()

    # ScrapedVacancy bijwerken
    sv.employer_id = employer.id
    sv.status = "claimed"
    sv.claimed_at = datetime.now(timezone.utc)
    db.commit()

    access_token = create_access_token(subject=str(employer.id))

    logger.info(
        "[claim] Werkgever %s heeft ScrapedVacancy %d geclaimd → Vacancy %d",
        employer.email, sv.id, sv.vacancy_id,
    )

    return ClaimResponse(
        access_token=access_token,
        user_id=employer.id,
        vacancy_id=sv.vacancy_id,
    )
