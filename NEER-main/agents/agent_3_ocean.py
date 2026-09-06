"""Agent 3: live INCOIS PFZ advisory + MOSDAC scaffold."""

from __future__ import annotations

import html
import json
import math
import os
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import HTTPCookieProcessor, Request, build_opener
from http.cookiejar import CookieJar

from services.mosdac_parser import extract_mosdac_values


IST = timezone(timedelta(hours=5, minutes=30))
INCOIS_HOME = "https://www.incois.gov.in/MarineFisheries/TextDataHome?mfid=1&request_locale=en"
DEMO_FIXTURE = Path(__file__).resolve().parent.parent / "fixtures" / "pfz_demo_data.json"

# Maps Indian coastal states/territories to official INCOIS PFZ sectors.
ADMIN_SECTORS = {
    "gujarat": ("GUJARAT", "SEC001"),
    "maharashtra": ("MAHARASHTRA", "SEC002"),
    "goa": ("GOA", "SEC003"),
    "karnataka": ("KARNATAKA", "SEC004"),
    "kerala": ("KERALA", "SEC005"),
    "odisha": ("ODISHA", "SEC010"),
    "west bengal": ("WEST BENGAL", "SEC011"),
    "lakshadweep": ("LAKSHADWEEP", "SEC014"),
}


