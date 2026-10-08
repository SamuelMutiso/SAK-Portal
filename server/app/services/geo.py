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
