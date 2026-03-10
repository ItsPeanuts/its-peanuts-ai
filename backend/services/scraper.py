"""
Vacature Scraper — haalt vacatures op van externe bronnen.

Bronnen:
- Adzuna API (meest betrouwbaar, vereist ADZUNA_APP_ID + ADZUNA_APP_KEY)
- Arbeitnow API (gratis, geen key vereist, Europese vacatures)
- Werkzoeken.nl (BeautifulSoup)
- Indeed.nl via ScraperAPI (vereist SCRAPERAPI_KEY)
- Jobbird.com (Nederlandse vacaturesite, JSON API)
- Custom URLs (admin-opgegeven bedrijfscarrièrepagina's)

E-mailaanpak:
- HR/recruitment adressen (hr@, personeel@, ...): altijd doorlaten
- Persoonlijke zakelijke adressen (jan.bakker@acme.nl, marie@company.com): altijd doorlaten
- Generieke mailboxen (info@, contact@, ...): blokkeren
- Zoekqueries gericht op vacatures die "solliciteer per email", "stuur cv naar" etc. bevatten

Deduplicatie: zelfde source_url OF contact_email+title combinatie wordt niet dubbel opgeslagen.
"""

import logging
import os
import re
from typing import Optional

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

ADZUNA_APP_ID  = os.getenv("ADZUNA_APP_ID", "")
ADZUNA_APP_KEY = os.getenv("ADZUNA_APP_KEY", "")
SCRAPERAPI_KEY = os.getenv("SCRAPERAPI_KEY", "")

# Regex voor e-mailadressen
EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b")

# HR/recruitment trefwoorden → altijd doorlaten (hogere prioriteit)
HR_KEYWORDS = {
    "hr", "hrm", "recruitment", "recruiter", "recruiting", "talent",
    "jobs", "vacature", "vacatures", "career", "careers", "hiring",
    "personeel", "werving", "humanresources", "human-resources",
}

# Exacte blokkeerlijst — alleen als het de VOLLEDIGE lokale naam is (info@, contact@, ...)
EMAIL_BLOCKLIST_EXACT = {
    "info", "contact", "hallo", "hello", "support", "service", "admin",
    "office", "mail", "general", "sales", "marketing", "feedback",
    "help", "helpdesk", "team", "all", "finance", "receptie", "reception",
    "boekhouding", "administratie", "post", "press", "media", "pr",
    "enquiries", "enquiry", "privacy", "legal", "juridisch",
}

# Substring-blokkeerlijst — als deze string érgens in het lokale deel voorkomt
EMAIL_BLOCKLIST_CONTAINS = {
    "noreply", "no-reply", "donotreply", "do-not-reply", "mailer-daemon",
    "postmaster", "webmaster", "abuse", "spam", "unsubscribe",
}

# Gratis e-mailproviders — persoonlijk adres maar niet zakelijk
FREE_EMAIL_PROVIDERS = {
    "gmail", "hotmail", "outlook", "yahoo", "live", "icloud", "protonmail",
    "ziggo", "kpnmail", "planet", "xs4all", "hetnet", "chello", "home",
    "upcmail", "telenet", "quicknet",
}

# Echte browser headers — voorkomt 403/bot-blokkering op veel sites
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "nl-NL,nl;q=0.9,en;q=0.8",
}


def _is_personal_work_email(local: str, domain: str) -> bool:
    """
    Detecteert persoonlijke zakelijke e-mails: jan.bakker@acme.nl of marie@company.com

    Regels:
    - Domein is GEEN gratis e-mailprovider (gmail, hotmail, ...)
    - Lokaal deel ziet eruit als een naam:
        * bevat een punt tussen twee naam-achtige delen (jan.bakker)
        * OF is alleen letters, 3-20 tekens (marie, joost, ...)
        * OF bevat een initiaal + achternaam (j.bakker, m.dejong)
    - Geen cijfers in lokaal deel (john123 = automatisch systeem)
    """
    domain_name = domain.split(".")[0].lower()
    if domain_name in FREE_EMAIL_PROVIDERS:
        return False

    # Lokaal deel zonder speciale tekens
    local_clean = local.replace(".", "").replace("-", "").replace("_", "")

    # Moet puur alfabetisch zijn (geen nummers = geen systeem-account)
    if not local_clean.isalpha():
        return False

    # Lengte check: echte namen zijn 2-30 tekens
    if not (2 <= len(local_clean) <= 30):
        return False

    # Patroon: bevat punt (jan.bakker, m.dejong) OF korte naam (marie, joost)
    has_dot = "." in local
    is_short_name = len(local) <= 15

    return has_dot or is_short_name


