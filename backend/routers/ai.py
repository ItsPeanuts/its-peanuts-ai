from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from openai import OpenAI
from sqlalchemy.orm import Session
from jose import jwt, JWTError
import os
import json
import requests as _requests
from bs4 import BeautifulSoup

from backend.db import get_db
from backend import models
from backend.security import SECRET_KEY, ALGORITHM

_oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

def _optional_user(token: str | None = Depends(_oauth2), db: Session = Depends(get_db)):
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        uid = int(payload.get("sub", 0))
        return db.query(models.User).filter(models.User.id == uid).first()
    except (JWTError, ValueError):
        return None

router = APIRouter()

# =========================
# OpenAI client
# =========================

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    print("WAARSCHUWING: OPENAI_API_KEY is niet ingesteld.")

client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None


# =========================
# Pydantic modellen
# =========================

class RewriteCVRequest(BaseModel):
    cv_text: str
    target_role: Optional[str] = None
    language: str = "nl"


class RewriteCVResponse(BaseModel):
    rewritten_cv: str


class MotivationLetterRequest(BaseModel):
    cv_text: str
    job_description: str
    company_name: Optional[str] = None
    language: str = "nl"
    tone: str = "professioneel"


class MotivationLetterResponse(BaseModel):
    letter: str


class MatchJobRequest(BaseModel):
    candidate_profile_text: str
    job_description: str


class MatchJobResponse(BaseModel):
    match_score: int
    explanation: str


# =========================
# Helpers
# =========================

def ensure_client():
    if client is None:
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY is niet ingesteld in de omgeving."
        )
    return client


# =========================
# Endpoint: CV herschrijven
# =========================

@router.post("/rewrite-cv", response_model=RewriteCVResponse)
def rewrite_cv(payload: RewriteCVRequest) -> RewriteCVResponse:
    """
    Herschrijf een CV netjes voor recruiters.
    """
    c = ensure_client()

    system_prompt = (
        "Je bent een Nederlandse recruitment-copywriter. "
        "Je herschrijft CV-tekst netjes, duidelijk en professioneel, "
        "zodat recruiters het makkelijk kunnen scannen. "
        "Gebruik duidelijke kopjes (Profiel, Werkervaring, Opleiding, Vaardigheden) "
        "en bulletpoints. Houd de toon zakelijk maar menselijk."
    )

    if payload.target_role:
        user_extra = (
            f"De kandidaat wil solliciteren als: {payload.target_role}. "
            "Benadruk ervaring en vaardigheden die daarbij passen."
        )
    else:
        user_extra = "Herschrijf de CV-tekst professioneel, zonder iets te verzinnen."

    user_content = (
        f"{user_extra}\n\n"
        f"CV-tekst:\n{payload.cv_text}"
    )

    try:
        resp = c.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ]
        )
        rewritten = resp.choices[0].message.content.strip()
        return RewriteCVResponse(rewritten_cv=rewritten)
    except Exception as e:
        # Fout netjes teruggeven i.p.v. 500 naar frontend
        msg = (
            "ER GING IETS MIS BIJ OPENAI: "
            f"{str(e)}"
        )
        return RewriteCVResponse(rewritten_cv=msg)


# =========================
# Endpoint: Motivatiebrief
# =========================

@router.post("/motivation-letter", response_model=MotivationLetterResponse)
def motivation_letter(payload: MotivationLetterRequest) -> MotivationLetterResponse:
    """
    Schrijf een motivatiebrief op basis van CV + vacaturetekst.
    """
    c = ensure_client()

    company_line = (
        f"De brief is gericht aan: {payload.company_name}.\n"
        if payload.company_name
        else "Noem het bedrijf algemeen (bijvoorbeeld 'uw organisatie').\n"
    )

    system_prompt = (
        "Je bent een Nederlandse recruiter die sterke motivatiebrieven schrijft. "
        "Je schrijft in de ik-vorm, professioneel en concreet. "
        "Maximaal ongeveer 3/4 A4, duidelijke opbouw: intro, waarom de functie/organisatie, "
        "wat breng ik mee, afronding met call-to-action."
    )

    user_content = (
        f"{company_line}"
        f"Toon: {payload.tone}.\n\n"
        f"CV-tekst:\n{payload.cv_text}\n\n"
        f"Vacaturetekst:\n{payload.job_description}"
    )

    try:
        resp = c.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ]
        )
        letter = resp.choices[0].message.content.strip()
        return MotivationLetterResponse(letter=letter)
    except Exception as e:
        msg = (
            "ER GING IETS MIS BIJ OPENAI BIJ HET MAKEN VAN DE MOTIVATIEBRIEF: "
            f"{str(e)}"
        )
        return MotivationLetterResponse(letter=msg)


# =========================
# Endpoint: Matchscore kandidaat <-> vacature
# =========================

@router.post("/match-job", response_model=MatchJobResponse)
def match_job(payload: MatchJobRequest) -> MatchJobResponse:
    """
    Laat AI een matchscore (0-100) geven tussen kandidaatprofiel en vacature.
    """
    c = ensure_client()

    system_prompt = (
        "Je bent een ervaren recruiter. "
        "Je krijgt een samenvatting van een kandidaat en een vacaturetekst. "
        "Je beoordeelt hoe goed de kandidaat past bij de vacature.\n\n"
        "Geef:\n"
        "- Een matchscore tussen 0 en 100 (alleen hele getallen).\n"
        "- Een korte uitleg in het Nederlands waarom je deze score geeft.\n\n"
        "Geef ALLEEN een JSON-object terug met de keys 'match_score' (int) en 'explanation' (string)."
    )

    user_content = (
        "KANDIDAATPROFIEL:\n"
        f"{payload.candidate_profile_text}\n\n"
        "VACATURETEKST:\n"
        f"{payload.job_description}"
    )

    try:
        resp = c.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            response_format={"type": "json_object"}
        )

        raw = resp.choices[0].message.content
        data = json.loads(raw)

        score = int(data.get("match_score", 0))
        explanation = data.get("explanation", "").strip() or "Geen uitleg ontvangen."

        # Zorg dat score altijd netjes tussen 0 en 100 blijft
        if score < 0:
            score = 0
        if score > 100:
            score = 100

        return MatchJobResponse(match_score=score, explanation=explanation)
    except Exception as e:
        # Geen harde 500 naar de voorkant, maar een nette fallback
        fallback_explanation = (
            "Er ging iets mis bij het berekenen van de matchscore met OpenAI. "
            f"Technische fout: {str(e)}"
        )
        return MatchJobResponse(match_score=0, explanation=fallback_explanation)


