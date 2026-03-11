#!/usr/bin/env python3
"""
VorzaIQ Scraper Test Suite
Test alle scrapers live + email-filter unit tests.

Gebruik:
  python3 test_scraper.py              # alle tests
  python3 test_scraper.py arbeitnow    # alleen 1 bron testen
  python3 test_scraper.py --quick      # alleen gratis bronnen (geen API keys nodig)

Kleur-codes:
  PASS  groen   → werkt correct
  FAIL  rood    → fout of 0 resultaten
  WARN  geel    → werkt maar let op (bijv. geen API key)
  INFO  blauw   → informatief
"""

import os
import re
import sys
import time
import requests
from typing import Optional, List
from bs4 import BeautifulSoup

# ─── KLEUREN ──────────────────────────────────────────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

def ok(msg):   print(f"  {GREEN}PASS{RESET}  {msg}")
def fail(msg): print(f"  {RED}FAIL{RESET}  {msg}")
def warn(msg): print(f"  {YELLOW}WARN{RESET}  {msg}")
def info(msg): print(f"  {CYAN}INFO{RESET}  {msg}")
def header(t): print(f"\n{BOLD}{'='*60}{RESET}\n{BOLD}{CYAN}{t}{RESET}\n{'='*60}")

pass_count = 0
fail_count = 0

def check(label, got, expected):
    global pass_count, fail_count
    if sorted(got) == sorted(expected):
        ok(f"{label}")
        pass_count += 1
    else:
        fail(f"{label}")
        fail_count += 1
        print(f"        verwacht: {expected}")
        print(f"        gekregen: {got}")

# ─── EMAIL FILTER (lokaal, geen netwerk) ──────────────────────────────────────
EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b")
HR_KEYWORDS = {"hr","hrm","recruitment","recruiter","recruiting","talent","jobs",
               "vacature","vacatures","career","careers","hiring","personeel","werving"}
EMAIL_BLOCKLIST_EXACT = {"info","contact","hallo","hello","support","service","admin",
    "office","mail","general","sales","marketing","feedback","help","helpdesk",
    "team","all","finance","receptie","reception","boekhouding","administratie"}
EMAIL_BLOCKLIST_CONTAINS = {"noreply","no-reply","donotreply","postmaster","webmaster",
    "abuse","spam","unsubscribe"}
FREE_PROVIDERS = {"gmail","hotmail","outlook","yahoo","live","icloud","protonmail",
    "ziggo","kpnmail","planet","xs4all"}

def _is_personal_work_email(local, domain):
    if domain.split(".")[0].lower() in FREE_PROVIDERS:
        return False
    clean = local.replace(".","").replace("-","").replace("_","")
    if not clean.isalpha() or not (2 <= len(clean) <= 30):
        return False
    return "." in local or len(local) <= 15

def _extract_emails(text):
    result, seen = [], set()
    for email in EMAIL_RE.findall(text):
        el = email.lower()
        if el in seen: continue
        parts = el.split("@")
        if len(parts) != 2: continue
        local, domain = parts
        # Blocklist first — overrides everything else
        if local in EMAIL_BLOCKLIST_EXACT: continue
        if any(b in local for b in EMAIL_BLOCKLIST_CONTAINS): continue
        # Block free providers
        if domain.split(".")[0].lower() in FREE_PROVIDERS: continue
        if any(kw in local for kw in HR_KEYWORDS):
            seen.add(el); result.append(el); continue
        if _is_personal_work_email(local, domain):
            seen.add(el); result.append(el); continue
        seen.add(el); result.append(el)
    return result

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "nl-NL,nl;q=0.9,en;q=0.8",
}

# ─── ARGUMENT PARSING ─────────────────────────────────────────────────────────
args = sys.argv[1:]
quick_mode = "--quick" in args
specific_source = next((a for a in args if not a.startswith("--")), None)

# ─── PART 1: Email filter unit tests ──────────────────────────────────────────
header("PART 1 — Email filter unit tests")

check("hr@bedrijf.nl → doorlaten (HR keyword)",
      _extract_emails("hr@bedrijf.nl"), ["hr@bedrijf.nl"])
check("info@company.nl → blokkeren",
      _extract_emails("info@company.nl"), [])
check("noreply@app.nl → blokkeren",
      _extract_emails("noreply@app.nl"), [])
