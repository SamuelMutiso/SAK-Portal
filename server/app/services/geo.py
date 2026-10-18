import ipaddress
import time

import requests

CACHE = {}
RETRY_AFTER = 600


def locate(ip):
    if not ip:
        return "Unknown"
    try:
        address = ipaddress.ip_address(ip)
    except ValueError:
        return "Unknown"
    if address.is_private or address.is_loopback:
        return "Local network"

    if len(CACHE) > 5000:
        CACHE.clear()
    cached = CACHE.get(ip)
    if cached and (cached["found"] or time.time() - cached["at"] < RETRY_AFTER):
        return cached["place"]

    try:
        data = requests.get(f"https://ipapi.co/{ip}/json/", timeout=3).json()
        parts = [data.get("city"), data.get("region"), data.get("country_name")]
        place = ", ".join(part for part in parts if part)
        CACHE[ip] = {"place": place or "Unknown", "found": bool(place), "at": time.time()}
    except (requests.RequestException, ValueError):
        CACHE[ip] = {"place": "Location lookup unavailable", "found": False, "at": time.time()}
    return CACHE[ip]["place"]


PLACES = {}
AREA = "36.80,-1.30,37.15,-1.72"


def search_places(query, portal_url=""):
    key = query.strip().lower()
    if key in PLACES:
        return PLACES[key]
    if len(PLACES) > 500:
        PLACES.clear()
    response = requests.get(
        "https://nominatim.openstreetmap.org/search",
        params={"q": query, "format": "jsonv2", "limit": 6, "countrycodes": "ke", "viewbox": AREA, "bounded": 1, "addressdetails": 0},
        headers={"User-Agent": f"SuccessAcademyPortal/1.0 (+{portal_url})", "Accept-Language": "en"},
        timeout=6,
    )
    response.raise_for_status()
    places = []
    for item in response.json():
        parts = [part.strip() for part in item.get("display_name", "").split(",")]
        name = item.get("name") or parts[0]
        area = ", ".join(part for part in parts[1:4] if part and part != name)
        places.append({"name": name, "area": area, "lat": round(float(item["lat"]), 6), "lng": round(float(item["lon"]), 6)})
    PLACES[key] = places
    return places