# =========================
# Endpoint: Motivatiebrief voor vacature (ingelogde kandidaat)
# =========================

class MotivationForVacancyResponse(BaseModel):
    letter: str


class GenerateVacancyRequest(BaseModel):
    prompt: str  # korte beschrijving van de werkgever
    website_url: Optional[str] = None  # optioneel: bedrijfswebsite


class GenerateVacancyResponse(BaseModel):
    title: str
    location: str
    hours_per_week: str
    salary_range: str
    description: str


@router.post("/motivation-letter-for-vacancy/{vacancy_id}", response_model=MotivationForVacancyResponse)
def motivation_letter_for_vacancy(
    vacancy_id: int,
    current_user: models.User = Depends(_optional_user),
    db: Session = Depends(get_db),
) -> MotivationForVacancyResponse:
    """Genereer een motivatiebrief op basis van het CV en de vacature van de ingelogde kandidaat."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Niet ingelogd")

    vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == vacancy_id).first()
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacature niet gevonden")

    cv = (
        db.query(models.CandidateCV)
        .filter(models.CandidateCV.candidate_id == current_user.id)
        .order_by(models.CandidateCV.id.desc())
        .first()
    )
    cv_text = cv.extracted_text if cv else ""
    job_text = vacancy.description or vacancy.extracted_text or ""

    if not cv_text:
        raise HTTPException(status_code=400, detail="Geen CV gevonden. Upload eerst je CV.")

    c = ensure_client()
    try:
        resp = c.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Je bent een Nederlandse recruitment-copywriter. "
                        "Schrijf een sterke, persoonlijke motivatiebrief in de ik-vorm. "
                        "Professioneel, concreet, max 3/4 A4. "
                        "Opbouw: intro, waarom deze functie/organisatie, wat breng ik mee, call-to-action."
                    ),
                },
                {
                    "role": "user",
                    "content": f"CV:\n{cv_text[:3000]}\n\nVACATURE:\n{job_text[:2000]}",
                },
            ],
        )
        letter = resp.choices[0].message.content.strip()
        return MotivationForVacancyResponse(letter=letter)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI fout: {exc}")


# =========================
# Endpoint: Vacature genereren
# =========================

def _scrape_website(url: str, max_chars: int = 3000) -> str:
    """Haal tekst op van een website. Geeft lege string terug bij fouten."""
    try:
        resp = _requests.get(url, timeout=8, headers={"User-Agent": "Mozilla/5.0"})
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        # Verwijder scripts, styles en nav
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        text = soup.get_text(separator=" ", strip=True)
        # Normaliseer witruimte
        text = " ".join(text.split())
        return text[:max_chars]
    except Exception:
        return ""


@router.post("/generate-vacancy", response_model=GenerateVacancyResponse)
def generate_vacancy(
    payload: GenerateVacancyRequest,
    current_user: models.User = Depends(_optional_user),
) -> GenerateVacancyResponse:
    """Genereer een complete vacaturetekst op basis van een korte omschrijving."""
    if not current_user or current_user.role not in ("employer", "admin"):
        raise HTTPException(status_code=403, detail="Alleen werkgevers kunnen vacatures genereren")

    c = ensure_client()

    # Bedrijfscontext ophalen van de website (optioneel)
    company_context = ""
    if payload.website_url:
        company_context = _scrape_website(payload.website_url)

    company_block = (
        f"\n\nBEDRIJFSINFO VAN {payload.website_url}:\n{company_context}"
        if company_context
        else ""
    )

    try:
        resp = c.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Je bent een Nederlandse recruitment-copywriter. "
                        "Je krijgt een korte omschrijving van een werkgever en maakt daar een complete vacature van. "
                        "Als er bedrijfsinformatie beschikbaar is, gebruik je de toon, cultuur en waarden van dat bedrijf. "
                        "Geef ALLEEN een JSON-object terug met deze keys:\n"
                        "- title (string): de functietitel\n"
                        "- location (string): locatie, leeg als onbekend\n"
                        "- hours_per_week (string): bijv. '40 uur' of '32-40 uur'\n"
                        "- salary_range (string): bijv. '€3.500 - €5.000 per maand', leeg als onbekend\n"
                        "- description (string): volledige vacaturetekst met kopjes: "
                        "Wat ga je doen?, Wat breng je mee?, Wat bieden wij? "
                        "Gebruik markdown (**, bulletpoints). Max 400 woorden."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Maak een vacature op basis van deze omschrijving:\n{payload.prompt}"
                        f"{company_block}"
                    ),
                },
            ],
            response_format={"type": "json_object"},
        )
        data = json.loads(resp.choices[0].message.content)
        return GenerateVacancyResponse(
            title=data.get("title", "").strip(),
            location=data.get("location", "").strip(),
            hours_per_week=data.get("hours_per_week", "").strip(),
            salary_range=data.get("salary_range", "").strip(),
            description=data.get("description", "").strip(),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI fout: {exc}")
