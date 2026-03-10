#!/usr/bin/env python3
"""
Test script voor de vacature scraper.
Diagnoseert waarom er 0 vacatures worden teruggegeven.
Compatible met Python 3.9+
"""

import sys
import os
import re
import requests
from typing import Optional, List
from bs4 import BeautifulSoup

# ─────────────────────────────────────────────────────────────────────────────
# Inlined scraper helpers (zodat Python 3.9 geen problemen heeft met 3.10+ syntax)
# ─────────────────────────────────────────────────────────────────────────────

EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b")

HR_KEYWORDS = {
    "hr", "hrm", "recruitment", "recruiter", "recruiting", "talent",
    "jobs", "vacature", "vacatures", "career", "careers", "hiring",
    "personeel", "werving", "humanresources", "human-resources",
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

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; ItsPeanutsBot/1.0; "
        "+https://its-peanuts-frontend.onrender.com)"
    )
}


def _extract_emails(text: str) -> List[str]:
    found = EMAIL_RE.findall(text)
    result = []
    seen = set()
    for email in found:
        email_lower = email.lower()
        local_part = email_lower.split("@")[0]
        if email_lower in seen:
            continue
        is_hr = any(kw in local_part for kw in HR_KEYWORDS)
        if not is_hr:
            if local_part in EMAIL_BLOCKLIST_EXACT:
                continue
            if any(blocked in local_part for blocked in EMAIL_BLOCKLIST_CONTAINS):
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
        print(f"    [fetch fout] {url}: {e}")
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


# ─────────────────────────────────────────────────────────────────────────────
# KLEUREN voor terminal output
# ─────────────────────────────────────────────────────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
RESET  = "\033[0m"

def ok(msg):   print(f"  {GREEN}PASS{RESET}  {msg}")
def fail(msg): print(f"  {RED}FAIL{RESET}  {msg}")
def info(msg): print(f"  {CYAN}INFO{RESET}  {msg}")
def warn(msg): print(f"  {YELLOW}WARN{RESET}  {msg}")

pass_count = 0
fail_count = 0


def check(label, got, expected):
    global pass_count, fail_count
    if sorted(got) == sorted(expected):
        ok(f"{label}: got {got}")
        pass_count += 1
    else:
        fail(f"{label}")
        fail_count += 1
        print(f"        verwacht: {expected}")
        print(f"        gekregen: {got}")


# ─────────────────────────────────────────────────────────────────────────────
# PART 1 — Email filter unit tests
# ─────────────────────────────────────────────────────────────────────────────
print(f"\n{'='*60}")
print(f"{CYAN}PART 1 — Email filter unit tests{RESET}")
print(f"{'='*60}")

check(
    "hr@bedrijf.nl (HR trefwoord)",
    _extract_emails("contact hr@bedrijf.nl voor meer info"),
    ["hr@bedrijf.nl"],
)

check(
    "info@company.nl (geblokkeerd)",
    _extract_emails("mail naar info@company.nl"),
    [],
)

check(
    "recruitment@acme.com (HR trefwoord)",
    _extract_emails("stuur cv naar recruitment@acme.com"),
    ["recruitment@acme.com"],
)

check(
    "contact@corp.nl + noreply@corp.nl (beide geblokkeerd)",
    _extract_emails("contact@corp.nl of noreply@corp.nl"),
    [],
)

check(
    "j.doe@bedrijf.nl (persoonlijk)",
    _extract_emails("solliciteer bij j.doe@bedrijf.nl"),
    ["j.doe@bedrijf.nl"],
)

check(
    "jan.de.vries@mkb.nl (persoonlijk)",
    _extract_emails("jan.de.vries@mkb.nl"),
    ["jan.de.vries@mkb.nl"],
)

print(f"\n  Resultaat Part 1: {pass_count} geslaagd, {fail_count} mislukt")


# ─────────────────────────────────────────────────────────────────────────────
# PART 2 — Nationale Vacaturebank HTTP sanity check
# ─────────────────────────────────────────────────────────────────────────────
print(f"\n{'='*60}")
print(f"{CYAN}PART 2 — NVB HTTP sanity check{RESET}")
print(f"{'='*60}")

nvb_url = "https://www.nationalevacaturebank.nl/vacature/zoeken"
print(f"  Ophalen: {nvb_url}")