def _text(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", value))).strip()


def _dms_to_decimal(value: str, positive: str, negative: str) -> float:
    parts = value.split()
    if len(parts) != 4:
        raise ValueError(f"Malformed DMS coordinate (expected 'deg min sec hemisphere'): {value!r}")
    degrees, minutes, seconds, hemisphere = parts
    decimal = float(degrees) + float(minutes) / 60 + float(seconds) / 3600
    return -decimal if hemisphere == negative else decimal


def _distance_km(first: dict, second: dict) -> float:
    radius_km = 6371.0
    lat1, lon1 = math.radians(first["latitude"]), math.radians(first["longitude"])
    lat2, lon2 = math.radians(second["latitude"]), math.radians(second["longitude"])
    value = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 2 * radius_km * math.asin(math.sqrt(value))


def _parse_rows(page: str) -> list[dict]:
    rows = []
    for row_html in re.findall(r"<tr[^>]*>(.*?)</tr>", page, flags=re.IGNORECASE | re.DOTALL):
        cells = [_text(cell) for cell in re.findall(r"<td[^>]*>(.*?)</td>", row_html, flags=re.IGNORECASE | re.DOTALL)]
        if len(cells) != 7 or not re.fullmatch(r"\d+ \d+ \d+ N", cells[5]) or not re.fullmatch(r"\d+ \d+ \d+ E", cells[6]):
            continue
        try:
            rows.append({
                "coastal_reference": cells[0],
                "direction_from_coast": cells[1],
                "bearing_degrees": int(cells[2]),
                "distance_from_coast_km": cells[3],
                "depth_m": cells[4],
                "latitude": round(_dms_to_decimal(cells[5], "N", "S"), 5),
                "longitude": round(_dms_to_decimal(cells[6], "E", "W"), 5),
            })
        except (TypeError, ValueError):
            continue
    return rows


def _fetch_incois_pfz(sector_id: str) -> tuple[list[dict], str | None, str]:
    """Fetch one current official PFZ sector page with its session-bound URL."""
    jar = CookieJar()
    opener = build_opener(HTTPCookieProcessor(jar))
    home_url = os.getenv("INCOIS_PFZ_URL") or INCOIS_HOME
    request = Request(home_url, headers={"User-Agent": "NEER-MVP/0.1"})
    with opener.open(request, timeout=15) as response:
        home = response.read().decode("utf-8", errors="replace")
    match = re.search(rf"TextData;jsessionid=[^'\"\s?]+\?secid={re.escape(sector_id)}", home)
    if not match:
        raise ValueError(f"INCOIS did not publish a current advisory link for {sector_id}.")
    detail_url = urljoin(home_url, match.group(0))
    with opener.open(Request(detail_url, headers={"User-Agent": "NEER-MVP/0.1"}), timeout=15) as response:
        detail = response.read().decode("utf-8", errors="replace")
    valid_match = re.search(r"AVAILABILITY OF FISH STOCK TILL\s+(\d{1,2}\s+[A-Z]{3}\s+\d{4})", _text(detail), flags=re.IGNORECASE)
    return _parse_rows(detail), valid_match.group(1) if valid_match else None, detail_url


def _resolve_sector(location: dict) -> tuple[str | None, str | None]:
    admin = (location.get("admin1") or location.get("name", "").split(",")[-1]).strip().lower()
    latitude = float(location["latitude"])
    if "tamil" in admin:
        return ("SOUTH TAMILNADU", "SEC006") if latitude < 11.0 else ("NORTH TAMILNADU", "SEC007")
    if "andhra" in admin:
        return ("SOUTH ANDHRA PRADESH", "SEC008") if latitude < 16.2 else ("NORTH ANDHRA PRADESH", "SEC009")
    if "andaman" in admin or "nicobar" in admin:
        return ("NICOBAR", "SEC013") if latitude < 10.5 else ("ANDAMAN", "SEC012")
    return ADMIN_SECTORS.get(admin, (None, None))


def _demo_pfz(location: dict) -> dict:
    """Visible fallback only; never present fixture data as live advisory data."""
    fixture = json.loads(DEMO_FIXTURE.read_text(encoding="utf-8"))
    return {
        "data_kind": "DEMO FIXTURE - NOT LIVE DATA",
        "nearest_pfz": fixture["nearest_pfz"],
        "distance_from_user_km": fixture["distance_from_user_km"],
        "valid_until": fixture["valid_until"],
        "note": fixture["note"],
    }


def agent_3_ocean(intent: dict) -> dict:
    if not intent["location"]:
        return {"agent": "ocean_advisory", "status": "skipped", "reason": "Location is required."}

    location = intent["location"]
    sector_name, sector_id = _resolve_sector(location)
    pfz_advisory: dict
    status = "live"
    if not sector_id:
        status = "unavailable"
        pfz_advisory = {"data_kind": "NO LIVE DATA", "note": "This Indian location is not mapped to an INCOIS PFZ sector yet."}
    else:
        try:
            rows, valid_until, _detail_url = _fetch_incois_pfz(sector_id)
            if not rows:
                raise ValueError("INCOIS returned no parseable PFZ rows.")
            nearest = min(rows, key=lambda item: _distance_km(location, item))
            pfz_advisory = {
                "data_kind": "LIVE OFFICIAL INCOIS ADVISORY",
                "sector": sector_name,
                "valid_until": valid_until,
                "nearest_pfz": nearest,
                "distance_from_user_km": round(_distance_km(location, nearest), 1),
                "source_url": os.getenv("INCOIS_PFZ_URL") or INCOIS_HOME,
            }
        except (HTTPError, URLError, TimeoutError, ValueError, OSError) as exc:
            status = "demo_fallback"
            pfz_advisory = _demo_pfz(location)
            pfz_advisory["live_fetch_error"] = str(exc)

    mosdac_keys = ("MOSDAC_USERNAME", "MOSDAC_PASSWORD", "MOSDAC_SST_DATASET_ID", "MOSDAC_CHLOROPHYLL_DATASET_ID")
    missing_mosdac = [key for key in mosdac_keys if not os.getenv(key)]
    mosdac = {
        "configured": not missing_mosdac,
        "status": "download_ready" if not missing_mosdac else "awaiting_configuration",
        "sea_surface_temperature_c": None,
        "chlorophyll_mg_m3": None,
        "missing_configuration": missing_mosdac,
        "note": "Run 'python services/mosdac_download.py' after configuration. Satellite files will be parsed after the exact product format is available; no MOSDAC value is invented.",
    }
    if not missing_mosdac:
        try:
            parsed = extract_mosdac_values(location, os.getenv("MOSDAC_DOWNLOAD_DIR", "mosdac_data"))
            if parsed["status"] == "parsed":
                mosdac.update(parsed)
                mosdac["note"] = "Parsed nearest available downloaded MOSDAC satellite pixels for the requested location."
            else:
                mosdac["note"] = "No downloaded MOSDAC files found yet. Run 'python services/mosdac_download.py' first."
        except (OSError, ValueError, KeyError, ImportError) as exc:
            mosdac["status"] = "parse_error"
            mosdac["note"] = f"MOSDAC files are present/configured, but parsing failed: {exc}"
    return {
        "agent": "ocean_advisory",
        "status": status,
        "location": location,
        "mosdac": mosdac,
        "pfz_advisory": pfz_advisory,
        "retrieved_at": datetime.now(IST).isoformat(timespec="seconds"),
    }
