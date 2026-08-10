"""Check whether a request IP is from an allowed country (EU/EEA + UK + CH)."""

import logging
from functools import lru_cache
from urllib.request import urlopen

log = logging.getLogger(__name__)

ALLOWED_COUNTRIES = {
    "NL", "BE", "DE", "LU", "FR", "GB", "AT", "CH", "DK", "SE",
    "NO", "FI", "IE", "IT", "ES", "PT", "PL", "CZ", "SK", "HU",
    "RO", "BG", "HR", "SI", "EE", "LV", "LT", "MT", "CY", "GR",
    "IS", "LI",
}


@lru_cache(maxsize=2048)
def _get_country(ip: str) -> str | None:
    try:
        with urlopen(f"https://ipapi.co/{ip}/country_code/", timeout=3) as r:
            code = r.read().decode().strip().upper()
            return code if len(code) == 2 else None
    except Exception as exc:
        log.warning("geo_ip lookup failed for %s: %s", ip, exc)
        return None


def get_client_ip(request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if hasattr(request, "client") and request.client:
        return request.client.host
    return "127.0.0.1"


def is_allowed_country(request) -> bool:
    ip = get_client_ip(request)
    if ip.startswith("127.") or ip.startswith("10.") or ip.startswith("192.168.") or ip == "::1":
        return True
    country = _get_country(ip)
    if country is None:
        return True
    return country in ALLOWED_COUNTRIES
