"""
Vacature Scraper — haalt vacatures op van externe bronnen.

Bronnen:
- Adzuna API (meest betrouwbaar, vereist ADZUNA_APP_ID + ADZUNA_APP_KEY)
- Nationale Vacaturebank (BeautifulSoup)
- Werkzoeken.nl (BeautifulSoup)
- Custom URLs (admin-opgegeven bedrijfscarrièrepagina's)

Alleen vacatures MET e-mailadres worden opgeslagen.
Deduplicatie: contact_email + title combinatie wordt niet dubbel opgeslagen.
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

# Regex voor e-mailadressen
EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b")

# E-mailadressen die we NIET willen (automatische mailboxen)
EMAIL_BLOCKLIST = {"noreply", "no-reply", "donotreply", "do-not-reply", "mailer-daemon",
                   "postmaster", "webmaster", "abuse", "spam", "unsubscribe"}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; ItsPeanutsBot/1.0; "
        "+https://its-peanuts-frontend.onrender.com)"
    )
}


def _extract_emails(text: str) -> list[str]:
    """Extraheer geldige e-mailadressen uit tekst en filter automatische mailboxen."""
    found = EMAIL_RE.findall(text)
    result = []
    seen = set()
    for email in found:
        email_lower = email.lower()
        local_part = email_lower.split("@")[0]
        if email_lower in seen:
            continue
        if any(blocked in local_part for blocked in EMAIL_BLOCKLIST):
            continue
        seen.add(email_lower)
        result.append(email_lower)
    return result


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
    Extraheert alle e-mailadressen + probeert vacaturetitel te vinden.
    """
    soup = _fetch_html(url)
    if not soup:
        return []

    page_text = soup.get_text(separator=" ", strip=True)
    emails = _extract_emails(page_text)
    if not emails:
        return []

    # Probeer titels uit h1/h2 te halen — één record per e-mail op de pagina
    headings = [h.get_text(strip=True) for h in soup.find_all(["h1", "h2"])[:5]]
    title = headings[0] if headings else "Vacature"

    # Bedrijfsnaam uit title-tag of og:site_name
    company = ""
    og_site = soup.find("meta", property="og:site_name")
    if og_site and og_site.get("content"):
        company = og_site["content"]
    elif soup.title:
        company = soup.title.get_text(strip=True)[:100]

    # Locatie: zoek op specifieke elementen of meta
    location = ""
    for sel in ["[itemprop='addressLocality']", ".location", ".place"]:
        el = soup.select_one(sel)
        if el:
            location = el.get_text(strip=True)[:100]
            break

    description = page_text[:2000]

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


def _scrape_nvb(max_pages: int = 3) -> list[dict]:
    """
    Scrape Nationale Vacaturebank zoekresultaten.
    Bezoekt detailpagina's om e-mailadressen te vinden.
    """
    results = []
    for page in range(1, max_pages + 1):
        url = f"https://www.nationalevacaturebank.nl/vacature/zoeken?page={page}"
        soup = _fetch_html(url)
        if not soup:
            break

        # Vacature-kaarten op NVB
        cards = soup.select("article.vacancy-card, .vacancy-list-item, [data-vacancy-id]")
        if not cards:
            # Fallback: alle links met /vacature/ in het pad
            cards = [a for a in soup.find_all("a", href=True) if "/vacature/" in a["href"]][:20]

        for card in cards[:10]:
            try:
                # Link naar detailpagina
                link = card.get("href") or (card.find("a") or {}).get("href", "")
                if not link:
                    continue
                if not link.startswith("http"):
                    link = "https://www.nationalevacaturebank.nl" + link

                detail_soup = _fetch_html(link)
                if not detail_soup:
                    continue

                detail_text = detail_soup.get_text(separator=" ", strip=True)
                emails = _extract_emails(detail_text)
                if not emails:
                    continue

                title_el = detail_soup.find("h1")
                title = title_el.get_text(strip=True)[:500] if title_el else "Vacature"

                company_el = detail_soup.select_one("[class*='company'], [class*='employer']")
                company = company_el.get_text(strip=True)[:500] if company_el else None

                location_el = detail_soup.select_one("[class*='location'], [class*='place']")
                location = location_el.get_text(strip=True)[:255] if location_el else None

                for email in emails:
                    results.append({
                        "title": title,
                        "description": detail_text[:2000],
                        "company_name": company,
                        "contact_email": email,
                        "location": location,
                        "source_url": link,
                        "source_name": "nvb",
                    })
            except Exception as e:
                logger.debug("[scraper] NVB kaart fout: %s", e)
                continue

    logger.info("[scraper] NVB → %d vacature(s) met e-mail", len(results))
    return results


