#!/usr/bin/env python3
"""
Test 50 Dutch staffing/detachering/payroll agency websites for real consultant
email addresses on vacancy detail pages.

Goal: find agencies like yer.nl / dpa.nl where detail pages show
      j.bakker@bureau.nl or recruitment@bureau.nl
"""

import re
import time
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from bs4 import BeautifulSoup

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "nl-NL,nl;q=0.9,en;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}
TIMEOUT = 15
MAX_DETAIL_PAGES = 3

# Block patterns for bad emails
BLOCK_DOMAINS = {
    "gmail.com", "hotmail.com", "yahoo.com", "outlook.com", "live.com",
    "icloud.com", "me.com", "msn.com",
}
BLOCK_LOCAL = {
    "noreply", "no-reply", "donotreply", "privacy", "legal", "abuse",
    "spam", "webmaster", "postmaster", "unsubscribe", "bounce",
    "mailer-daemon", "administrator", "admin@",  # generic admin (kept partial)
}
# Regex for email extraction
EMAIL_RE = re.compile(
    r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", re.I
)
# URL patterns that suggest vacancy detail pages
VACANCY_LINK_RE = re.compile(
    r"/(vacature[s]?|job[s]?|career[s]?|karriere|werken-bij|functie|"
    r"werkenbij|vacancy|vacancies|openstaande-vacatures|positions)/",
    re.I,
)


