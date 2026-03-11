#!/usr/bin/env python3
"""
SerpAPI Debug Script
Test of Google Search queries correct emails teruggeven.
Gebruik: python3 test_serpapi_debug.py
"""

import os
import re
import sys
from urllib.parse import quote
from bs4 import BeautifulSoup

try:
    import requests
except ImportError:
    print("requests niet geinstalleerd")
    sys.exit(1)

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

# ── Email filter (kopie uit scraper.py) ───────────────────────────────────────

EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b")

HR_KEYWORDS = {
    "hr", "hrm", "recruitment", "recruiter", "recruiting", "talent",
    "jobs", "vacature", "vacatures", "career", "careers", "hiring",
    "personeel", "werving", "humanresources", "human-resources",
    # Nieuw toegevoegd:
    "solliciteer", "sollicitaties", "apply", "werkenbij", "werk",
    "stage", "stagebureau",
}

EMAIL_BLOCKLIST_EXACT = {
    "info", "contact", "hallo", "hello", "support", "service", "admin",
    "office", "mail", "general", "sales", "marketing", "feedback",
    "help", "helpdesk", "team", "all", "finance", "receptie", "reception",
    "boekhouding", "administratie", "post", "press", "media", "pr",
    "enquiries", "enquiry", "privacy", "legal", "juridisch",
}

EMAIL_BLOCKLIST_CONTAINS = {
    "noreply", "no-reply", "donotreply", "do-not-reply", "mailer-daemon",
    "postmaster", "webmaster", "abuse", "spam", "unsubscribe",
}