check("recruitment@acme.com → doorlaten (HR keyword)",
      _extract_emails("stuur cv naar recruitment@acme.com"), ["recruitment@acme.com"])
check("j.doe@bedrijf.nl → doorlaten (persoonlijk zakelijk)",
      _extract_emails("j.doe@bedrijf.nl"), ["j.doe@bedrijf.nl"])
check("jan.bakker@mkb.nl → doorlaten (persoonlijk zakelijk)",
      _extract_emails("jan.bakker@mkb.nl"), ["jan.bakker@mkb.nl"])
check("marie@startup.io → doorlaten (korte naam)",
      _extract_emails("marie@startup.io"), ["marie@startup.io"])
check("jan@gmail.com → blokkeren (gratis provider)",
      _extract_emails("jan@gmail.com"), [])
check("solliciteer@company.nl → doorlaten (niet geblokkeerd)",
      _extract_emails("solliciteer@company.nl"), ["solliciteer@company.nl"])
check("contact@corp.nl + noreply@corp.nl → beide geblokkeerd",
      _extract_emails("contact@corp.nl of noreply@corp.nl"), [])

print(f"\n  Email filter: {pass_count} pass / {fail_count} fail")

if specific_source and specific_source != "email":
    # Sla naar het gevraagde onderdeel
    pass

# ─── PART 2: API keys check ───────────────────────────────────────────────────
header("PART 2 — API keys configuratie")

keys = {
    "ADZUNA_APP_ID":  os.getenv("ADZUNA_APP_ID", ""),
    "ADZUNA_APP_KEY": os.getenv("ADZUNA_APP_KEY", ""),
    "SCRAPERAPI_KEY": os.getenv("SCRAPERAPI_KEY", ""),
    "SERPAPI_KEY":    os.getenv("SERPAPI_KEY", ""),
}

for key, val in keys.items():
    if val:
        ok(f"{key}: geconfigureerd ({val[:8]}...)")
    else:
        warn(f"{key}: NIET geconfigureerd — deze scraper wordt overgeslagen")

has_adzuna   = bool(keys["ADZUNA_APP_ID"] and keys["ADZUNA_APP_KEY"])
has_scraper  = bool(keys["SCRAPERAPI_KEY"])
has_serpapi  = bool(keys["SERPAPI_KEY"])

# ─── LIVE SCRAPER TESTS ───────────────────────────────────────────────────────

def test_source(name, test_fn, requires_key=False, key_present=True, skip_in_quick=False):
    """Voer een scraper test uit en rapporteer het resultaat."""
    if specific_source and specific_source != name:
        return
    if skip_in_quick and quick_mode:
        info(f"{name}: overgeslagen (--quick mode)")
        return
    if requires_key and not key_present:
        warn(f"{name}: overgeslagen (geen API key)")
        return

    print(f"\n  Testen: {BOLD}{name}{RESET}")
    start = time.time()
    try:
        results = test_fn()
        elapsed = time.time() - start
        count = len(results) if results else 0
        with_email = sum(1 for r in (results or []) if r.get("contact_email"))

        if count > 0:
            ok(f"{name}: {count} vacatures in {elapsed:.1f}s ({with_email} met e-mail)")
            for r in (results or [])[:3]:
                title = r.get("title", "?")[:50]
                email = r.get("contact_email") or "—"
                loc   = r.get("location") or "?"
                company = r.get("company_name") or "?"
                info(f"  • {title} | {company} | {loc} | {email}")
        else:
            fail(f"{name}: 0 vacatures (elapsed={elapsed:.1f}s)")
    except Exception as e:
        fail(f"{name}: FOUT — {e}")


# ─── PART 3: Arbeitnow (gratis, geen key) ─────────────────────────────────────
header("PART 3 — Arbeitnow API (gratis)")

def test_arbeitnow():
    resp = requests.get("https://www.arbeitnow.com/api/job-board-api?page=1", headers=HEADERS, timeout=20)
    resp.raise_for_status()
    data = resp.json()
    jobs = data.get("data", [])
    results = []
    for job in jobs[:20]:
        desc = job.get("description", "") or ""
        emails = _extract_emails(desc)
        results.append({
            "title": job.get("title", "?"),
            "company_name": job.get("company_name"),
            "location": job.get("location"),
            "contact_email": emails[0] if emails else None,
        })
    return results