# ---------------------------------------------------------------------------
# Bureaus list
# ---------------------------------------------------------------------------
BUREAUS = [
    # IT/Tech detachering
    ("Getronics",          "https://www.getronics.nl/carriere/vacatures/"),
    ("Cegeka",             "https://www.cegeka.com/nl/vacatures/"),
    ("Simac",              "https://www.simac.com/nl/vacatures/"),
    ("Conclusion",         "https://www.conclusion.nl/vacatures/"),
    ("Ciber",              "https://www.ciber.nl/vacatures/"),
    ("Atos",               "https://www.atos.net/nl-nl/vacatures"),
    ("Sogeti",             "https://www.sogeti.nl/vacatures/"),
    ("Capgemini",          "https://www.capgemini.com/nl-nl/carriere/"),
    ("CGI",                "https://www.cgi.com/nl/nl/vacatures"),
    ("DeltaIQ",            "https://www.deltaiq.nl/vacatures/"),
    ("TeamViewer",         "https://www.teamviewer.com/nl/careers/"),
    # Finance/Management detachering
    ("Berenschot",         "https://www.berenschot.nl/vacatures/"),
    ("Boer & Croon",       "https://www.boer-croon.nl/vacatures/"),
    ("Hesselink",          "https://www.hesselink.nl/vacatures/"),
    ("CV-Management",      "https://www.cv-management.nl/vacatures/"),
    ("Finfort",            "https://www.finfort.nl/vacatures/"),
    ("Executives Online",  "https://www.executives-online.com/nl/vacatures/"),
    ("Heidrick & Struggles","https://www.heidrick.com/en/careers"),
    # Zorg uitzendbureaus
    ("Zorgwerk",           "https://www.zorgwerk.nl/vacatures/"),
    ("Doktersdiensten",    "https://www.doktersdiensten.nl/vacatures/"),
    ("Mediq",              "https://www.mediq.nl/vacatures/"),
    ("Parnassia Groep",    "https://www.parnassiagroep.nl/werken-bij/vacatures/"),
    ("Pluryn",             "https://www.pluryn.nl/werken-bij/vacatures/"),
    ("Arduin",             "https://www.arduin.nl/vacatures/"),
    ("Cordaan",            "https://www.cordaan.nl/werken-bij/vacatures/"),
    ("GGZ Friesland",      "https://www.ggzfriesland.nl/vacatures/"),
    ("Lunet",              "https://www.lunet.nl/vacatures/"),
    ("Prismanet",          "https://www.prismanet.nl/vacatures/"),
    # Logistiek/Technisch uitzendbureaus
    ("LogisticForce",      "https://www.logisticforce.nl/vacatures/"),
    ("TechPeople",         "https://www.techpeople.dk/nl/"),
    ("Staffmark",          "https://www.staffmark.nl/vacatures/"),
    ("AssembleForce",      "https://www.assembleforce.nl/vacatures/"),
    ("Flexkracht",         "https://www.flexkracht.nl/vacatures/"),
    ("Intergreen",         "https://www.intergreen.nl/vacatures/"),
    ("Agens",              "https://www.agens.nl/vacatures/"),
    ("ToolsForWork",       "https://www.toolsforwork.nl/vacatures/"),
    # Generalist middelgrote bureaus
    ("Olympic",            "https://www.olympic.nl/vacatures/"),
    ("Connexys",           "https://www.connexys.nl/vacatures/"),
    ("JobsAtWork",         "https://www.jobsatwork.nl/vacatures/"),
    ("Carerix",            "https://www.carerix.nl/vacatures/"),
    ("ProfessionalsOnly",  "https://www.professionalsonly.nl/vacatures/"),
    ("MPS",                "https://www.mps.nl/vacatures/"),
    ("Brainnet",           "https://www.brainnet.nl/vacatures/"),
    ("K-Force",            "https://www.k-force.nl/vacatures/"),
    ("Morgenwerk",         "https://www.morgenwerk.nl/vacatures/"),
    ("VDL",                "https://www.vdl.nl/nl/vacatures/"),
    ("Novak",              "https://www.novak.nl/vacatures/"),
    ("JobsRepublic",       "https://www.jobsrepublic.nl/vacatures/"),
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def is_good_email(email: str) -> bool:
    """Return True if email looks like a real consultant/recruiter email."""
    email = email.lower().strip()
    local, _, domain = email.partition("@")
    if not domain:
        return False
    # Block free providers
    if domain in BLOCK_DOMAINS:
        return False
    # Block bad local parts
    for bad in BLOCK_LOCAL:
        if bad in local:
            return False
    # Must have at least one dot in domain (e.g. bureau.nl)
    if "." not in domain:
        return False
    return True


def extract_emails_from_html(html: str):
    """Extract and filter emails from raw HTML."""
    # From mailto: links
    mailto_emails = re.findall(r'mailto:([^"\'?\s>]+)', html, re.I)
    # From raw text
    text_emails = EMAIL_RE.findall(html)
    all_emails = set(e.lower().strip() for e in mailto_emails + text_emails)
    return [e for e in sorted(all_emails) if is_good_email(e)]


def get_page(url: str, session: requests.Session):
    """Fetch URL, follow redirects. Return (final_url, html) or (url, None)."""
    try:
        r = session.get(url, headers=HEADERS, timeout=TIMEOUT, allow_redirects=True)
        if r.status_code == 200:
            return r.url, r.text
        return r.url, None
    except Exception:
        return url, None


def find_vacancy_links(html: str, base_url: str, listing_url: str):
    """Extract vacancy detail links from a listing page."""
    soup = BeautifulSoup(html, "html.parser")
    base_parsed = urllib.parse.urlparse(base_url)
    base_domain = base_parsed.scheme + "://" + base_parsed.netloc

    links = []
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        # Build absolute URL
        if href.startswith("http"):
            abs_url = href
        elif href.startswith("/"):
            abs_url = base_domain + href
        else:
            abs_url = urllib.parse.urljoin(base_url, href)

        # Only keep same-domain links
        if base_parsed.netloc not in abs_url:
            continue
        # Must look like a detail page (deeper path, not the listing itself)
        if abs_url == listing_url or abs_url.rstrip("/") == listing_url.rstrip("/"):
            continue
        # Heuristic: URL should be longer / have more path segments
        parsed = urllib.parse.urlparse(abs_url)
        path_parts = [p for p in parsed.path.split("/") if p]
        if len(path_parts) < 2:
            continue
        # Prefer URLs with vacancy keywords in path or at least a numeric/slug segment
        path = parsed.path.lower()
        if VACANCY_LINK_RE.search(path) or re.search(r"/\d{4,}", path) or re.search(r"/[a-z]+-[a-z]+", path):
            links.append(abs_url)

    # Deduplicate while preserving order
    seen = set()
    unique = []
    for l in links:
        if l not in seen:
            seen.add(l)
            unique.append(l)
    return unique


def test_bureau(name: str, listing_url: str) -> dict:
    """Test one bureau. Returns result dict."""
    result = {
        "name": name,
        "listing_url": listing_url,
        "status": "ERROR",
        "email": None,
        "detail_url": None,
        "error": None,
        "detail_count": 0,
    }

    session = requests.Session()
    session.max_redirects = 10

    # Step 1: fetch listing page
    final_url, html = get_page(listing_url, session)
    if not html:
        result["error"] = f"listing page failed ({final_url})"
        return result

    # Step 2: check listing page itself for emails (some put contact on listing)
    listing_emails = extract_emails_from_html(html)
    if listing_emails:
        result["status"] = "EMAIL"
        result["email"] = listing_emails[0]
        result["detail_url"] = final_url + " [listing]"
        return result

    # Step 3: find vacancy detail links
    links = find_vacancy_links(html, final_url, listing_url)
    if not links:
        result["status"] = "NO_LINKS"
        return result

    result["detail_count"] = len(links)

    # Step 4: visit up to MAX_DETAIL_PAGES detail pages
    found_email = None
    found_url = None
    for link in links[:MAX_DETAIL_PAGES]:
        detail_url, detail_html = get_page(link, session)
        if not detail_html:
            continue
        emails = extract_emails_from_html(detail_html)
        if emails:
            found_email = emails[0]
            found_url = detail_url
            break
        time.sleep(0.3)  # polite

    if found_email:
        result["status"] = "EMAIL"
        result["email"] = found_email
        result["detail_url"] = found_url
    else:
        result["status"] = "NO_EMAIL"

    return result


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("Testing 50 Dutch staffing/detachering/payroll agencies for consultant emails")
    print("=" * 80)
    print(f"Bureaus: {len(BUREAUS)} | Threads: 10 | Detail pages per bureau: {MAX_DETAIL_PAGES}")
    print("=" * 80)

    results = []
    start = time.time()

    with ThreadPoolExecutor(max_workers=10) as executor:
        future_to_name = {
            executor.submit(test_bureau, name, url): name
            for name, url in BUREAUS
        }
        done_count = 0
        for future in as_completed(future_to_name):
            res = future.result()
            results.append(res)
            done_count += 1
            status_icon = {
                "EMAIL":    "[EMAIL]   ",
                "NO_EMAIL": "[NO_EMAIL]",
                "NO_LINKS": "[NO_LINKS]",
                "ERROR":    "[ERROR]   ",
            }.get(res["status"], "[?]")
            email_str = res["email"] or res["error"] or f"links found: {res['detail_count']}"
            print(f"  {done_count:2d}/50  {status_icon}  {res['name']:<22}  {email_str}")

    elapsed = time.time() - start

    # Sort results
    order = {"EMAIL": 0, "NO_EMAIL": 1, "NO_LINKS": 2, "ERROR": 3}
    results.sort(key=lambda r: (order.get(r["status"], 9), r["name"].lower()))

    # Summary table
    print()
    print("=" * 80)
    print("SUMMARY TABLE")
    print("=" * 80)
    print(f"{'#':<3}  {'Bureau':<24}  {'Status':<10}  {'Email / Note'}")
    print("-" * 80)
    for i, r in enumerate(results, 1):
        note = r["email"] or r["error"] or (f"{r['detail_count']} detail links, no email" if r["detail_count"] else "")
        print(f"{i:<3}  {r['name']:<24}  {r['status']:<10}  {note}")

    # Details for EMAIL results
    email_results = [r for r in results if r["status"] == "EMAIL"]
    print()
    print("=" * 80)
    print(f"BUREAUS WITH REAL EMAILS ({len(email_results)}/{len(BUREAUS)})")
    print("=" * 80)
    for r in email_results:
        print(f"\n  Bureau:     {r['name']}")
        print(f"  Listing:    {r['listing_url']}")
        print(f"  Email:      {r['email']}")
        print(f"  Found on:   {r['detail_url']}")

    # Stats
    counts = {k: sum(1 for r in results if r["status"] == k)
              for k in ("EMAIL", "NO_EMAIL", "NO_LINKS", "ERROR")}
    print()
    print("=" * 80)
    print("STATISTICS")
    print("=" * 80)
    for k, v in counts.items():
        pct = v / len(results) * 100
        print(f"  {k:<12}  {v:>3}  ({pct:.0f}%)")
    print(f"\n  Total elapsed: {elapsed:.1f}s")

    # Extra: list all unique email domains found
    all_emails = [r["email"] for r in email_results if r["email"]]
    if all_emails:
        domains = sorted(set(e.split("@")[1] for e in all_emails))
        print()
        print("EMAIL DOMAINS FOUND:")
        for d in domains:
            matching = [e for e in all_emails if e.endswith("@" + d)]
            print(f"  @{d:<30}  {', '.join(matching)}")


if __name__ == "__main__":
    main()