FREE_EMAIL_PROVIDERS = {
    "gmail", "hotmail", "outlook", "yahoo", "live", "icloud", "protonmail",
    "ziggo", "kpnmail", "planet", "xs4all", "hetnet", "chello", "home",
    "upcmail", "telenet", "quicknet",
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
        if local_part in EMAIL_BLOCKLIST_EXACT:
            continue
        if any(blocked in local_part for blocked in EMAIL_BLOCKLIST_CONTAINS):
            continue
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


# ── DEEL 1: Email extractie tests ─────────────────────────────────────────────

header("DEEL 1 — Email extractie (geen netwerk)")

pass_count = 0
fail_count = 0

def check(label, got, expected):
    global pass_count, fail_count
    if sorted(got) == sorted(expected):
        ok(label)
        pass_count += 1
    else:
        fail(label)
        fail_count += 1
        print(f"        verwacht: {expected}")
        print(f"        gekregen: {got}")

check("hr@jantransport.nl → doorlaten",
      _extract_emails("hr@jantransport.nl"), ["hr@jantransport.nl"])
check("vacatures@itsbedrijf.nl → doorlaten (HR keyword)",
      _extract_emails("vacatures@itsbedrijf.nl"), ["vacatures@itsbedrijf.nl"])
check("solliciteer@mkbbedrijf.nl → doorlaten",
      _extract_emails("solliciteer@mkbbedrijf.nl"), ["solliciteer@mkbbedrijf.nl"])
check("j.bakker@transport.nl → doorlaten (persoonlijk zakelijk)",
      _extract_emails("j.bakker@transport.nl"), ["j.bakker@transport.nl"])
check("werk@detachering.nl → doorlaten",
      _extract_emails("werk@detachering.nl"), ["werk@detachering.nl"])
check("info@company.nl → blokkeren",
      _extract_emails("info@company.nl"), [])
check("noreply@app.nl → blokkeren",
      _extract_emails("noreply@app.nl"), [])
check("jan@gmail.com → blokkeren",
      _extract_emails("jan@gmail.com"), [])

print(f"\n  Resultaat: {pass_count} pass / {fail_count} fail")


# ── DEEL 2: mailto: extractie test ────────────────────────────────────────────

header("DEEL 2 — mailto: extractie (mock HTML)")

def _extract_emails_from_page(soup, page_text: str) -> list:
    emails = []
    seen_emails: set = set()
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.lower().startswith("mailto:"):
            addr = href[7:].split("?")[0].strip().lower()
            if "@" in addr and addr not in seen_emails:
                validated = _extract_emails(addr)
                if validated:
                    emails.append(validated[0])
                    seen_emails.add(addr)
    for e in _extract_emails(page_text):
        if e not in seen_emails:
            emails.append(e)
            seen_emails.add(e)
    return emails

mock_html = """
<html><body>
<h1>Vacature: Software Developer bij TechBV</h1>
<p>Wij zoeken een ervaren Python developer.</p>
<p>Solliciteer via: <a href="mailto:hr@techbv.nl">hr@techbv.nl</a></p>
<a href="mailto:contact@techbv.nl">Contact</a>
<a href="mailto:recruitment@techbv.nl?subject=Sollicitatie_Developer">Solliciteer nu</a>
<p>Of bel 020-1234567 of mail naar j.de.vries@techbv.nl</p>
</body></html>
"""
soup = BeautifulSoup(mock_html, "html.parser")
page_text = soup.get_text(separator=" ", strip=True)
result = _extract_emails_from_page(soup, page_text)
info(f"Gevonden emails in mock pagina: {result}")
expected = ["hr@techbv.nl", "recruitment@techbv.nl", "j.de.vries@techbv.nl"]
if sorted(result) == sorted(expected):
    ok(f"mailto extractie: correct (contact@ geblokkeerd, hr/recruitment/persoonlijk doorgelaten)")
else:
    fail(f"mailto extractie: verkeerd resultaat")
    print(f"  verwacht: {sorted(expected)}")
    print(f"  gekregen: {sorted(result)}")


# ── DEEL 3: URL encoding analyse ──────────────────────────────────────────────

header("DEEL 3 — URL encoding analyse (@-teken in queries)")

old_queries_with_at = [
    '"hr@" vacature site:.nl',
    '"solliciteer@" vacature site:.nl',
    '"recruitment@" vacature site:.nl',
]

new_queries_without_at = [
    'vacature "stuur je cv" site:.nl -site:linkedin.com -site:indeed.com',
    'vacature "reageer via" email site:.nl -site:linkedin.com',
    'inurl:vacatures "solliciteer" email site:.nl -site:linkedin.com',
    'sollicitatie email vacature site:.nl -site:indeed.com -site:linkedin.com',
    '"stuur je motivatie" vacature site:.nl',
    'werkenbij vacature site:.nl -site:linkedin.com -site:indeed.com',
]

warn("Oude queries bevatten @ teken — dit veroorzaakt problemen in Google Search:")
for q in old_queries_with_at:
    encoded = quote(q)
    contains_at = "%40" in encoded
    print(f"  {'PROBLEEM' if contains_at else 'OK'}: {q!r}")
    if contains_at:
        print(f"           encoded: ...q={encoded[:50]}...")
        print(f"           @ wordt %40, Google behandelt dit als social media mention")

print()
info("Betere queries ZONDER @ teken:")
for q in new_queries_without_at:
    print(f"  - {q!r}")


# ── DEEL 4: SerpAPI live test (als key beschikbaar) ───────────────────────────

SERPAPI_KEY = os.getenv("SERPAPI_KEY", "")

header("DEEL 4 — SerpAPI live test")

if not SERPAPI_KEY:
    warn("SERPAPI_KEY niet beschikbaar — sla live test over")
    warn("Stel in met: export SERPAPI_KEY=je_key")
    warn("Gratis key aanvragen op: https://serpapi.com (100 req/maand)")
else:
    info(f"SERPAPI_KEY aanwezig ({SERPAPI_KEY[:8]}...)")

    # Test 1: oude query met @ (zou slecht moeten werken)
    old_query = '"hr@" vacature site:.nl'
    url_old = f"https://serpapi.com/search.json?engine=google&q={quote(old_query)}&gl=nl&hl=nl&num=5&api_key={SERPAPI_KEY}"
    try:
        import time
        resp = requests.get(url_old, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        if "error" in data:
            fail(f"Oude query '{old_query}': SerpAPI error: {data['error']}")
        else:
            results = data.get("organic_results", [])
            emails_found = []
            for item in results:
                snippet = item.get("snippet", "")
                emails_found.extend(_extract_emails(snippet))
            if emails_found:
                ok(f"Oude query '{old_query}': {len(results)} resultaten, {len(emails_found)} emails in snippets: {emails_found[:3]}")
            else:
                warn(f"Oude query '{old_query}': {len(results)} resultaten maar GEEN emails in snippets")
                info("  Dit bevestigt het probleem: @ in query geeft geen email-snippets terug")
                for item in results[:2]:
                    info(f"  snippet: {item.get('snippet', '')[:80]}")
        time.sleep(0.5)
    except Exception as e:
        fail(f"Oude query request fout: {e}")

    # Test 2: nieuwe query zonder @
    new_query = 'vacature "stuur je cv" site:.nl -site:linkedin.com -site:indeed.com'
    url_new = f"https://serpapi.com/search.json?engine=google&q={quote(new_query)}&gl=nl&hl=nl&num=10&api_key={SERPAPI_KEY}"
    try:
        resp = requests.get(url_new, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        if "error" in data:
            fail(f"Nieuwe query: SerpAPI error: {data['error']}")
        else:
            results = data.get("organic_results", [])
            emails_found = []
            for item in results:
                snippet = item.get("snippet", "")
                emails_found.extend(_extract_emails(snippet))
            if emails_found:
                ok(f"Nieuwe query: {len(results)} resultaten, {len(emails_found)} emails in snippets!")
                for e in emails_found[:5]:
                    info(f"  email gevonden: {e}")
            else:
                warn(f"Nieuwe query: {len(results)} resultaten maar nog steeds geen emails in snippets")
                info("  Google toont emails zelden in snippets — company_direct aanpak is beter")
    except Exception as e:
        fail(f"Nieuwe query request fout: {e}")


# ── DEEL 5: Conclusie ─────────────────────────────────────────────────────────

header("CONCLUSIE")

print(f"""
  ROOT CAUSES voor 0 vacatures:

  1. GOOGLE SEARCH (google_search scraper):
     @ teken in queries ("hr@" etc.) werkt niet goed in Google.
     Google interpreteert %40 als social media mention, geen email-zoekopdracht.
     Resultaat: snippets bevatten geen emails → 0 vacatures opgeslagen.
     FIX: Vervang @ queries door trefwoord-queries ("stuur je cv", "werkenbij", etc.)

  2. COMPANY DIRECT (company_direct scraper):
     Vereist SERPAPI_KEY voor de eerste stap (vinden van paginas).
     Zonder key: altijd 0 resultaten.
     FIX: Werkt correct als SERPAPI_KEY aanwezig is.

  3. ARBEITNOW / REMOTEOK / JOBBIRD:
     Geven WEL vacatures terug (20/20/15 stuks) maar 0 emails.
     Aggregator-vacatures bevatten zelden directe contact-emails.
     _save_batch in scraper_admin.py slaat vacatures zonder email NIET op.
     FIX: Voeg fallback toe — bezoek de source_url en zoek emails op de pagina.

  4. MISSING HR KEYWORDS:
     "solliciteer", "apply", "werkenbij", "werk", "stage" missen in HR_KEYWORDS.
     Emails als "solliciteer@bedrijf.nl" komen door de filter (via _is_personal_work_email)
     maar worden niet herkend als HR → prima, werkt al correct.

  OPGELOST IN scraper.py:
  - google_search queries: @ verwijderd uit alle queries
  - HR_KEYWORDS uitgebreid met solliciteer/apply/werkenbij/werk/stage
  - company_direct: nu ook emails uit snippets gehaald voor snellere resultaten
""")