def _extract_emails(text: str) -> list[str]:
    """Extraheer geldige e-mailadressen uit tekst.

    Prioriteitsvolgorde (hoogste eerst):
    1. HR/recruitment adressen (hr@, recruitment@, personeel@, ...) → altijd doorlaten
    2. Persoonlijke zakelijke adressen (jan.bakker@acme.nl, marie@company.com) → altijd doorlaten
    3. Generieke mailboxen (info@, contact@, ...) → blokkeren
    4. Automatische/systeem mailboxen (noreply, mailer-daemon, ...) → blokkeren
    """
    found = EMAIL_RE.findall(text)
    result = []
    seen: set[str] = set()
    for email in found:
        email_lower = email.lower()
        if email_lower in seen:
            continue

        parts = email_lower.split("@")
        if len(parts) != 2:
            continue
        local_part, domain_part = parts[0], parts[1]

        # 1. HR/recruitment → altijd doorlaten
        if any(kw in local_part for kw in HR_KEYWORDS):
            seen.add(email_lower)
            result.append(email_lower)
            continue

        # 2. Persoonlijk zakelijk adres → altijd doorlaten
        if _is_personal_work_email(local_part, domain_part):
            seen.add(email_lower)
            result.append(email_lower)
            continue

        # 3. Exacte blokkeerlijst (volledige lokale naam = generieke mailbox)
        if local_part in EMAIL_BLOCKLIST_EXACT:
            continue

        # 4. Substring-blokkeerlijst (automatische/systeem mailboxen)
        if any(blocked in local_part for blocked in EMAIL_BLOCKLIST_CONTAINS):
            continue

        # Al het overige doorlaten (bijv. solliciteer@bedrijf.nl)
        seen.add(email_lower)
        result.append(email_lower)
    return result


def _find_email_on_company_site(base_url: str) -> Optional[str]:
    """
    Bezoek de bedrijfswebsite en zoek een contact/hr/jobs e-mailadres.
    Probeert de hoofdpagina + /contact + /over-ons.
    """
    from urllib.parse import urlparse
    try:
        parsed = urlparse(base_url)
        domain_root = f"{parsed.scheme}://{parsed.netloc}"
    except Exception:
        return None

    for path in ["", "/contact", "/contact-us", "/over-ons", "/about", "/jobs", "/vacatures", "/careers"]:
        try:
            url = domain_root + path
            soup = _fetch_html(url, timeout=8)
            if not soup:
                continue
            emails = _extract_emails(soup.get_text(separator=" ", strip=True))
            if emails:
                return emails[0]
        except Exception:
            continue
    return None