test_source("arbeitnow", test_arbeitnow)


# ─── PART 4: RemoteOK (gratis, geen key) ──────────────────────────────────────
header("PART 4 — RemoteOK API (gratis)")

def test_remoteok():
    resp = requests.get(
        "https://remoteok.io/api",
        headers={"User-Agent": HEADERS["User-Agent"], "Accept": "application/json"},
        timeout=20,
    )
    resp.raise_for_status()
    data = resp.json()
    results = []
    for job in data[1:21]:  # eerste item = metadata
        if not isinstance(job, dict): continue
        desc = job.get("description", "") or ""
        emails = _extract_emails(desc)
        results.append({
            "title": job.get("position", "?"),
            "company_name": job.get("company"),
            "location": job.get("location") or "Remote",
            "contact_email": emails[0] if emails else None,
        })
    return results

test_source("remoteok", test_remoteok)


# ─── PART 5: Jobbird.com ──────────────────────────────────────────────────────
header("PART 5 — Jobbird.com (NL)")

def test_jobbird():
    jobbird_headers = {**HEADERS, "Accept": "application/json"}
    resp = requests.get(
        "https://www.jobbird.com/nl/vacature?s=developer&rad=30&ot=date&format=json&page=1",
        headers=jobbird_headers, timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    jobs = data.get("search", {}).get("jobs", [])
    results = []
    for job in jobs[:20]:
        desc_html = job.get("description", "") or ""
        desc_text = BeautifulSoup(desc_html, "html.parser").get_text(separator=" ", strip=True)
        emails = _extract_emails(desc_text)
        recruiter = job.get("recruiter") or {}
        results.append({
            "title": job.get("title", "?"),
            "company_name": recruiter.get("name"),
            "location": job.get("place"),
            "contact_email": emails[0] if emails else None,
        })
    return results

test_source("jobbird", test_jobbird)


# ─── PART 6: Werkzoeken.nl ────────────────────────────────────────────────────
header("PART 6 — Werkzoeken.nl (scraper)")

def test_werkzoeken():
    resp = requests.get("https://www.werkzoeken.nl/vacatures/", headers=HEADERS, timeout=15)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    links = list(dict.fromkeys([
        ("https://www.werkzoeken.nl" + a["href"]) if not a["href"].startswith("http") else a["href"]
        for a in soup.find_all("a", href=True)
        if "/vacature/" in a["href"] or "/job/" in a["href"]
    ]))[:5]

    if not links:
        return []

    results = []
    for link in links:
        try:
            dsoup = BeautifulSoup(requests.get(link, headers=HEADERS, timeout=10).text, "html.parser")
            text = dsoup.get_text(separator=" ", strip=True)
            emails = _extract_emails(text)
            h1 = dsoup.find("h1")
            results.append({
                "title": h1.get_text(strip=True)[:60] if h1 else "?",
                "company_name": None,
                "location": "Nederland",
                "contact_email": emails[0] if emails else None,
            })
        except Exception:
            continue
    return results

test_source("werkzoeken", test_werkzoeken, skip_in_quick=True)


# ─── PART 7: Adzuna API ───────────────────────────────────────────────────────
header("PART 7 — Adzuna API (vereist key)")

def test_adzuna():
    aid = os.getenv("ADZUNA_APP_ID", "")
    akey = os.getenv("ADZUNA_APP_KEY", "")
    url = f"https://api.adzuna.com/v1/api/jobs/nl/search/1?app_id={aid}&app_key={akey}&results_per_page=20&content-type=application/json"
    resp = requests.get(url, headers=HEADERS, timeout=20)
    resp.raise_for_status()
    data = resp.json()
    results = []
    for job in data.get("results", []):
        desc = job.get("description", "") or ""
        emails = _extract_emails(desc)
        results.append({
            "title": job.get("title", "?"),
            "company_name": job.get("company", {}).get("display_name"),
            "location": job.get("location", {}).get("display_name"),
            "contact_email": emails[0] if emails else None,
        })
    return results

test_source("adzuna", test_adzuna, requires_key=True, key_present=has_adzuna)


# ─── PART 8: SerpAPI Google Jobs ──────────────────────────────────────────────
header("PART 8 — SerpAPI Google Jobs (vereist key)")

def test_serpapi():
    from urllib.parse import quote
    key = os.getenv("SERPAPI_KEY", "")
    url = f"https://serpapi.com/search.json?engine=google_jobs&q={quote('vacature amsterdam')}&gl=nl&hl=nl&api_key={key}"
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    if "error" in data:
        raise Exception(data["error"])
    results = []
    for job in data.get("jobs_results", []):
        desc = job.get("description") or ""
        emails = _extract_emails(desc)
        results.append({
            "title": job.get("title", "?"),
            "company_name": job.get("company_name"),
            "location": job.get("location"),
            "contact_email": emails[0] if emails else None,
        })
    return results

test_source("google_jobs", test_serpapi, requires_key=True, key_present=has_serpapi)


# ─── PART 9: Indeed via ScraperAPI ────────────────────────────────────────────
header("PART 9 — Indeed via ScraperAPI (vereist key, duur in credits)")

def test_indeed():
    from urllib.parse import quote
    key = os.getenv("SCRAPERAPI_KEY", "")
    search_url = "https://nl.indeed.com/vacatures?q=hr%40&l=Nederland&sort=date"
    scraper_url = f"http://api.scraperapi.com?api_key={key}&url={quote(search_url)}&country_code=nl"
    resp = requests.get(scraper_url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    job_keys = [el.get("data-jk", "") for el in soup.select("[data-jk]") if el.get("data-jk")]
    info(f"Indeed: {len(job_keys)} job-keys gevonden op zoekpagina")
    if not job_keys:
        return []
    # Haal alleen eerste detail op (credits sparen)
    jk = job_keys[0]
    detail_url = f"https://nl.indeed.com/viewjob?jk={jk}"
    detail_resp = requests.get(
        f"http://api.scraperapi.com?api_key={key}&url={quote(detail_url)}&country_code=nl&render=true",
        headers=HEADERS, timeout=60,
    )
    detail_soup = BeautifulSoup(detail_resp.text, "html.parser")
    text = detail_soup.get_text(separator=" ", strip=True)
    emails = _extract_emails(text)
    h1 = detail_soup.find("h1")
    return [{
        "title": h1.get_text(strip=True)[:60] if h1 else "?",
        "company_name": None,
        "location": "Nederland",
        "contact_email": emails[0] if emails else None,
    }]

test_source("indeed", test_indeed, requires_key=True, key_present=has_scraper, skip_in_quick=True)


# ─── SAMENVATTING ─────────────────────────────────────────────────────────────
header("SAMENVATTING")

print(f"""
  Email filter unit tests:  {pass_count} pass / {fail_count} fail

  SCRAPER BRONNEN:
  ┌─────────────────┬──────────────┬─────────────────────────────────────┐
  │ Bron            │ Key vereist  │ Status                              │
  ├─────────────────┼──────────────┼─────────────────────────────────────┤
  │ arbeitnow       │ Nee (gratis) │ Altijd beschikbaar                  │
  │ remoteok        │ Nee (gratis) │ Altijd beschikbaar                  │
  │ jobbird         │ Nee          │ NL-specifiek, JSON API              │
  │ werkzoeken      │ Nee          │ BeautifulSoup, kan geblokkeerd zijn │
  │ adzuna          │ Ja           │ {'OK - key aanwezig' if has_adzuna else 'ONTBREEKT - adzuna.com/api'}  │
  │ google_jobs     │ Ja           │ {'OK - key aanwezig' if has_serpapi else 'ONTBREEKT - serpapi.com'}  │
  │ indeed          │ Ja           │ {'OK - key aanwezig' if has_scraper else 'ONTBREEKT - scraperapi.com'}  │
  └─────────────────┴──────────────┴─────────────────────────────────────┘

  AANBEVOLEN VOLGORDE voor live-lancering:
  1. python3 test_scraper.py remoteok   → gratis, testen
  2. python3 test_scraper.py arbeitnow  → gratis, testen
  3. python3 test_scraper.py jobbird    → NL-gericht, testen

  Dan in de admin panel:
  POST /admin/scrape  body: {{"source": "all"}}
  POST /admin/scraped-vacancies/publish-all  → publiceer alles in één keer

  Keys aanvragen:
  • Adzuna:   https://developer.adzuna.com (gratis)
  • SerpAPI:  https://serpapi.com         (gratis, 100/mnd)
""")
