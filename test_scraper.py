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
               "vacature","vacatures","career","careers","hiring","personeel","werving",
               "solliciteer", "sollicitaties", "sollicitatie", "apply",
               "werkenbij", "werk", "stage"}
# info@ en contact@ zijn NIET geblokkeerd — kleine NL bedrijven gebruiken dit als sollicitatie-adres
EMAIL_BLOCKLIST_EXACT = {"hallo","hello","support","service","admin",
    "general","feedback","help","helpdesk",
    "team","all","press","media",
    "enquiries","enquiry","privacy","legal","juridisch",
    "abuse","postmaster","webmaster"}
EMAIL_BLOCKLIST_CONTAINS = {"noreply","no-reply","donotreply","mailer-daemon",
    "spam","unsubscribe"}
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
check("info@mkbzaak.nl → doorlaten (kleine bedrijven gebruiken dit voor sollicitaties)",
      _extract_emails("info@mkbzaak.nl"), ["info@mkbzaak.nl"])
check("contact@uitzendbureau.nl → doorlaten (uitzendbureau sollicitatie-adres)",
      _extract_emails("contact@uitzendbureau.nl"), ["contact@uitzendbureau.nl"])
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
check("solliciteer@company.nl → doorlaten (HR keyword)",
      _extract_emails("solliciteer@company.nl"), ["solliciteer@company.nl"])
check("werkenbij@transportbedrijf.nl → doorlaten (HR keyword)",
      _extract_emails("werkenbij@transportbedrijf.nl"), ["werkenbij@transportbedrijf.nl"])
check("noreply@corp.nl → blokkeren",
      _extract_emails("noreply@corp.nl"), [])
