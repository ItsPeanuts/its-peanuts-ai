"""
Vacature Scraper — haalt vacatures op van externe bronnen.

Bronnen:
- Adzuna API (vereist ADZUNA_APP_ID + ADZUNA_APP_KEY)
- Arbeitnow API (gratis, geen key, Europese vacatures)
- RemoteOK API (gratis, geen key, remote vacatures wereldwijd)
- SerpAPI Google Jobs (vereist SERPAPI_KEY, beste voor NL vacatures)
- Jobbird.com (Nederlandse vacaturesite, JSON API + detail pagina's voor emails)
- Uitzendbureau.nl (grote NL aggregator, BeautifulSoup scraper)
- Indeed.nl via ScraperAPI (vereist SCRAPERAPI_KEY)
- Werkzoeken.nl (BeautifulSoup)
- Custom URLs (admin-opgegeven bedrijfscarrièrepagina's)

E-mailaanpak:
- Vacatures worden ALTIJD opgeslagen, ook zonder e-mailadres
- E-mailadres is optioneel: alleen nodig voor de claim-mail flow
- HR/recruitment adressen (hr@, personeel@, ...): altijd doorlaten
- Persoonlijke zakelijke adressen (jan.bakker@acme.nl): altijd doorlaten
- info@ en contact@ worden doorgelaten voor kleine .nl bedrijven (uitzendbureau's)
  omdat dit voor kleine MKB bedrijven HUN sollicitatie-adres is

Deduplicatie: zelfde source_url OF contact_email+title combinatie wordt niet dubbel opgeslagen.
"""

import json
import logging
import os
import re
import time
from typing import Optional

import requests
from bs4 import BeautifulSoup

from backend.services.vacancy_enricher import extract_phone

logger = logging.getLogger(__name__)

ADZUNA_APP_ID  = os.getenv("ADZUNA_APP_ID", "")
ADZUNA_APP_KEY = os.getenv("ADZUNA_APP_KEY", "")
SCRAPERAPI_KEY = os.getenv("SCRAPERAPI_KEY", "")
SERPAPI_KEY    = os.getenv("SERPAPI_KEY", "")

# Regex voor e-mailadressen
EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b")

# HR/recruitment trefwoorden → altijd doorlaten
HR_KEYWORDS = {
    "hr", "hrm", "recruitment", "recruiter", "recruiting", "talent",
    "jobs", "vacature", "vacatures", "career", "careers", "hiring",
    "personeel", "werving", "humanresources", "human-resources",
    # Sollicitatie-trefwoorden — NL bedrijven gebruiken dit als email-prefix
    "solliciteer", "sollicitaties", "sollicitatie", "apply",
    "werkenbij", "werk", "stage", "stagebureau",
}

# Exacte blokkeerlijst
# Let op: info@ en contact@ zijn hier NIET geblokkeerd — voor kleine NL
# uitzendbureau's en MKB-bedrijven is dit hun enige sollicitatie-adres!
EMAIL_BLOCKLIST_EXACT = {
    "hallo", "hello", "support", "service", "admin",
    "general", "feedback",
    "help", "helpdesk", "team", "all",
    "press", "media",
    "enquiries", "enquiry", "privacy", "legal", "juridisch",
    "abuse", "postmaster", "webmaster",
}

# Substring-blokkeerlijst
EMAIL_BLOCKLIST_CONTAINS = {
    "noreply", "no-reply", "donotreply", "do-not-reply", "mailer-daemon",
    "postmaster", "webmaster", "abuse", "spam", "unsubscribe",
}

# Gratis e-mailproviders
FREE_EMAIL_PROVIDERS = {
    "gmail", "hotmail", "outlook", "yahoo", "live", "icloud", "protonmail",
    "ziggo", "kpnmail", "planet", "xs4all", "hetnet", "chello", "home",
    "upcmail", "telenet", "quicknet",
}

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
    domain_name = domain.split(".")[0].lower()
    if domain_name in FREE_EMAIL_PROVIDERS:
        return False
    local_clean = local.replace(".", "").replace("-", "").replace("_", "")
    if not local_clean.isalpha():
        return False
    if not (2 <= len(local_clean) <= 30):
        return False
    has_dot = "." in local
    is_short_name = len(local) <= 15
    return has_dot or is_short_name


def _extract_emails(text: str) -> list:
    """Extraheer geldige e-mailadressen uit tekst."""
    found = EMAIL_RE.findall(text)
    result = []
    seen = set()
    for email in found:
        email_lower = email.lower()
        if email_lower in seen:
            continue
        parts = email_lower.split("@")
        if len(parts) != 2:
            continue
        local_part, domain_part = parts[0], parts[1]

        # Blocklist check first — overrides everything else
        if local_part in EMAIL_BLOCKLIST_EXACT:
            continue
        if any(blocked in local_part for blocked in EMAIL_BLOCKLIST_CONTAINS):
            continue

        # Block free email providers (gmail, hotmail, etc.)
        domain_name = domain_part.split(".")[0].lower()
        if domain_name in FREE_EMAIL_PROVIDERS:
            continue

        if any(kw in local_part for kw in HR_KEYWORDS):
            seen.add(email_lower)
            result.append(email_lower)
            continue

        if _is_personal_work_email(local_part, domain_part):
            seen.add(email_lower)
            result.append(email_lower)
            continue

        seen.add(email_lower)
        result.append(email_lower)
    return result