try:
    resp = requests.get(nvb_url, headers=HEADERS, timeout=15)
    print(f"  Status code : {resp.status_code}")

    first500 = resp.text[:500].strip()
    is_html = first500.lower().startswith("<!doctype") or "<html" in first500.lower()
    print(f"  Lijkt op HTML: {is_html}")
    print(f"  Eerste 500 tekens:")
    print(f"    {repr(first500)}")

    soup = BeautifulSoup(resp.text, "html.parser")

    articles = soup.find_all("article")
    a_tags   = soup.find_all("a")
    print(f"  Aantal <article> tags   : {len(articles)}")
    print(f"  Aantal <a> tags         : {len(a_tags)}")

    # Bekende selectors uit de scraper
    selectors = [
        "article.vacancy-card",
        ".vacancy-list-item",
        "[data-vacancy-id]",
    ]
    for sel in selectors:
        found = soup.select(sel)
        print(f"  Selector '{sel}': {len(found)} matches")

    # Eerste 5 links met /vacature/ in href
    vac_links = [a["href"] for a in soup.find_all("a", href=True) if "/vacature/" in a["href"]]
    print(f"\n  Links met '/vacature/' in href ({len(vac_links)} totaal):")
    for lnk in vac_links[:5]:
        print(f"    {lnk}")

    # Dump article-klassen voor diagnose
    if articles:
        print(f"\n  Klassen van eerste 3 <article> tags:")
        for art in articles[:3]:
            print(f"    class={art.get('class')}, id={art.get('id')}")
    else:
        print(f"\n  Geen <article> tags. Top-level divs met klassen (eerste 10):")
        for div in soup.find_all("div", class_=True)[:10]:
            print(f"    div.{' '.join(div.get('class', []))}")

    # Zoek alternatieve klasse-patronen
    print(f"\n  Alle unieke klassen die 'vacanc' of 'vacatur' bevatten:")
    found_classes = set()
    for tag in soup.find_all(True):
        for cls in (tag.get("class") or []):
            if "vacanc" in cls.lower() or "vacatur" in cls.lower():
                found_classes.add((tag.name, cls))
    for tag_name, cls in sorted(found_classes):
        print(f"    <{tag_name}>.{cls}")
    if not found_classes:
        print("    (geen gevonden — site waarschijnlijk geblokkeerd/CAPTCHA)")

    # Toon volledige raw HTML als het geen echte HTML is
    if not is_html or len(a_tags) < 5:
        warn("Respons lijkt niet op normale HTML — mogelijk geblokkeerd!")
        print(f"\n  Volledige ruwe respons (eerste 2000 tekens):")
        print(resp.text[:2000])

except Exception as e:
    print(f"  {RED}FOUT: {e}{RESET}")


# ─────────────────────────────────────────────────────────────────────────────
# PART 3 — Company email search test
# ─────────────────────────────────────────────────────────────────────────────
print(f"\n{'='*60}")
print(f"{CYAN}PART 3 — Company email search test{RESET}")
print(f"{'='*60}")

test_url = "https://www.werkenbijjumbo.com"
print(f"  Zoeken naar e-mail op: {test_url}")

try:
    email_found = _find_email_on_company_site(test_url)
    if email_found:
        ok(f"E-mail gevonden: {email_found}")
    else:
        warn("Geen e-mail gevonden op werkenbijjumbo.com")
        print("  (Dit kan ook komen door anti-bot maatregelen)")
except Exception as e:
    print(f"  {RED}FOUT: {e}{RESET}")


# ─────────────────────────────────────────────────────────────────────────────
# PART 4 — Werkzoeken.nl sanity check
# ─────────────────────────────────────────────────────────────────────────────
print(f"\n{'='*60}")
print(f"{CYAN}PART 4 — Werkzoeken.nl sanity check{RESET}")
print(f"{'='*60}")

wz_url = "https://www.werkzoeken.nl/vacatures/"
print(f"  Ophalen: {wz_url}")

try:
    resp2 = requests.get(wz_url, headers=HEADERS, timeout=15)
    print(f"  Status code : {resp2.status_code}")

    soup2 = BeautifulSoup(resp2.text, "html.parser")
    vac_links2 = [
        a["href"]
        for a in soup2.find_all("a", href=True)
        if "/vacature/" in a["href"] or "/job/" in a["href"]
    ]
    print(f"  Links met '/vacature/' of '/job/': {len(vac_links2)}")
    for lnk in vac_links2[:5]:
        print(f"    {lnk}")

    print(f"\n  Eerste 500 tekens respons:")
    print(f"    {repr(resp2.text[:500])}")

    if len(vac_links2) == 0:
        warn("Geen vacature-links gevonden — site reageert mogelijk met CAPTCHA of blokkering")
        # Zoek naar andere link-patronen
        all_links = [a["href"] for a in soup2.find_all("a", href=True)]
        print(f"  Totaal aantal links op pagina: {len(all_links)}")
        print(f"  Eerste 10 links:")
        for lnk in all_links[:10]:
            print(f"    {lnk}")

except Exception as e:
    print(f"  {RED}FOUT: {e}{RESET}")


# ─────────────────────────────────────────────────────────────────────────────
# PART 5 — Diagnose samenvatting
# ─────────────────────────────────────────────────────────────────────────────
print(f"\n{'='*60}")
print(f"{CYAN}PART 5 — Diagnose & mogelijke oorzaken 0 vacatures{RESET}")
print(f"{'='*60}")

# Check Adzuna keys
adzuna_id  = os.getenv("ADZUNA_APP_ID", "")
adzuna_key = os.getenv("ADZUNA_APP_KEY", "")
if adzuna_id and adzuna_key:
    ok(f"Adzuna API keys aanwezig (ID={adzuna_id[:8]}...)")
else:
    warn("Adzuna API keys NIET geconfigureerd — Adzuna scraper wordt overgeslagen")

print("""
  Bekende root causes van 0 vacatures:

  1. NVB/Werkzoeken blokkeren bot-verkeer (403/CAPTCHA/lege HTML)
     → Kijk naar de statuscodes en HTML hierboven

  2. HTML selectors zijn verouderd (site heeft structuur gewijzigd)
     → article.vacancy-card, .vacancy-list-item, [data-vacancy-id] matchen niets

  3. Scraper filtert te streng op e-mail: `if not emails: continue`
     → Vacatures worden overgeslagen als er geen e-mail gevonden wordt
     → FIX: sla vacatures op ook zonder contact_email

  4. Adzuna API keys niet geconfigureerd
     → Adzuna-bron retourneert altijd []
""")

print(f"\n{'='*60}")
print(f"{CYAN}Test voltooid. Part 1: {pass_count} pass / {fail_count} fail{RESET}")
print(f"{'='*60}\n")