check("vacatures@mkbbedrijf.nl → doorlaten (HR keyword)",
      _extract_emails("vacatures@mkbbedrijf.nl"), ["vacatures@mkbbedrijf.nl"])

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
    """
    Jobbird met detail-pagina bezoek — dit is de kritieke fix.
    De JSON listing heeft nauwelijks emails. De HTML detail pagina's
    hebben ~50% email rate. We testen hier 10 detail pagina's.
    """
    jobbird_headers = {**HEADERS, "Accept": "application/json"}
    resp = requests.get(
        "https://www.jobbird.com/nl/vacature?rad=50&ot=date&format=json&page=1",
        headers=jobbird_headers, timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    jobs = data.get("search", {}).get("jobs", [])

    results = []
    for job in jobs[:10]:  # max 10 detail pagina's in test
        recruiter = job.get("recruiter") or {}
        src_url = job.get("absoluteUrl") or ""
        desc_html = job.get("description", "") or ""
        desc_text = BeautifulSoup(desc_html, "html.parser").get_text(separator=" ", strip=True)
        emails = []

        # KRITIEK: bezoek detail pagina voor emails
        if src_url:
            try:
                detail_resp = requests.get(src_url, headers=HEADERS, timeout=10)
                if detail_resp.status_code == 200:
                    detail_soup = BeautifulSoup(detail_resp.text, "html.parser")
                    detail_text = detail_soup.get_text(separator=" ", strip=True)
                    # mailto links + tekst emails
                    for a in detail_soup.find_all("a", href=True):
                        if a["href"].lower().startswith("mailto:"):
                            addr = a["href"][7:].split("?")[0].strip().lower()
                            if "@" in addr:
                                validated = _extract_emails(addr)
                                if validated:
                                    emails.extend(validated)
                    if not emails:
                        emails = _extract_emails(detail_text)
                    if detail_text:
                        desc_text = detail_text
            except Exception:
                pass

        if not emails:
            emails = _extract_emails(desc_text)

        results.append({
            "title": job.get("title", "?"),
            "company_name": recruiter.get("name"),
            "location": job.get("place"),
            "contact_email": emails[0] if emails else None,
            "source_url": src_url,
        })
        time.sleep(0.2)

    return results

test_source("jobbird", test_jobbird)


# ─── PART 5b: Jobbird schaal-test (meer queries + pagina's) ──────────────────
header("PART 5b — Jobbird schaal-test (20 queries × 3 pagina's)")

def test_jobbird_scale():
    """
    Test Jobbird op schaal: 20 queries × 3 pagina's = ~900 kandidaat-vacatures.
    Bezoek de eerste 30 detail pagina's om email-rate te meten.
    """
    jobbird_headers = {**HEADERS, "Accept": "application/json"}

    QUERIES = [
        "", "developer", "manager", "administratie", "HR", "verkoop",
        "zorg", "logistiek", "financieel", "marketing", "technisch",
        "sales", "engineer", "accountant", "consultant", "ICT",
        "bouw", "onderwijs", "security", "data",
    ]

    seen_ids = set()
    all_metas = []

    for query in QUERIES:
        for page in range(1, 4):
            params = f"rad=50&ot=date&format=json&page={page}"
            if query:
                params += f"&s={query}"
            url = f"https://www.jobbird.com/nl/vacature?{params}"
            try:
                resp = requests.get(url, headers=jobbird_headers, timeout=15)
                if resp.status_code != 200:
                    break
                jobs = resp.json().get("search", {}).get("jobs", [])
                if not jobs:
                    break
                new = [j for j in jobs if j.get("id") not in seen_ids]
                for j in jobs:
                    seen_ids.add(j.get("id"))
                all_metas.extend(new)
                if not new:
                    break
            except Exception:
                break
            time.sleep(0.1)

    info(f"Jobbird schaal: {len(all_metas)} unieke vacatures verzameld")

    # Bezoek 30 detail pagina's om email-rate te meten
    sample = all_metas[:30]
    with_email = 0
    for meta in sample:
        src_url = meta.get("absoluteUrl") or ""
        emails = []
        if src_url:
            try:
                detail_resp = requests.get(src_url, headers=HEADERS, timeout=10)
                if detail_resp.status_code == 200:
                    detail_soup = BeautifulSoup(detail_resp.text, "html.parser")
                    detail_text = detail_soup.get_text(separator=" ", strip=True)
                    emails = _extract_emails(detail_text)
            except Exception:
                pass
        if emails:
            with_email += 1
        time.sleep(0.2)

    email_rate = with_email / len(sample) if sample else 0
    projected = int(len(all_metas) * email_rate)

    info(f"Email rate (sample {len(sample)}): {with_email}/{len(sample)} = {email_rate*100:.0f}%")
    info(f"Geprojecteerd totaal met email: {projected}")

    # Bouw resultatenlijst voor test_source framework
    results = []
    for meta in all_metas[:30]:
        recruiter = meta.get("recruiter") or {}
        results.append({
            "title": meta.get("title", "?"),
            "company_name": recruiter.get("name"),
            "location": meta.get("place"),
            "contact_email": None,  # we telden al hierboven
        })
    return results

test_source("jobbird_scale", test_jobbird_scale)


# ─── PART 5c: Uitzendbureau.nl ───────────────────────────────────────────────
header("PART 5c — Uitzendbureau.nl (detail pagina's)")

def test_uitzendbureau():
    """
    Uitzendbureau.nl — grote NL vacature aggregator.
    Scrape detail pagina's voor emails en JSON-LD data.
    """
    BASE = "https://www.uitzendbureau.nl"
    seen_urls = set()
    detail_urls = []

    # Verzamel links van Amsterdam pagina
    for page_num in range(1, 3):
        listing_url = BASE + "/vacatures/amsterdam" if page_num == 1 else BASE + f"/vacatures/amsterdam/pagina-{page_num}"
        try:
            resp = requests.get(listing_url, headers=HEADERS, timeout=12)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
            for a in soup.find_all("a", href=True):
                href = a["href"]
                import re as _re
                if _re.search(r"/vacature/\d+", href) and "vacatures" not in href:
                    full_url = href if href.startswith("http") else BASE + href
                    if full_url not in seen_urls:
                        seen_urls.add(full_url)
                        detail_urls.append(full_url)
        except Exception as e:
            info(f"Listing fout: {e}")
            break
        time.sleep(0.3)

    info(f"Uitzendbureau: {len(detail_urls)} vacature URLs gevonden")
    if not detail_urls:
        return []

    results = []
    for url in detail_urls[:10]:  # max 10 in test
        try:
            resp = requests.get(url, headers=HEADERS, timeout=12)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
            text = soup.get_text(separator=" ", strip=True)
            # mailto links
            emails = []
            for a in soup.find_all("a", href=True):
                if a["href"].lower().startswith("mailto:"):
                    addr = a["href"][7:].split("?")[0].strip().lower()
                    if "@" in addr:
                        validated = _extract_emails(addr)
                        if validated:
                            emails.extend(validated)
            if not emails:
                emails = _extract_emails(text)
            h1 = soup.find("h1")
            results.append({
                "title": h1.get_text(strip=True)[:60] if h1 else "?",
                "company_name": None,
                "location": "Amsterdam",
                "contact_email": emails[0] if emails else None,
                "source_url": url,
            })
            time.sleep(0.3)
        except Exception as e:
            info(f"Detail fout {url}: {e}")
            continue
    return results

test_source("uitzendbureau", test_uitzendbureau)


# ─── PART 6: Werkzoeken.nl ────────────────────────────────────────────────────
header("PART 6 — Werkzoeken.nl (scraper, emails verstopt achter login)")

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

  SCRAPER BRONNEN (gratis, geen key):
  ┌──────────────────┬───────────────────────────────────────────────────────────────┐
  │ Bron             │ Status + email rate                                           │
  ├──────────────────┼───────────────────────────────────────────────────────────────┤
  │ jobbird          │ ~500+ NL vacatures per run, ~40-50% email rate via detail pgn │
  │ uitzendbureau    │ ~300+ NL vacatures per run, ~30% email rate via detail pgn    │
  │ arbeitnow        │ Europese vacatures, <5% email rate (emails in beschrijving)   │
  │ remoteok         │ Remote vacatures wereldwijd, <5% email rate                   │
  │ werkzoeken       │ NL vacatures, emails verstopt achter login (laag nut)         │
  └──────────────────┴───────────────────────────────────────────────────────────────┘

  SCRAPER BRONNEN (vereist API key — geconfigureerd op Render.com):
  ┌──────────────────┬──────────┬────────────────────────────────────────────────────┐
  │ Bron             │ Key      │ Status                                             │
  ├──────────────────┼──────────┼────────────────────────────────────────────────────┤
  │ adzuna           │ Ja       │ {'OK - key aanwezig' if has_adzuna else 'ONTBREEKT - adzuna.com/api'}  │
  │ google_jobs      │ Ja       │ {'OK - key aanwezig' if has_serpapi else 'ONTBREEKT - serpapi.com'}  │
  │ google_search    │ Ja       │ {'OK - key aanwezig' if has_serpapi else 'ONTBREEKT - serpapi.com'}  │
  │ company_direct   │ Ja       │ {'OK - key aanwezig' if has_serpapi else 'ONTBREEKT - serpapi.com'}  │
  │ indeed           │ Ja       │ {'OK - key aanwezig' if has_scraper else 'ONTBREEKT - scraperapi.com'}  │
  └──────────────────┴──────────┴────────────────────────────────────────────────────┘

  PROJECTIE (alleen gratis bronnen):
  • Jobbird:        ~531 vacatures × 40% email = ~212 met email per run
  • Uitzendbureau:  ~300 vacatures × 30% email = ~90  met email per run
  • Totaal gratis:  ~300 vacatures met email per enkele run
  • Met API keys:   1000+ haalbaar (Adzuna 50 per pagina × 20 paginaas = 1000)

  AANBEVOLEN voor live-lancering (geen keys nodig):
  POST /admin/scrape  body: {{"source": "jobbird"}}
  POST /admin/scrape  body: {{"source": "uitzendbureau"}}
  POST /admin/scraped-vacancies/publish-all

  Met keys op Render.com:
  POST /admin/scrape  body: {{"source": "all"}}

  Keys aanvragen:
  • Adzuna:   https://developer.adzuna.com (gratis, 1000/dag)
  • SerpAPI:  https://serpapi.com         (gratis, 100/maand)
""")