def _scrape_werkzoeken(max_pages: int = 3) -> list[dict]:
    """
    Scrape Werkzoeken.nl zoekresultaten.
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

        links = list(dict.fromkeys(links))[:10]  # uniek + max 10

        for link in links:
            try:
                detail_soup = _fetch_html(link)
                if not detail_soup:
                    continue

                detail_text = detail_soup.get_text(separator=" ", strip=True)
                emails = _extract_emails(detail_text)
                if not emails:
                    continue

                title_el = detail_soup.find("h1")
                title = title_el.get_text(strip=True)[:500] if title_el else "Vacature"

                company_el = detail_soup.select_one("[class*='company'], [class*='employer'], [class*='bedrijf']")
                company = company_el.get_text(strip=True)[:500] if company_el else None

                location_el = detail_soup.select_one("[class*='location'], [class*='locatie']")
                location = location_el.get_text(strip=True)[:255] if location_el else None

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

    logger.info("[scraper] Werkzoeken → %d vacature(s) met e-mail", len(results))
    return results


def _scrape_adzuna(pages: int = 2) -> list[dict]:
    """
    Adzuna Jobs API — meest betrouwbaar.
    Vereist ADZUNA_APP_ID + ADZUNA_APP_KEY (gratis tier beschikbaar op adzuna.com/api).
    Filtert op resultaten die een e-mailadres bevatten in de beschrijving.
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
            if not emails:
                # Probeer ook de redirect URL te bezoeken voor e-mailadres
                redirect = job.get("redirect_url", "")
                if redirect:
                    try:
                        detail_resp = requests.get(
                            redirect, headers=HEADERS, timeout=10, allow_redirects=True
                        )
                        emails = _extract_emails(detail_resp.text)
                    except Exception:
                        pass
            if not emails:
                continue

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

    logger.info("[scraper] Adzuna → %d vacature(s) met e-mail", len(results))
    return results


def run_scraper(source: str, custom_urls: list[str] | None = None) -> list[dict]:
    """
    Hoofd-entry voor scraping.

    source:
      - "adzuna"     → Adzuna Jobs API
      - "nvb"        → Nationale Vacaturebank
      - "werkzoeken" → Werkzoeken.nl
      - "custom"     → Lijst van bedrijfs-URLs (custom_urls vereist)
      - "all"        → Alle bovenstaande bronnen

    Geeft lijst terug van dicts met sleutels:
      title, description, company_name, contact_email, location, source_url, source_name
    """
    raw: list[dict] = []

    if source in ("adzuna", "all"):
        raw += _scrape_adzuna()
    if source in ("nvb", "all"):
        raw += _scrape_nvb()
    if source in ("werkzoeken", "all"):
        raw += _scrape_werkzoeken()
    if source == "custom" or (source == "all" and custom_urls):
        for url in (custom_urls or []):
            raw += _scrape_custom_url(url)

    # Deduplicatie: zelfde contact_email + title → één record
    seen: set[tuple[str, str]] = set()
    unique: list[dict] = []
    for item in raw:
        key = (item["contact_email"].lower(), item["title"].lower()[:100])
        if key not in seen:
            seen.add(key)
            unique.append(item)

    logger.info("[scraper] Totaal uniek: %d (van %d)", len(unique), len(raw))
    return unique