def _fetch_html(url: str, timeout: int = 15) -> Optional[BeautifulSoup]:
    try:
        resp = requests.get(url, headers=HEADERS, timeout=timeout)
        resp.raise_for_status()
        return BeautifulSoup(resp.text, "html.parser")
    except Exception as e:
        logger.warning("[scraper] Fout bij ophalen %s: %s", url, e)
        return None


def _find_email_on_company_site(base_url: str) -> Optional[str]:
    from urllib.parse import urlparse
    try:
        parsed = urlparse(base_url)
        domain_root = f"{parsed.scheme}://{parsed.netloc}"
    except Exception:
        return None
    for path in ["", "/contact", "/contact-us", "/over-ons", "/about", "/jobs", "/vacatures", "/careers"]:
        try:
            soup = _fetch_html(domain_root + path, timeout=8)
            if not soup:
                continue
            emails = _extract_emails(soup.get_text(separator=" ", strip=True))
            if emails:
                return emails[0]
        except Exception:
            continue
    return None


# ── RemoteOK ──────────────────────────────────────────────────────────────────

def _scrape_remoteok() -> list:
    """
    RemoteOK API — volledig gratis, geen key vereist.
    Retourneert remote vacatures wereldwijd (inclusief NL-bedrijven).
    """
    try:
        resp = requests.get(
            "https://remoteok.io/api",
            headers={"User-Agent": HEADERS["User-Agent"], "Accept": "application/json"},
            timeout=20,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        logger.warning("[scraper] RemoteOK API fout: %s", e)
        return []

    results = []
    for job in data[1:]:  # eerste item = metadata
        if not isinstance(job, dict):
            continue

        description = job.get("description", "") or ""
        emails = _extract_emails(description)

        title   = (job.get("position") or "Vacature")[:500]
        company = (job.get("company") or "")[:500] or None
        location = (job.get("location") or "Remote")[:255]
        source_url = job.get("url") or ""
        tags_list = job.get("tags") or []
        if tags_list:
            description = description + "\n\nSkills: " + ", ".join(tags_list[:8])

        results.append({
            "title": title,
            "description": description[:2000],
            "company_name": company,
            "contact_email": emails[0] if emails else None,
            "contact_phone": extract_phone(description),
            "location": location,
            "source_url": source_url,
            "source_name": "remoteok",
        })

    logger.info("[scraper] RemoteOK → %d vacatures", len(results))
    return results


# ── Jooble API ────────────────────────────────────────────────────────────────

# ── SerpAPI Google Jobs ───────────────────────────────────────────────────────

def _scrape_google_jobs() -> list:
    """
    Google Jobs via SerpAPI — meest uitgebreide bron voor NL vacatures.
    Vereist env var: SERPAPI_KEY (gratis tier: 100 zoekopdr/maand, serpapi.com)
    """
    if not SERPAPI_KEY:
        logger.warning("[scraper] Google Jobs: SERPAPI_KEY niet ingesteld — sla over")
        return []

    from urllib.parse import quote

    GOOGLE_QUERIES = [
        "vacature amsterdam",
        "vacature rotterdam",
        "software developer nederland",
        "marketing manager amsterdam",
        "HR recruiter nederland",
        "accountant netherlands",
        "sales manager nederland",
        "fullstack developer amsterdam",
    ]

    results = []
    seen: set = set()

    for query in GOOGLE_QUERIES[:5]:  # max 5 queries (credits sparen)
        url = (
            f"https://serpapi.com/search.json"
            f"?engine=google_jobs&q={quote(query)}&gl=nl&hl=nl"
            f"&api_key={SERPAPI_KEY}"
        )
        try:
            resp = requests.get(url, timeout=30)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            logger.warning("[scraper] SerpAPI Google Jobs '%s' fout: %s", query, e)
            continue

        for job in data.get("jobs_results", []):
            job_id = job.get("job_id") or job.get("title", "") + (job.get("company_name") or "")
            if job_id in seen:
                continue
            seen.add(job_id)

            # Beschrijving samenstellen
            desc = job.get("description") or ""
            highlights = job.get("job_highlights") or []
            for hl in highlights:
                items = hl.get("items") or []
                title_hl = hl.get("title") or ""
                if items:
                    desc += f"\n\n{title_hl}:\n" + "\n".join(f"• {i}" for i in items)

            emails = _extract_emails(desc)

            title    = (job.get("title") or "Vacature")[:500]
            company  = (job.get("company_name") or "")[:500] or None
            location = (job.get("location") or "Nederland")[:255]

            # Probeer apply link
            apply_options = job.get("apply_options") or []
            src_url = apply_options[0].get("link", "") if apply_options else ""

            results.append({
                "title": title,
                "description": desc[:2000],
                "company_name": company,
                "contact_email": emails[0] if emails else None,
                "contact_phone": extract_phone(desc),
                "location": location,
                "source_url": src_url,
                "source_name": "google_jobs",
            })

        time.sleep(0.3)

    logger.info("[scraper] Google Jobs (SerpAPI) → %d vacatures", len(results))
    return results


# ── SerpAPI Google Search (email-gericht) ─────────────────────────────────────

def _scrape_google_search_emails() -> list:
    """
    SerpAPI Google Search met queries die e-mailprefixen direct benoemen
    (bijv. '"hr@" vacature site:.nl'). Google indexeert emails op pagina's
    en toont ze in snippets als we er letterlijk naar zoeken.
    Vereist SERPAPI_KEY.
    """
    if not SERPAPI_KEY:
        logger.warning("[scraper] Google Search: SERPAPI_KEY niet ingesteld — sla over")
        return []

    from urllib.parse import quote, urlparse

    # Zoek naar vacaturepagina's waarop emails zichtbaar zijn in de snippet.
    # Let op: @ teken in queries werkt NIET goed in Google — Google interpreteert
    # %40 als social media mention waardoor snippets geen emails bevatten.
    # Gebruik dus trefwoordzoekopdrachten zonder @ in de query.
    SEARCH_QUERIES = [
        # Nederlandse sollicitatie-zinnen die vaak naast een email staan
        'vacature "stuur je cv" site:.nl -site:linkedin.com -site:indeed.com',
        'vacature "solliciteer direct" email site:.nl -site:linkedin.com -site:indeed.com',
        'vacature "reageer via" email site:.nl -site:linkedin.com -site:indeed.com',
        '"stuur je motivatiebrief" vacature site:.nl -site:linkedin.com',
        '"mail je cv" vacature site:.nl -site:linkedin.com -site:indeed.com',
        '"stuur je sollicitatie" vacature site:.nl -site:linkedin.com',
        'vacature "per e-mail" solliciteren site:.nl -site:linkedin.com -site:indeed.com',
        # Werving & selectie / uitzend bureaus — tonen vaak emails
        'uitzendbureau vacature "reageer" site:.nl -site:linkedin.com -site:indeed.com',
        'detachering vacature "solliciteer" site:.nl -site:linkedin.com -site:indeed.com',
        'werving selectie vacature site:.nl -site:linkedin.com -site:indeed.com',
        # Werkenbij pagina's
        'werkenbij vacature site:.nl -site:linkedin.com -site:indeed.com',
        'inurl:werkenbij vacature "email" site:.nl -site:linkedin.com',
        # Sector-specifiek
        'vacature ICT developer "solliciteer" site:.nl -site:linkedin.com -site:indeed.com',
        'vacature zorg medewerker "reageer" site:.nl -site:linkedin.com -site:indeed.com',
        'vacature logistiek chauffeur "stuur" site:.nl -site:linkedin.com -site:indeed.com',
        'vacature financieel administratief site:.nl -site:linkedin.com -site:indeed.com',
    ]

    results = []
    seen: set = set()

    for query in SEARCH_QUERIES:
        for start in (0, 10):
            url = (
                f"https://serpapi.com/search.json"
                f"?engine=google&q={quote(query)}&gl=nl&hl=nl&num=10&start={start}"
                f"&api_key={SERPAPI_KEY}"
            )
            try:
                resp = requests.get(url, timeout=30)
                resp.raise_for_status()
                data = resp.json()
            except Exception as e:
                logger.warning("[scraper] SerpAPI Search '%s' fout: %s", query, e)
                break

            for item in data.get("organic_results", []):
                page_url  = item.get("link", "")
                snippet   = item.get("snippet", "")
                raw_title = item.get("title", "Vacature")

                if not page_url or page_url in seen:
                    continue
                seen.add(page_url)

                # Probeer eerst email uit snippet
                emails = _extract_emails(snippet)

                # Fallback: bezoek de pagina zelf als snippet geen email bevat
                if not emails:
                    try:
                        page_resp = requests.get(page_url, timeout=8, headers=HEADERS)
                        page_resp.raise_for_status()
                        page_soup = BeautifulSoup(page_resp.text, "html.parser")
                        page_text = page_soup.get_text(" ", strip=True)
                        emails = _extract_emails_from_page(page_soup, page_text)
                        # Gebruik paginatekst als betere beschrijving
                        if emails:
                            snippet = page_text[:1000]
                    except Exception:
                        pass

                if not emails:
                    continue

                clean_title = re.sub(r"\s*[\|\-–]\s*.+$", "", raw_title).strip() or raw_title
                domain  = urlparse(page_url).netloc.replace("www.", "")
                company = domain.split(".")[0].capitalize()

                results.append({
                    "title":         clean_title[:500],
                    "description":   snippet,
                    "company_name":  company[:500],
                    "contact_email": emails[0],
                    "contact_phone": extract_phone(snippet),
                    "location":      "Nederland",
                    "source_url":    page_url,
                    "source_name":   "google_search",
                })

            time.sleep(0.3)

    logger.info("[scraper] Google Search (SerpAPI) → %d vacatures met e-mail", len(results))
    return results


# ── Bedrijven Direct (company career pages via mailto-links) ──────────────────

def _extract_jsonld_job(soup) -> dict:
    """Extraheer JSON-LD JobPosting structured data uit een pagina (als aanwezig)."""
    import json as _json
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = _json.loads(script.string or "")
            if isinstance(data, list):
                data = data[0] if data else {}
            if isinstance(data, dict) and data.get("@type", "").lower() == "jobposting":
                return data
        except Exception:
            pass
    return {}


def _extract_emails_from_page(soup, page_text: str) -> list:
    """
    Haalt emails op uit een pagina via twee methoden:
    1. mailto: links  — meest betrouwbaar, werkt ook als email niet als tekst staat
    2. regex op tekst — vangt plain-text emails
    """
    emails = []
    seen_emails: set = set()

    # Methode 1: mailto: links (werkt altijd, ook zonder JavaScript)
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.lower().startswith("mailto:"):
            addr = href[7:].split("?")[0].strip().lower()
            if "@" in addr and addr not in seen_emails:
                validated = _extract_emails(addr)
                if validated:
                    emails.append(validated[0])
                    seen_emails.add(addr)

    # Methode 2: regex op paginatekst
    for e in _extract_emails(page_text):
        if e not in seen_emails:
            emails.append(e)
            seen_emails.add(e)

    return emails


def _scrape_company_career_pages() -> list:
    """
    Vindt bedrijfswebsites via SerpAPI (inurl:vacatures / werken-bij / jobs),
    bezoekt elke pagina en extraheert emails via mailto:-links (meest betrouwbaar)
    én regex. Probeert JSON-LD JobPosting data voor schone vacatureinfo.
    Vereist SERPAPI_KEY.
    """
    if not SERPAPI_KEY:
        logger.warning("[scraper] Company Direct: SERPAPI_KEY niet ingesteld — sla over")
        return []

    from urllib.parse import quote, urlparse

    SEARCH_QUERIES = [
        # Career-page URL-patronen (breed — email hoeft niet in snippet)
        'inurl:vacatures site:.nl -site:linkedin.com -site:indeed.com -site:werkzoeken.nl -site:nationale-vacaturebank.nl',
        'inurl:werken-bij site:.nl -site:linkedin.com -site:indeed.com',
        'inurl:vacature site:.nl -site:linkedin.com -site:werkzoeken.nl',
        'inurl:jobs site:.nl -site:linkedin.com -site:indeed.com',
        'inurl:careers site:.nl -site:linkedin.com -site:indeed.com',
        # Uitzend en detachering (tonen bijna altijd emails)
        'uitzendbureau vacature site:.nl -site:linkedin.com -site:indeed.com',
        'detachering vacature site:.nl -site:linkedin.com -site:indeed.com',
        'werving selectie vacature site:.nl -site:linkedin.com -site:indeed.com',
        # Per sector
        'inurl:vacatures developer ICT site:.nl -site:linkedin.com',
        'inurl:vacatures zorg medewerker site:.nl -site:linkedin.com',
        'inurl:vacatures sales accountmanager site:.nl -site:linkedin.com',
        'inurl:vacatures marketing communicatie site:.nl -site:linkedin.com',
        'inurl:vacatures technisch monteur site:.nl -site:linkedin.com',
        'inurl:vacatures logistiek chauffeur site:.nl -site:linkedin.com',
        'inurl:vacatures financieel administratief site:.nl -site:linkedin.com',
        # Per regio
        'inurl:vacatures amsterdam site:.nl -site:linkedin.com -site:indeed.com',
        'inurl:vacatures rotterdam site:.nl -site:linkedin.com -site:indeed.com',
        'inurl:vacatures utrecht site:.nl -site:linkedin.com -site:indeed.com',
        'inurl:vacatures eindhoven site:.nl -site:linkedin.com -site:indeed.com',
        'inurl:vacatures "den haag" site:.nl -site:linkedin.com -site:indeed.com',
    ]

    results = []
    seen: set = set()

    for query in SEARCH_QUERIES:
        for start in (0, 10):
            url = (
                f"https://serpapi.com/search.json"
                f"?engine=google&q={quote(query)}&gl=nl&hl=nl&num=10&start={start}"
                f"&api_key={SERPAPI_KEY}"
            )
            try:
                resp = requests.get(url, timeout=30)
                resp.raise_for_status()
                data = resp.json()
            except Exception as e:
                logger.warning("[scraper] Company Search '%s' fout: %s", query, e)
                break

            for item in data.get("organic_results", []):
                page_url  = item.get("link", "")
                raw_title = item.get("title", "Vacature")
                snippet   = item.get("snippet", "")

                if not page_url or page_url in seen:
                    continue
                seen.add(page_url)

                # Snelle check: staat email al in de snippet?
                emails_from_snippet = _extract_emails(snippet)

                # Bezoek de pagina voor mailto-links en volledige tekst
                soup      = None
                page_text = snippet
                try:
                    page_resp = requests.get(page_url, timeout=10, headers=HEADERS)
                    page_resp.raise_for_status()
                    soup      = BeautifulSoup(page_resp.text, "html.parser")
                    page_text = soup.get_text(" ", strip=True)
                except Exception:
                    # Kon pagina niet ophalen — gebruik snippet-emails als fallback
                    if emails_from_snippet:
                        emails = emails_from_snippet
                    else:
                        continue

                # Email via mailto-links + tekst-regex (als pagina geladen is)
                if soup is not None:
                    emails = _extract_emails_from_page(soup, page_text)
                    # Voeg snippet-emails toe die pagina miste
                    seen_e: set = set(emails)
                    for e in emails_from_snippet:
                        if e not in seen_e:
                            emails.append(e)
                            seen_e.add(e)

                if not emails:
                    continue

                # JSON-LD JobPosting voor gestructureerde data
                job_ld   = _extract_jsonld_job(soup)
                company  = ""
                location = ""

                if job_ld:
                    title    = (job_ld.get("title") or raw_title)[:500]
                    desc     = job_ld.get("description") or page_text[:3000]
                    if isinstance(job_ld.get("jobLocation"), dict):
                        addr     = job_ld["jobLocation"].get("address") or {}
                        location = addr.get("addressLocality") or addr.get("addressRegion") or ""
                    if isinstance(job_ld.get("hiringOrganization"), dict):
                        company  = job_ld["hiringOrganization"].get("name") or ""
                else:
                    title = re.sub(r"\s*[\|\-–]\s*.+$", "", raw_title).strip() or raw_title
                    desc  = page_text[:3000]

                if not company:
                    domain  = urlparse(page_url).netloc.replace("www.", "")
                    company = domain.split(".")[0].capitalize()

                results.append({
                    "title":         title[:500],
                    "description":   desc,
                    "company_name":  company[:500],
                    "contact_email": emails[0],
                    "contact_phone": extract_phone(page_text),
                    "location":      location or "Nederland",
                    "source_url":    page_url,
                    "source_name":   "company_direct",
                })

            time.sleep(0.5)

    logger.info("[scraper] Company Direct → %d vacatures met e-mail", len(results))
    return results


# ── Arbeitnow ─────────────────────────────────────────────────────────────────

def _scrape_arbeitnow(pages: int = 3) -> list:
    """
    Arbeitnow Jobs API — gratis, geen key vereist, Europese vacatures.
    Slaat alle vacatures op, ook zonder e-mailadres.
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

            title    = (job.get("title") or "Vacature")[:500]
            company  = (job.get("company_name") or "")[:500] or None
            location = (job.get("location") or "")[:255] or "Remote"
            job_url  = job.get("url", "")
            tags     = job.get("tags", [])
            if tags:
                description = description + "\n\nTags: " + ", ".join(tags[:5])

            results.append({
                "title": title,
                "description": description[:2000],
                "company_name": company,
                "contact_email": emails[0] if emails else None,
            "contact_phone": extract_phone(description),
                "location": location,
                "source_url": job_url,
                "source_name": "arbeitnow",
            })

    logger.info("[scraper] Arbeitnow → %d vacatures", len(results))
    return results


# ── Werkzoeken.nl ─────────────────────────────────────────────────────────────

def _scrape_werkzoeken(max_pages: int = 3) -> list:
    """
    Scrape Werkzoeken.nl — slaat alle vacatures op, ook zonder e-mail.
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

        links = list(dict.fromkeys(links))[:10]

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
                location = location_el.get_text(strip=True)[:255] if location_el else "Nederland"

                results.append({
                    "title": title,
                    "description": detail_text[:2000],
                    "company_name": company,
                    "contact_email": emails[0] if emails else None,
                    "contact_phone": extract_phone(detail_text),
                    "location": location,
                    "source_url": link,
                    "source_name": "werkzoeken",
                })
            except Exception as e:
                logger.debug("[scraper] Werkzoeken kaart fout: %s", e)
                continue

    logger.info("[scraper] Werkzoeken → %d vacatures", len(results))
    return results


# ── Adzuna API ────────────────────────────────────────────────────────────────

def _scrape_adzuna(pages: int = 3) -> list:
    """
    Adzuna Jobs API — meest betrouwbaar voor NL vacatures.
    Vereist ADZUNA_APP_ID + ADZUNA_APP_KEY (gratis tier: adzuna.com/api).
    Slaat alle vacatures op, ook zonder e-mail.
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

        for job in data.get("results", []):
            description = job.get("description", "") or ""
            emails = _extract_emails(description)

            title    = (job.get("title") or "Vacature")[:500]
            company  = (job.get("company", {}).get("display_name") or "")[:500] or None
            location = (job.get("location", {}).get("display_name") or "Nederland")[:255]
            src_url  = job.get("redirect_url") or job.get("adref") or ""

            # Probeer categorie als employment_type hint
            category = (job.get("category", {}).get("label") or "")

            full_desc = description
            if category:
                full_desc = f"Categorie: {category}\n\n{description}"

            results.append({
                "title": title,
                "description": full_desc[:2000],
                "company_name": company,
                "contact_email": emails[0] if emails else None,
            "contact_phone": extract_phone(description),
                "location": location,
                "source_url": src_url,
                "source_name": "adzuna",
            })

    logger.info("[scraper] Adzuna → %d vacatures", len(results))
    return results


# ── Jobbird.com ───────────────────────────────────────────────────────────────

def _scrape_jobbird(max_pages: int = 5) -> list:
    """
    Jobbird.com — Nederlandse vacaturesite met JSON API.

    Strategie (twee stappen):
    1. Haal vacaturelijst op via JSON API (snel, veel jobs per request)
    2. Bezoek ELKE detailpagina voor emails — de JSON listing heeft zelden emails,
       maar de HTML detailpagina's bevatten ~50% van de tijd een e-mailadres
       (contactpersoon HR, recruiter, of directe manager).

    Met 20 queries × 5 pagina's × 15 jobs = 1500 kandidaat-vacatures.
    Bij ~50% email-rate → ~750 vacatures met e-mail per run.
    """
    JOBBIRD_HEADERS = {
        "User-Agent": HEADERS["User-Agent"],
        "Accept": "application/json",
        "Accept-Language": "nl-NL,nl;q=0.9,en;q=0.8",
    }

    # Brede set Nederlandse functie-trefwoorden voor maximale dekking
    SEARCH_QUERIES = [
        "",             # leeg = alle recente vacatures
        "developer",
        "manager",
        "administratie",
        "HR",
        "verkoop",
        "zorg",
        "logistiek",
        "financieel",
        "marketing",
        "technisch",
        "sales",
        "engineer",
        "accountant",
        "consultant",
        "ICT",
        "bouw",
        "onderwijs",
        "security",
        "data",
    ]

    # Stap 1: verzamel alle unieke job-metadata via JSON API
    seen_job_ids: set = set()
    job_metas: list = []

    for query in SEARCH_QUERIES:
        for page in range(1, max_pages + 1):
            params = f"rad=50&ot=date&format=json&page={page}"
            if query:
                params += f"&s={query}"
            url = f"https://www.jobbird.com/nl/vacature?{params}"
            try:
                resp = requests.get(url, headers=JOBBIRD_HEADERS, timeout=15)
                if resp.status_code != 200 or not resp.text:
                    break
                data = resp.json()
            except Exception as e:
                logger.warning("[scraper] Jobbird fout (query=%s, p%d): %s", query, page, e)
                break

            jobs = data.get("search", {}).get("jobs", [])
            if not jobs:
                break

            new_in_page = 0
            for job in jobs:
                job_id = job.get("id")
                if job_id in seen_job_ids:
                    continue
                seen_job_ids.add(job_id)
                new_in_page += 1

                recruiter = job.get("recruiter") or {}
                job_metas.append({
                    "id":       job_id,
                    "title":    (job.get("title") or "Vacature")[:500],
                    "company":  (recruiter.get("name") or "")[:500] or None,
                    "location": (job.get("place") or "Nederland")[:255],
                    "url":      job.get("absoluteUrl") or "",
                    "desc_fallback": BeautifulSoup(
                        job.get("description", "") or "", "html.parser"
                    ).get_text(separator=" ", strip=True),
                })

            # Als er geen nieuwe jobs zijn in deze pagina, ga door naar volgende query
            if new_in_page == 0:
                break

        time.sleep(0.15)

    logger.info("[scraper] Jobbird listing → %d unieke vacatures verzameld", len(job_metas))

    # Stap 2: bezoek elke detailpagina voor e-mailadressen
    results: list = []
    for meta in job_metas:
        src_url = meta["url"]
        desc_text = meta["desc_fallback"]
        emails: list = []

        if src_url:
            try:
                detail_resp = requests.get(src_url, headers=HEADERS, timeout=10)
                if detail_resp.status_code == 200:
                    detail_soup = BeautifulSoup(detail_resp.text, "html.parser")
                    detail_text = detail_soup.get_text(separator=" ", strip=True)
                    emails = _extract_emails_from_page(detail_soup, detail_text)
                    if detail_text:
                        desc_text = detail_text  # gebruik volledige paginatekst als beschrijving
            except Exception as e:
                logger.debug("[scraper] Jobbird detail fout %s: %s", src_url, e)

        # Fallback: emails uit de JSON-beschrijving
        if not emails and desc_text:
            emails = _extract_emails(desc_text)

        results.append({
            "title":         meta["title"],
            "description":   desc_text[:2000],
            "company_name":  meta["company"],
            "contact_email": emails[0] if emails else None,
            "contact_phone": extract_phone(desc_text),
            "location":      meta["location"],
            "source_url":    src_url,
            "source_name":   "jobbird",
        })

        time.sleep(0.2)  # beleef de server

    with_email = sum(1 for r in results if r.get("contact_email"))
    logger.info("[scraper] Jobbird → %d vacatures (%d met e-mail)", len(results), with_email)
    return results


# ── Uitzendbureau.nl ──────────────────────────────────────────────────────────

def _scrape_uitzendbureau(max_cities: int = 10) -> list:
    """
    Uitzendbureau.nl — grote Nederlandse vacature-aggregator.

    Strategie:
    1. Haal vacature-links op per stad (amsterdam, rotterdam, utrecht, etc.)
    2. Bezoek elke detailpagina
    3. Extraheer emails + JSON-LD JobPosting data

    ~15 vacatures per stads-pagina × 10 steden × meerdere pagina's.
    """
    from urllib.parse import urljoin

    BASE = "https://www.uitzendbureau.nl"

    # Top-10 Nederlandse steden voor maximale dekking
    CITIES = [
        "amsterdam", "rotterdam", "den-haag", "utrecht", "eindhoven",
        "groningen", "tilburg", "almere", "breda", "nijmegen",
        "leiden", "haarlem", "arnhem", "enschede", "apeldoorn",
    ]

    seen_urls: set = set()
    detail_urls: list = []

    # Stap 1: verzamel detail-URLs van stadsoverzichtpagina's
    for city in CITIES[:max_cities]:
        for page_num in range(1, 4):  # max 3 pagina's per stad
            if page_num == 1:
                listing_url = f"{BASE}/vacatures/{city}"
            else:
                listing_url = f"{BASE}/vacatures/{city}/pagina-{page_num}"

            soup = _fetch_html(listing_url, timeout=12)
            if not soup:
                break

            found_on_page = 0
            for a in soup.find_all("a", href=True):
                href = a["href"]
                # Uitzendbureau.nl vacature URLs komen als volledige URLs:
                # https://www.uitzendbureau.nl/vacature/{id}-{slug}
                if re.search(r"/vacature/\d+", href) and "vacatures" not in href:
                    # Normaliseer naar volledige URL
                    if href.startswith("http"):
                        full_url = href
                    else:
                        full_url = BASE + href
                    if full_url not in seen_urls:
                        seen_urls.add(full_url)
                        detail_urls.append(full_url)
                        found_on_page += 1

            if found_on_page == 0:
                break  # geen nieuwe vacatures op deze pagina

            time.sleep(0.3)

    logger.info("[scraper] Uitzendbureau listing → %d vacature-URLs", len(detail_urls))

    # Stap 2: bezoek detailpagina's en extraheer data
    results: list = []
    for url in detail_urls:
        try:
            soup = _fetch_html(url, timeout=12)
            if not soup:
                continue

            page_text = soup.get_text(separator=" ", strip=True)
            emails = _extract_emails_from_page(soup, page_text)

            # JSON-LD JobPosting voor gestructureerde data
            job_ld = _extract_jsonld_job(soup)
            title = company = location = ""

            if job_ld:
                title    = (job_ld.get("title") or "")[:500]
                if isinstance(job_ld.get("jobLocation"), dict):
                    addr     = job_ld["jobLocation"].get("address") or {}
                    location = addr.get("addressLocality") or addr.get("addressRegion") or ""
                if isinstance(job_ld.get("hiringOrganization"), dict):
                    company  = job_ld["hiringOrganization"].get("name") or ""

            if not title:
                h1 = soup.find("h1")
                title = h1.get_text(strip=True)[:500] if h1 else "Vacature"

            if not company:
                company_el = soup.select_one("[class*='company'], [class*='employer'], [class*='recruiter']")
                if company_el:
                    company = company_el.get_text(strip=True)[:500]

            if not location:
                loc_el = soup.select_one("[class*='location'], [class*='city'], [class*='stad']")
                if loc_el:
                    location = loc_el.get_text(strip=True)[:255]

            results.append({
                "title":         title,
                "description":   page_text[:2000],
                "company_name":  company or None,
                "contact_email": emails[0] if emails else None,
                "contact_phone": extract_phone(page_text),
                "location":      location or "Nederland",
                "source_url":    url,
                "source_name":   "uitzendbureau",
            })

            time.sleep(0.3)

        except Exception as e:
            logger.debug("[scraper] Uitzendbureau detail fout %s: %s", url, e)
            continue

    with_email = sum(1 for r in results if r.get("contact_email"))
    logger.info("[scraper] Uitzendbureau → %d vacatures (%d met e-mail)", len(results), with_email)
    return results


# ── Indeed via ScraperAPI ─────────────────────────────────────────────────────

def _scrape_indeed(max_pages: int = 2) -> list:
    """
    Indeed.nl via ScraperAPI. Vereist SCRAPERAPI_KEY.
    Slaat alle vacatures op waar een e-mailadres in staat.
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

    INDEED_QUERIES = [
        "solliciteer per email",
        "stuur cv naar",
        "mail je cv",
        "hr@",
        "recruitment@",
    ]

    results: list = []
    seen_job_keys: set = set()

    for query in INDEED_QUERIES:
        encoded_q = quote(query)
        for page_num in range(0, max_pages * 10, 10):
            search_url = f"https://nl.indeed.com/vacatures?q={encoded_q}&l=Nederland&sort=date&start={page_num}"
            try:
                resp = requests.get(_scraper_url(search_url, render=False), headers=HEADERS, timeout=30)
                resp.raise_for_status()
                soup = BeautifulSoup(resp.text, "html.parser")
            except Exception as e:
                logger.warning("[scraper] Indeed zoekpagina '%s' fout: %s", query, e)
                break

            job_keys = []
            for el in soup.select("[data-jk]"):
                jk = el.get("data-jk", "")
                if jk and jk not in seen_job_keys:
                    job_keys.append(jk)
                    seen_job_keys.add(jk)

            if not job_keys:
                for a in soup.find_all("a", href=True):
                    m = re.search(r"jk=([a-f0-9]+)", a["href"])
                    if m:
                        jk = m.group(1)
                        if jk not in seen_job_keys:
                            job_keys.append(jk)
                            seen_job_keys.add(jk)

            if not job_keys:
                break

            for jk in job_keys[:5]:
                detail_url = f"https://nl.indeed.com/viewjob?jk={jk}"
                try:
                    detail_resp = requests.get(_scraper_url(detail_url, render=True), headers=HEADERS, timeout=60)
                    detail_resp.raise_for_status()
                    detail_soup = BeautifulSoup(detail_resp.text, "html.parser")
                    detail_text = detail_soup.get_text(separator=" ", strip=True)

                    emails = _extract_emails(detail_text)
                    if not emails:
                        continue

                    title_el = detail_soup.find("h1")
                    title = title_el.get_text(strip=True)[:500] if title_el else "Vacature"

                    company_el = detail_soup.select_one("[data-company-name], [class*='jobsearch-CompanyInfoContainer']")
                    company = company_el.get_text(strip=True)[:500] if company_el else None

                    location_el = detail_soup.select_one("[data-testid='job-location'], [class*='jobsearch-JobLocationContainer']")
                    location = location_el.get_text(strip=True)[:255] if location_el else "Nederland"

                    for email in emails:
                        results.append({
                            "title": title,
                            "description": detail_text[:2000],
                            "company_name": company,
                            "contact_email": email,
                            "contact_phone": extract_phone(detail_text),
                            "location": location,
                            "source_url": detail_url,
                            "source_name": "indeed",
                        })
                except Exception as e:
                    logger.debug("[scraper] Indeed job %s fout: %s", jk, e)

    logger.info("[scraper] Indeed → %d vacatures", len(results))
    return results


# ── Custom URLs ───────────────────────────────────────────────────────────────

def _scrape_custom_url(url: str) -> list:
    """Scrape een enkele bedrijfscarrièrepagina."""
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

    return [{
        "title": title[:500],
        "description": page_text[:2000],
        "company_name": company[:500] if company else None,
        "contact_email": emails[0] if emails else None,
        "location": location or None,
        "source_url": url,
        "source_name": "custom",
    }]


# ── Hoofd-entry ───────────────────────────────────────────────────────────────

def run_scraper(source: str, custom_urls: Optional[list] = None) -> list:
    """
    Hoofd-entry voor scraping.

    source:
      - "adzuna"         → Adzuna Jobs API (vereist keys)
      - "arbeitnow"      → Arbeitnow API (gratis, geen key)
      - "remoteok"       → RemoteOK API (gratis, geen key)
      - "jooble"         → Jooble API (vereist JOOBLE_API_KEY)
      - "google_jobs"    → Google Jobs via SerpAPI (vereist SERPAPI_KEY)
      - "google_search"  → Google Search via SerpAPI, email-gericht (vereist SERPAPI_KEY)
      - "company_direct" → Bedrijfswebsites direct via SerpAPI inurl:vacatures/werken-bij (vereist SERPAPI_KEY)
      - "jobbird"        → Jobbird.com (NL vacaturesite, JSON API + detail pagina's)
      - "uitzendbureau"  → Uitzendbureau.nl (grote NL aggregator, BeautifulSoup)
      - "indeed"         → Indeed.nl via ScraperAPI (vereist SCRAPERAPI_KEY)
      - "werkzoeken"     → Werkzoeken.nl (BeautifulSoup)
      - "nvb"            → alias voor "arbeitnow"
      - "custom"         → custom_urls (lijst van URLs)
      - "all"            → alle bovenstaande bronnen

    Alleen vacatures MÉT contact_email worden opgeslagen — nodig voor claim-flow.
    """
    raw: list = []

    if source in ("adzuna", "all"):
        raw += _scrape_adzuna()
    if source in ("arbeitnow", "nvb", "all"):
        raw += _scrape_arbeitnow()
    if source in ("remoteok", "all"):
        raw += _scrape_remoteok()
    if source in ("google_jobs", "all"):
        raw += _scrape_google_jobs()
    if source in ("google_search", "all"):
        raw += _scrape_google_search_emails()
    if source in ("company_direct", "all"):
        raw += _scrape_company_career_pages()
    if source in ("werkzoeken", "all"):
        raw += _scrape_werkzoeken()
    if source in ("jobbird", "all"):
        raw += _scrape_jobbird()
    if source in ("uitzendbureau", "all"):
        raw += _scrape_uitzendbureau()
    if source in ("indeed", "all"):
        raw += _scrape_indeed()
    if source == "custom" or (source == "all" and custom_urls):
        for url in (custom_urls or []):
            raw += _scrape_custom_url(url)

    # Deduplicatie
    seen_urls: set = set()
    seen_email_title: set = set()
    unique: list = []
    for item in raw:
        src_url   = (item.get("source_url") or "").lower()
        email     = (item.get("contact_email") or "").lower()
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
