"""
Geocoding via OpenStreetMap Nominatim (gratis, geen API key nodig).
Respecteert de Nominatim usage policy: max 1 request/seconde, User-Agent vereist.
"""
import logging
import math
import time
from functools import lru_cache

import requests

logger = logging.getLogger(__name__)

_NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
_HEADERS = {"User-Agent": "VorzaIQ/1.0 (recruitment platform; info@vorzaiq.com)"}
_last_request_time = 0.0


def _rate_limit() -> None:
    global _last_request_time
    now = time.monotonic()
    elapsed = now - _last_request_time
    if elapsed < 1.1:
        time.sleep(1.1 - elapsed)
    _last_request_time = time.monotonic()


@lru_cache(maxsize=500)
def geocode(city: str, country: str = "nl") -> tuple[float, float] | None:
    """Geeft (lat, lng) terug voor een stad, of None als niet gevonden."""
    if not city or not city.strip():
        return None
    try:
        _rate_limit()
        resp = requests.get(
            _NOMINATIM_URL,
            params={
                "q": city.strip(),
                "countrycodes": country,
                "format": "json",
                "limit": 1,
            },
            headers=_HEADERS,
            timeout=10,
        )
        if resp.ok and resp.json():
            result = resp.json()[0]
            return float(result["lat"]), float(result["lon"])
    except Exception as e:
        logger.warning("[geocoding] Fout bij geocoden van '%s': %s", city, e)
    return None


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Berekent de afstand in km tussen twee coördinaten (Haversine)."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