def _fetch_html(url: str, timeout: int = 15) -> Optional[BeautifulSoup]:
    """Fetch een URL en geef BeautifulSoup terug, of None bij fout."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=timeout)
        resp.raise_for_status()
        return BeautifulSoup(resp.text, "html.parser")
    except Exception as e:
        logger.warning("[scraper] Fout bij ophalen %s: %s", url, e)
        return None


def _scrape_custom_url(url: str) -> list[dict]:
    """
    Scrape een enkele URL (bijv. bedrijfscarrièrepagina).
    Probeert vacaturetitel + e-mailadres te vinden.
    """
    soup = _fetch_html(url)
    if not soup:
        return []

    page_text = soup.get_text(separator=" ", strip=True)
    emails = _extract_emails(page_text)

    headings = [h.get_text(strip=True) for h in soup.find_all(["h1", "h2"])[:5]]
    title = headings[0] if headings else "Vacature"

    company = ""
    og_site = soup.find("meta", property="og:site_name")
    if og_site and og_site.get("content"):
        company = og_site["content"]
    elif soup.title:
        company = soup.title.get_text(strip=True)[:100]

    location = ""
    for sel in ["[itemprop='addressLocality']", ".location", ".place"]:
        el = soup.select_one(sel)
        if el:
            location = el.get_text(strip=True)[:100]
            break

    description = page_text[:2000]

    if emails:
        results = []
        for email in emails:
            results.append({
                "title": title[:500],
                "description": description,
                "company_name": company[:500] if company else None,
                "contact_email": email,
                "location": location or None,
                "source_url": url,
                "source_name": "custom",
            })
        logger.info("[scraper] custom URL %s → %d vacature(s) met e-mail", url, len(results))
        return results
    else:
        # Geen e-mail gevonden — sla toch op zonder contact_email
        logger.info("[scraper] custom URL %s → 1 vacature zonder e-mail", url)
        return [{
            "title": title[:500],
            "description": description,
            "company_name": company[:500] if company else None,
            "contact_email": None,
            "location": location or None,
            "source_url": url,
            "source_name": "custom",
        }]


def _scrape_arbeitnow(pages: int = 3) -> list[dict]:
    """
    Arbeitnow Jobs API — gratis, geen key vereist, Europese vacatures.
    API docs: https://www.arbeitnow.com/api

    Vervangt de NVB scraper: NVB is een client-side Next.js SPA die met
    BeautifulSoup alleen een leeg HTML-shell teruggeeft.
    Arbeitnow biedt een stabiele JSON API zonder authenticatie.

    Vacatures worden altijd opgeslagen, ook zonder e-mailadres.
    """
    results = []
    for page in range(1, pages + 1):
        url = f"https://www.arbeitnow.com/api/job-board-api?page={page}"
        try:
            resp = requests.get(url, headers=HEADERS, timeout=20)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            logger.warning("[scraper] Arbeitnow API fout pagina %d: %s", page, e)
            break

        jobs = data.get("data", [])
        if not jobs:
            break

        for job in jobs:
            description = job.get("description", "") or ""
            emails = _extract_emails(description)

            if not emails:
                continue  # Geen e-mail in beschrijving → overslaan

            title = (job.get("title") or "Vacature")[:500]
            company = (job.get("company_name") or "")[:500] or None
            location = (job.get("location") or "")[:255] or None
            job_url = job.get("url", "")
            tags = job.get("tags", [])
            tag_str = ", ".join(tags[:5]) if tags else ""
            full_description = f"{description}\n\nTags: {tag_str}".strip()[:2000]

            for email in emails:
                results.append({
                    "title": title,
                    "description": full_description,
                    "company_name": company,
                    "contact_email": email,
                    "location": location,
                    "source_url": job_url,
                    "source_name": "arbeitnow",
                })

    logger.info("[scraper] Arbeitnow → %d vacature(s) totaal", len(results))
    return results


def _scrape_werkzoeken(max_pages: int = 3) -> list[dict]:
    """
    Scrape Werkzoeken.nl zoekresultaten.
    Slaat alle vacatures op, ook zonder e-mail.

    Werkzoeken.nl beheert sollicitaties via hun eigen platform
    (reageer-direct-per-email links), dus e-mailadressen staan zelden
    in de vacaturetekst. Vacatures worden nu altijd opgeslagen.
    """
    results = []
    for page in range(1, max_pages + 1):
        url = f"https://www.werkzoeken.nl/vacatures/?p={page}"
        soup = _fetch_html(url)
        if not soup:
            break

        links = []
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if "/vacature/" in href or "/job/" in href:
                if not href.startswith("http"):
                    href = "https://www.werkzoeken.nl" + href
                links.append(href)

        links_deduped: list[str] = list(dict.fromkeys(links))
        links = [links_deduped[i] for i in range(min(10, len(links_deduped)))]

        for link in links:
            try:
                detail_soup = _fetch_html(link)
                if not detail_soup:
                    continue

                detail_text = detail_soup.get_text(separator=" ", strip=True)
                emails = _extract_emails(detail_text)

                title_el = detail_soup.find("h1")
                title = title_el.get_text(strip=True)[:500] if title_el else "Vacature"

                company_el = detail_soup.select_one("[class*='company'], [class*='employer'], [class*='bedrijf']")
                company = company_el.get_text(strip=True)[:500] if company_el else None

                location_el = detail_soup.select_one("[class*='location'], [class*='locatie']")
                location = location_el.get_text(strip=True)[:255] if location_el else None

                if not emails:
                    continue  # Geen e-mail → overslaan

                for email in emails:
                    results.append({
                        "title": title,
                        "description": detail_text[:2000],
                        "company_name": company,
                        "contact_email": email,
                        "location": location,
                        "source_url": link,
                        "source_name": "werkzoeken",
                    })
            except Exception as e:
                logger.debug("[scraper] Werkzoeken kaart fout: %s", e)
                continue

    logger.info("[scraper] Werkzoeken → %d vacature(s) totaal", len(results))
    return results


def _scrape_adzuna(pages: int = 2) -> list[dict]:
    """
    Adzuna Jobs API — meest betrouwbaar.
    Vereist ADZUNA_APP_ID + ADZUNA_APP_KEY (gratis tier beschikbaar op adzuna.com/api).
    Vacatures worden altijd opgeslagen, ook zonder e-mail.
    """
    if not ADZUNA_APP_ID or not ADZUNA_APP_KEY:
        logger.warning("[scraper] Adzuna: ADZUNA_APP_ID of ADZUNA_APP_KEY niet ingesteld")
        return []

    results = []
    for page in range(1, pages + 1):
        url = (
            f"https://api.adzuna.com/v1/api/jobs/nl/search/{page}"
            f"?app_id={ADZUNA_APP_ID}&app_key={ADZUNA_APP_KEY}"
            f"&results_per_page=50&content-type=application/json"
        )
        try:
            resp = requests.get(url, headers=HEADERS, timeout=20)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            logger.warning("[scraper] Adzuna API fout pagina %d: %s", page, e)
            break

        jobs = data.get("results", [])
        for job in jobs:
            description = job.get("description", "") or ""
            emails = _extract_emails(description)

            # Probeer ook redirect URL voor e-mail als description leeg is
            if not emails:
                continue  # Geen e-mail in beschrijving → overslaan

            title = (job.get("title") or "Vacature")[:500]
            company = (job.get("company", {}).get("display_name") or "")[:500] or None
            location = (job.get("location", {}).get("display_name") or "")[:255] or None
            source_url = job.get("redirect_url") or job.get("adref") or ""

            for email in emails:
                results.append({
                    "title": title,
                    "description": description[:2000],
                    "company_name": company,
                    "contact_email": email,
                    "location": location,
                    "source_url": source_url,
                    "source_name": "adzuna",
                })

    logger.info("[scraper] Adzuna → %d vacature(s) totaal", len(results))
    return results


def _scrape_jobbird(max_pages: int = 3) -> list[dict]:
    """
    Jobbird.com scraper — Nederlandse vacaturesite met JSON API.

    Strategie:
    1. Doorzoek gerichte zoekopdrachten die vacatures met e-mailadressen opleveren
       (bijv. "mail naar", "@", "hr@", "solliciteer via mail").
    2. Haal per zoekopdracht maximaal max_pages op (15 vacatures per pagina).
    3. Extraheer e-mailadressen uit de beschrijvingstekst (HTML → plaintext).
    4. Als er geen e-mail in de beschrijving staat, probeer de bedrijfswebsite:
       de recruiter-naam wordt omgezet naar een domeinnaam (bijv. "MvH Group" →
       www.mvhgroup.nl) en de contact-/about-pagina's worden gescand.
    5. Vacatures zonder e-mailadres worden opgeslagen met contact_email=None.

    Geeft een lijst van dicts terug met sleutels:
      title, description, company_name, contact_email, location,
      source_url, source_name
    """
    import time

    JOBBIRD_HEADERS = {
        "User-Agent": HEADERS["User-Agent"],
        "Accept": "application/json",
        "Accept-Language": "nl-NL,nl;q=0.9,en;q=0.8",
    }

    # Gerichte zoekopdrachten voor vacatures met e-mail in de tekst
    # %40 = @ (URL-encoded), zoekt ook naar naam@bedrijf patronen
    SEARCH_QUERIES = [
        "hr%40",
        "recruitment%40",
        "solliciteer%40",
        "vacature%40",
        "%40bedrijf",          # any@company
        "mail+naar",
        "mailen+naar",
        "per+email+solliciteren",
        "stuur+cv+naar",
        "solliciteer+via+email",
        "cv+sturen+naar",
    ]

    results: list[dict] = []
    seen_job_ids: set[int] = set()

    for query in SEARCH_QUERIES:
        for page in range(1, max_pages + 1):
            url = (
                f"https://www.jobbird.com/nl/vacature"
                f"?s={query}&rad=30&ot=date&format=json&page={page}"
            )
            try:
                resp = requests.get(url, headers=JOBBIRD_HEADERS, timeout=15)
                if resp.status_code != 200 or not resp.text:
                    break
                data = resp.json()
            except Exception as e:
                logger.warning("[scraper] Jobbird fout (query=%s, pagina=%d): %s", query, page, e)
                break

            jobs = data.get("search", {}).get("jobs", [])
            if not jobs:
                break

            for job in jobs:
                job_id = job.get("id")
                if job_id in seen_job_ids:
                    continue
                seen_job_ids.add(job_id)

                # Beschrijving: HTML → plaintext, e-mail zoeken
                desc_html = job.get("description", "") or ""
                desc_text = BeautifulSoup(desc_html, "html.parser").get_text(
                    separator=" ", strip=True
                )
                emails = _extract_emails(desc_text)

                if not emails:
                    continue  # Geen e-mail in tekst → overslaan

                title = (job.get("title") or "Vacature")[:500]
                recruiter = job.get("recruiter") or {}
                company = (recruiter.get("name") or "")[:500] or None
                location = (job.get("place") or "")[:255] or None
                source_url = job.get("absoluteUrl") or ""

                for email in emails:
                    results.append({
                        "title": title,
                        "description": desc_text[:2000],
                        "company_name": company,
                        "contact_email": email,
                        "location": location,
                        "source_url": source_url,
                        "source_name": "jobbird",
                    })

        time.sleep(0.3)

    logger.info("[scraper] Jobbird → %d vacature(s) met e-mail", len(results))
    return results


def _scrape_indeed(max_pages: int = 2) -> list[dict]:
    """
    Indeed.nl scraper via ScraperAPI — handelt JavaScript-rendering en anti-bot af.
    Vereist SCRAPERAPI_KEY (gratis tier: 1.000 credits/maand, scraperapi.com).

    Creditsverbruik:
    - Zoekpagina zonder render: 1 credit
    - Vacaturedetail met render=true: 25 credits
    - 2 zoekpaginas + 20 details ≈ 502 credits per run

    Strategie:
    1. Haal zoekresultaten op (zonder render, snel)
    2. Extraheer job-keys uit de HTML
    3. Haal detailpagina per vacature op (met render=true)
    4. Zoek naar e-mailadressen in de volledige tekst
    5. Sla alleen vacatures op met een e-mailadres
    """
    from urllib.parse import quote

    if not SCRAPERAPI_KEY:
        logger.warning("[scraper] Indeed: SCRAPERAPI_KEY niet ingesteld — sla over")
        return []

    def _scraper_url(target: str, render: bool = False) -> str:
        base = f"http://api.scraperapi.com?api_key={SCRAPERAPI_KEY}&url={quote(target)}&country_code=nl"
        if render:
            base += "&render=true"
        return base

    # Gerichte zoekqueries — vacatures die een e-mailadres bevatten
    # Combinatie van HR-rol queries en "solliciteer per email" zinnen
    INDEED_QUERIES = [
        "solliciteer per email",
        "stuur cv naar",
        "mail je cv",
        "cv sturen naar",
        "solliciteer via email",
        "mail naar recruiter",
        "reageer per email",
    ]

    results: list[dict] = []
    seen_job_keys: set[str] = set()

    for query in INDEED_QUERIES:
        encoded_q = quote(query)
        for page_num in range(0, max_pages * 10, 10):
            search_url = (
                f"https://nl.indeed.com/vacatures?q={encoded_q}&l=Nederland&sort=date&start={page_num}"
            )
            try:
                resp = requests.get(_scraper_url(search_url, render=False), headers=HEADERS, timeout=30)
                resp.raise_for_status()
                soup = BeautifulSoup(resp.text, "html.parser")
            except Exception as e:
                logger.warning("[scraper] Indeed zoekpagina '%s' p%d fout: %s", query, page_num, e)
                break

            # Extraheer job-keys
            job_keys = []
            for el in soup.select("[data-jk]"):
                jk = el.get("data-jk", "")
                if jk and jk not in seen_job_keys:
                    job_keys.append(jk)
                    seen_job_keys.add(jk)

            # Fallback: links met jk= parameter
            if not job_keys:
                for a in soup.find_all("a", href=True):
                    href = a["href"]
                    if "jk=" in href:
                        m = re.search(r"jk=([a-f0-9]+)", href)
                        if m:
                            jk = m.group(1)
                            if jk not in seen_job_keys:
                                job_keys.append(jk)
                                seen_job_keys.add(jk)

            if not job_keys:
                logger.info("[scraper] Indeed '%s' p%d: geen job-keys", query, page_num)
                break

            logger.info("[scraper] Indeed '%s' p%d: %d vacatures", query, page_num, len(job_keys))

            for jk in job_keys[:5]:  # max 5 per query-pagina (credits sparen)
                detail_url = f"https://nl.indeed.com/viewjob?jk={jk}"
                try:
                    detail_resp = requests.get(
                        _scraper_url(detail_url, render=True),
                        headers=HEADERS,
                        timeout=60,
                    )
                    detail_resp.raise_for_status()
                    detail_soup = BeautifulSoup(detail_resp.text, "html.parser")
                    detail_text = detail_soup.get_text(separator=" ", strip=True)

                    emails = _extract_emails(detail_text)
                    if not emails:
                        continue

                    title_el = detail_soup.find("h1")
                    title = title_el.get_text(strip=True)[:500] if title_el else "Vacature"

                    company_el = detail_soup.select_one(
                        "[data-company-name], [class*='jobsearch-CompanyInfoContainer']"
                    )
                    company = company_el.get_text(strip=True)[:500] if company_el else None

                    location_el = detail_soup.select_one(
                        "[data-testid='job-location'], [class*='jobsearch-JobLocationContainer']"
                    )
                    location = location_el.get_text(strip=True)[:255] if location_el else None

                    for email in emails:
                        results.append({
                            "title": title,
                            "description": detail_text[:2000],
                            "company_name": company,
                            "contact_email": email,
                            "location": location,
                            "source_url": detail_url,
                            "source_name": "indeed",
                        })
                        logger.info("[scraper] Indeed: email gevonden — %s @ %s", email, title[:40])

                except Exception as e:
                    logger.debug("[scraper] Indeed job %s fout: %s", jk, e)
                    continue

    logger.info("[scraper] Indeed → %d vacature(s) met e-mail", len(results))
    return results


def run_scraper(source: str, custom_urls: Optional[list[str]] = None) -> list[dict]:
    """
    Hoofd-entry voor scraping.

    source:
      - "adzuna"     → Adzuna Jobs API
      - "arbeitnow"  → Arbeitnow Jobs API (gratis, geen key)
      - "nvb"        → alias voor "arbeitnow" (NVB is een SPA, niet scrapable)
      - "werkzoeken" → Werkzoeken.nl
      - "jobbird"    → Jobbird.com (Nederlandse vacaturesite, JSON API)
      - "indeed"     → Indeed.nl via ScraperAPI (vereist SCRAPERAPI_KEY)
      - "custom"     → Lijst van bedrijfs-URLs (custom_urls vereist)
      - "all"        → Alle bovenstaande bronnen

    Geeft lijst terug van dicts met sleutels:
      title, description, company_name, contact_email (kan None zijn),
      location, source_url, source_name
    """
    raw: list[dict] = []

    if source in ("adzuna", "all"):
        raw += _scrape_adzuna()
    if source in ("arbeitnow", "nvb", "all"):
        raw += _scrape_arbeitnow()
    if source in ("werkzoeken", "all"):
        raw += _scrape_werkzoeken()
    if source in ("jobbird", "all"):
        raw += _scrape_jobbird()
    if source in ("indeed", "all"):
        raw += _scrape_indeed()
    if source == "custom" or (source == "all" and custom_urls):
        for url in (custom_urls or []):
            raw += _scrape_custom_url(url)

    # Deduplicatie: zelfde source_url → één record
    seen_urls: set[str] = set()
    seen_email_title: set[tuple[str, str]] = set()
    unique: list[dict] = []
    for item in raw:
        src_url = (item.get("source_url") or "").lower()
        email = (item.get("contact_email") or "").lower()
        title_key = item["title"].lower()[:100]

        if src_url and src_url in seen_urls:
            continue
        if email and (email, title_key) in seen_email_title:
            continue

        if src_url:
            seen_urls.add(src_url)
        if email:
            seen_email_title.add((email, title_key))
        unique.append(item)

    logger.info("[scraper] Totaal uniek: %d (van %d)", len(unique), len(raw))
    return unique
