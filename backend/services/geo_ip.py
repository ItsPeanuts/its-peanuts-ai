"""Check whether a request IP is from an allowed country (EU/EEA + UK + CH)."""

import json
import logging
from functools import lru_cache
from urllib.request import urlopen, Request

log = logging.getLogger(__name__)

ALLOWED_COUNTRIES = {
    "NL", "BE", "DE", "LU", "FR", "GB", "AT", "CH", "DK", "SE",
    "NO", "FI", "IE", "IT", "ES", "PT", "PL", "CZ", "SK", "HU",
    "RO", "BG", "HR", "SI", "EE", "LV", "LT", "MT", "CY", "GR",
    "IS", "LI",
}


def _is_private_ip(ip: str) -> bool:
    if ip.startswith("127.") or ip.startswith("10.") or ip.startswith("192.168.") or ip == "::1":
        return True
    if ip.startswith("172."):
        try:
            second = int(ip.split(".")[1])
            return 16 <= second <= 31
        except (IndexError, ValueError):
            pass
    return False


@lru_cache(maxsize=4096)
def _get_country(ip: str) -> str | None:
    try:
        req = Request(f"http://ip-api.com/json/{ip}?fields=countryCode", headers={"Accept": "application/json"})
        with urlopen(req, timeout=3) as r:
            data = json.loads(r.read().decode())
            code = data.get("countryCode", "")
            return code.upper() if len(code) == 2 else None
    except Exception as exc:
        log.warning("geo_ip lookup failed for %s: %s", ip, exc)
        return None


def get_client_ip(request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    cf_ip = request.headers.get("cf-connecting-ip")
    if cf_ip:
        return cf_ip.strip()
    if hasattr(request, "client") and request.client:
        return request.client.host
    return "127.0.0.1"


def is_allowed_country(request) -> bool:
    ip = get_client_ip(request)
    if _is_private_ip(ip):
        return True
    country = _get_country(ip)
    if country is None:
        return True
    return country in ALLOWED_COUNTRIES
