"""Agent 1: parse the user's marine query into an intent JSON payload.

Classification strategy (priority order):
1. LLM extraction (Sarvam AI sarvam-105b) with JSON schema enforcement.
   Handles arbitrary Hindi / Hinglish / English without fragile keyword lists.
2. Regex heuristic fallback (original logic) when LLM unavailable or fails.

Geocoding is always deterministic:
  COASTAL_GAZETTEER lookup → Open-Meteo geocoding API → _has_marine_data() probe.
"""

from __future__ import annotations

import json
import re
import os
from urllib.error import URLError
from urllib.request import Request, urlopen

from services.sarvam_service import prepare_for_agent_1, sarvam_chat_completion
from services.utils import get_json


DEFAULT_VESSEL = "small fishing boat"
GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"

# ---------------------------------------------------------------------------
# Marine-probe cache — avoids re-probing the same (lat, lon) in one session
# ---------------------------------------------------------------------------
_MARINE_PROBE_CACHE: dict[tuple[float, float], bool] = {}

# ---------------------------------------------------------------------------
# Coastal Gazetteer — state / territory / alias names Open-Meteo cannot
# geocode reliably as coastal cities.
# ---------------------------------------------------------------------------
COASTAL_GAZETTEER: dict[str, dict] = {
    # Aliases / nicknames
    "kochi":        {"name": "Kochi, Kerala",                          "latitude": 9.9312,  "longitude": 76.2673, "admin1": "Kerala",                  "country_code": "IN"},
    "cochin":       {"name": "Kochi, Kerala",                          "latitude": 9.9312,  "longitude": 76.2673, "admin1": "Kerala",                  "country_code": "IN"},
    "vizag":        {"name": "Visakhapatnam, Andhra Pradesh",           "latitude": 17.6868, "longitude": 83.2185, "admin1": "Andhra Pradesh",           "country_code": "IN"},
    "alleppey":     {"name": "Alappuzha, Kerala",                       "latitude": 9.4981,  "longitude": 76.3388, "admin1": "Kerala",                  "country_code": "IN"},
    "calicut":      {"name": "Kozhikode, Kerala",                       "latitude": 11.2588, "longitude": 75.7804, "admin1": "Kerala",                  "country_code": "IN"},
    # Union territories with no large Open-Meteo city entry
    "goa":          {"name": "Panaji, Goa",                             "latitude": 15.40,   "longitude": 73.80,   "admin1": "Goa",                     "country_code": "IN"},
    "lakshadweep":  {"name": "Kavaratti, Lakshadweep",                  "latitude": 10.5669, "longitude": 72.6420, "admin1": "Lakshadweep",             "country_code": "IN"},
    "daman":        {"name": "Daman, Daman and Diu",                    "latitude": 20.3974, "longitude": 72.8328, "admin1": "Daman and Diu",           "country_code": "IN"},
    "diu":          {"name": "Diu, Daman and Diu",                      "latitude": 20.7141, "longitude": 70.9822, "admin1": "Daman and Diu",           "country_code": "IN"},
    "puducherry":   {"name": "Puducherry",                              "latitude": 11.9416, "longitude": 79.8083, "admin1": "Puducherry",              "country_code": "IN"},
    "pondicherry":  {"name": "Puducherry",                              "latitude": 11.9416, "longitude": 79.8083, "admin1": "Puducherry",              "country_code": "IN"},
    # Coastal state names → representative coastal city
    "andhra pradesh": {"name": "Visakhapatnam, Andhra Pradesh",         "latitude": 17.6868, "longitude": 83.2185, "admin1": "Andhra Pradesh",         "country_code": "IN"},
    "andhra":         {"name": "Visakhapatnam, Andhra Pradesh",         "latitude": 17.6868, "longitude": 83.2185, "admin1": "Andhra Pradesh",         "country_code": "IN"},
    "kerala":         {"name": "Kochi, Kerala",                         "latitude": 9.9312,  "longitude": 76.2673, "admin1": "Kerala",                 "country_code": "IN"},
    "gujarat":        {"name": "Veraval, Gujarat",                      "latitude": 20.9071, "longitude": 70.3632, "admin1": "Gujarat",                "country_code": "IN"},
    "gujrat":         {"name": "Veraval, Gujarat",                      "latitude": 20.9071, "longitude": 70.3632, "admin1": "Gujarat",                "country_code": "IN"},
    "bombay":         {"name": "Mumbai, Maharashtra",                   "latitude": 18.9667, "longitude": 72.8333, "admin1": "Maharashtra",            "country_code": "IN"},
    "madras":         {"name": "Chennai, Tamil Nadu",                   "latitude": 13.0827, "longitude": 80.2707, "admin1": "Tamil Nadu",             "country_code": "IN"},
    "bengal":         {"name": "Haldia, West Bengal",                   "latitude": 22.0667, "longitude": 88.0694, "admin1": "West Bengal",            "country_code": "IN"},
    "tamil nadu":     {"name": "Chennai, Tamil Nadu",                   "latitude": 13.0827, "longitude": 80.2707, "admin1": "Tamil Nadu",             "country_code": "IN"},
    "tamilnadu":      {"name": "Chennai, Tamil Nadu",                   "latitude": 13.0827, "longitude": 80.2707, "admin1": "Tamil Nadu",             "country_code": "IN"},
    "odisha":         {"name": "Puri, Odisha",                          "latitude": 19.8133, "longitude": 85.8315, "admin1": "Odisha",                 "country_code": "IN"},
    "orissa":         {"name": "Puri, Odisha",                          "latitude": 19.8133, "longitude": 85.8315, "admin1": "Odisha",                 "country_code": "IN"},
    "west bengal":    {"name": "Haldia, West Bengal",                   "latitude": 22.0667, "longitude": 88.0694, "admin1": "West Bengal",            "country_code": "IN"},
    "maharashtra":    {"name": "Mumbai, Maharashtra",                   "latitude": 18.9667, "longitude": 72.8333, "admin1": "Maharashtra",            "country_code": "IN"},
    "karnataka":      {"name": "Mangalore, Karnataka",                  "latitude": 12.8698, "longitude": 74.8426, "admin1": "Karnataka",              "country_code": "IN"},
    "andaman":        {"name": "Port Blair, Andaman and Nicobar",       "latitude": 11.6233, "longitude": 92.7265, "admin1": "Andaman and Nicobar",    "country_code": "IN"},
    "andaman and nicobar": {"name": "Port Blair, Andaman and Nicobar", "latitude": 11.6233, "longitude": 92.7265, "admin1": "Andaman and Nicobar",    "country_code": "IN"},
}

INLAND_GAZETTEER: dict[str, dict] = {
    # Northern inland states & key cities
    "haryana":          {"name": "Haryana",                        "latitude": 29.0588, "longitude": 76.0856, "admin1": "Haryana",          "country_code": "IN"},
    "rohtak":           {"name": "Rohtak, Haryana",                "latitude": 28.8955, "longitude": 76.6066, "admin1": "Haryana",          "country_code": "IN"},
    "panipat":          {"name": "Panipat, Haryana",               "latitude": 29.3909, "longitude": 76.9635, "admin1": "Haryana",          "country_code": "IN"},
    "gurgaon":          {"name": "Gurugram, Haryana",              "latitude": 28.4595, "longitude": 77.0266, "admin1": "Haryana",          "country_code": "IN"},
    "gurugram":         {"name": "Gurugram, Haryana",              "latitude": 28.4595, "longitude": 77.0266, "admin1": "Haryana",          "country_code": "IN"},
    "faridabad":        {"name": "Faridabad, Haryana",             "latitude": 28.4089, "longitude": 77.3178, "admin1": "Haryana",          "country_code": "IN"},
    "hisar":            {"name": "Hisar, Haryana",                 "latitude": 29.1492, "longitude": 75.7217, "admin1": "Haryana",          "country_code": "IN"},
    "karnal":           {"name": "Karnal, Haryana",                "latitude": 29.6857, "longitude": 76.9905, "admin1": "Haryana",          "country_code": "IN"},
    "ambala":           {"name": "Ambala, Haryana",                "latitude": 30.3782, "longitude": 76.7767, "admin1": "Haryana",          "country_code": "IN"},
    "delhi":            {"name": "Delhi",                          "latitude": 28.7041, "longitude": 77.1025, "admin1": "Delhi",            "country_code": "IN"},
    "new delhi":        {"name": "New Delhi, Delhi",               "latitude": 28.6139, "longitude": 77.2090, "admin1": "Delhi",            "country_code": "IN"},
    "punjab":           {"name": "Punjab",                         "latitude": 31.1471, "longitude": 75.3412, "admin1": "Punjab",           "country_code": "IN"},
    "amritsar":         {"name": "Amritsar, Punjab",               "latitude": 31.6340, "longitude": 74.8723, "admin1": "Punjab",           "country_code": "IN"},
    "ludhiana":         {"name": "Ludhiana, Punjab",               "latitude": 30.9010, "longitude": 75.8573, "admin1": "Punjab",           "country_code": "IN"},
    "jalandhar":        {"name": "Jalandhar, Punjab",              "latitude": 31.3260, "longitude": 75.5762, "admin1": "Punjab",           "country_code": "IN"},
    "chandigarh":       {"name": "Chandigarh",                     "latitude": 30.7333, "longitude": 76.7794, "admin1": "Chandigarh",       "country_code": "IN"},
    "rajasthan":        {"name": "Rajasthan",                      "latitude": 27.0238, "longitude": 74.2179, "admin1": "Rajasthan",        "country_code": "IN"},
    "jaipur":           {"name": "Jaipur, Rajasthan",              "latitude": 26.9124, "longitude": 75.7873, "admin1": "Rajasthan",        "country_code": "IN"},
    "jodhpur":          {"name": "Jodhpur, Rajasthan",             "latitude": 26.2389, "longitude": 73.0243, "admin1": "Rajasthan",        "country_code": "IN"},
    "udaipur":          {"name": "Udaipur, Rajasthan",             "latitude": 24.5854, "longitude": 73.7125, "admin1": "Rajasthan",        "country_code": "IN"},
    "uttar pradesh":    {"name": "Uttar Pradesh",                  "latitude": 26.8467, "longitude": 80.9462, "admin1": "Uttar Pradesh",    "country_code": "IN"},
    "up":               {"name": "Uttar Pradesh",                  "latitude": 26.8467, "longitude": 80.9462, "admin1": "Uttar Pradesh",    "country_code": "IN"},
    "lucknow":          {"name": "Lucknow, Uttar Pradesh",         "latitude": 26.8467, "longitude": 80.9462, "admin1": "Uttar Pradesh",    "country_code": "IN"},
    "kanpur":           {"name": "Kanpur, Uttar Pradesh",          "latitude": 26.4499, "longitude": 80.3319, "admin1": "Uttar Pradesh",    "country_code": "IN"},
    "noida":            {"name": "Noida, Uttar Pradesh",           "latitude": 28.5355, "longitude": 77.3910, "admin1": "Uttar Pradesh",    "country_code": "IN"},
    "varanasi":         {"name": "Varanasi, Uttar Pradesh",        "latitude": 25.3176, "longitude": 82.9739, "admin1": "Uttar Pradesh",    "country_code": "IN"},
    "madhya pradesh":   {"name": "Madhya Pradesh",                 "latitude": 22.9734, "longitude": 78.6569, "admin1": "Madhya Pradesh",   "country_code": "IN"},
    "mp":               {"name": "Madhya Pradesh",                 "latitude": 22.9734, "longitude": 78.6569, "admin1": "Madhya Pradesh",   "country_code": "IN"},
    "bhopal":           {"name": "Bhopal, Madhya Pradesh",         "latitude": 23.2599, "longitude": 77.4126, "admin1": "Madhya Pradesh",   "country_code": "IN"},
    "indore":           {"name": "Indore, Madhya Pradesh",         "latitude": 22.7196, "longitude": 75.8577, "admin1": "Madhya Pradesh",   "country_code": "IN"},
    "bihar":            {"name": "Bihar",                          "latitude": 25.0961, "longitude": 85.3131, "admin1": "Bihar",            "country_code": "IN"},
    "patna":            {"name": "Patna, Bihar",                   "latitude": 25.5941, "longitude": 85.1376, "admin1": "Bihar",            "country_code": "IN"},
    "jharkhand":        {"name": "Jharkhand",                      "latitude": 23.6102, "longitude": 85.2799, "admin1": "Jharkhand",        "country_code": "IN"},
    "ranchi":           {"name": "Ranchi, Jharkhand",              "latitude": 23.3441, "longitude": 85.3096, "admin1": "Jharkhand",        "country_code": "IN"},
    "chhattisgarh":     {"name": "Chhattisgarh",                   "latitude": 21.2787, "longitude": 81.8661, "admin1": "Chhattisgarh",     "country_code": "IN"},
    "raipur":           {"name": "Raipur, Chhattisgarh",           "latitude": 21.2514, "longitude": 81.6296, "admin1": "Chhattisgarh",     "country_code": "IN"},
    "telangana":        {"name": "Telangana",                      "latitude": 18.1124, "longitude": 79.0193, "admin1": "Telangana",        "country_code": "IN"},
    "hyderabad":        {"name": "Hyderabad, Telangana",           "latitude": 17.3850, "longitude": 78.4867, "admin1": "Telangana",        "country_code": "IN"},
    "bangalore":        {"name": "Bengaluru, Karnataka",           "latitude": 12.9716, "longitude": 77.5946, "admin1": "Karnataka",        "country_code": "IN"},
    "bengaluru":        {"name": "Bengaluru, Karnataka",           "latitude": 12.9716, "longitude": 77.5946, "admin1": "Karnataka",        "country_code": "IN"},
    "pune":             {"name": "Pune, Maharashtra",              "latitude": 18.5204, "longitude": 73.8567, "admin1": "Maharashtra",      "country_code": "IN"},
    "nagpur":           {"name": "Nagpur, Maharashtra",            "latitude": 21.1458, "longitude": 79.0882, "admin1": "Maharashtra",      "country_code": "IN"},
}

# ---------------------------------------------------------------------------
# LLM intent extraction (Sarvam AI sarvam-105b)
# ---------------------------------------------------------------------------
_INTENT_SYSTEM_PROMPT = """\
You are a marine query intent extractor for the NEER system serving Indian coastal fishermen and maritime authorities.

Extract intent from the user query (may be English, Hindi, or Hinglish) and return ONLY a valid JSON object:

{
  "location_name": "<full place name as mentioned; preserve multi-word names like 'Andhra Pradesh', 'Port Blair'; empty string if no location>",
  "persona": "fisherman" | "authority",
  "query_type": "safety" | "fishing" | "marine_conditions",
  "narrow_topic": "wind_speed" | "wave_height" | "swell" | "pfz" | "geofence" | "score" | "sea_surface_temperature" | "chlorophyll" | null,
  "time_window": "today" | "tomorrow" | "next available forecast hour",
  "vessel_type": "small fishing boat" | "medium trawler" | "large cargo vessel"
}

Rules:
- persona=authority: for government officials, coast guard, disaster management, district officers, regional advisories, or warning generation.
- persona=fisherman: for individual fishermen asking about their own trips.
- query_type=safety: asking if it is safe/dangerous/risky to go out to sea.
- query_type=fishing: asking about best fishing spots, PFZ zones, or catch potential.
- query_type=marine_conditions: general sea/weather/conditions questions.
- narrow_topic: set ONLY if the user is asking specifically and narrowly about ONE topic ("wind_speed", "wave_height", "swell", "pfz", "geofence", "score", "sea_surface_temperature", "chlorophyll"). Set to null for broad or open-ended questions like "is it safe to fish", "how are conditions", or general assessments.
- vessel_type defaults to "small fishing boat" unless cargo ship or trawler is explicitly mentioned.
- Preserve the FULL location name (e.g. "Andhra Pradesh coast" -> "Andhra Pradesh").

Few-shot examples:
{"query": "what's the wind speed right now near Kochi", "output": {"location_name": "Kochi", "persona": "fisherman", "query_type": "marine_conditions", "narrow_topic": "wind_speed", "time_window": "today", "vessel_type": "small fishing boat"}}
{"query": "Is it safe to fish near Visakhapatnam tomorrow?", "output": {"location_name": "Visakhapatnam", "persona": "fisherman", "query_type": "safety", "narrow_topic": null, "time_window": "tomorrow", "vessel_type": "small fishing boat"}}
{"query": "what is the SST near Kochi", "output": {"location_name": "Kochi", "persona": "fisherman", "query_type": "marine_conditions", "narrow_topic": "sea_surface_temperature", "time_window": "today", "vessel_type": "small fishing boat"}}
{"query": "what is the chlorophyll level near Kochi", "output": {"location_name": "Kochi", "persona": "fisherman", "query_type": "marine_conditions", "narrow_topic": "chlorophyll", "time_window": "today", "vessel_type": "small fishing boat"}}
{"query": "what is the wave height in Kochi", "output": {"location_name": "Kochi", "persona": "fisherman", "query_type": "marine_conditions", "narrow_topic": "wave_height", "time_window": "today", "vessel_type": "small fishing boat"}}
{"query": "where is the nearest PFZ zone", "output": {"location_name": "", "persona": "fisherman", "query_type": "fishing", "narrow_topic": "pfz", "time_window": "today", "vessel_type": "small fishing boat"}}
{"query": "Regional risk assessment for Andhra Pradesh coast", "output": {"location_name": "Andhra Pradesh", "persona": "authority", "query_type": "marine_conditions", "narrow_topic": null, "time_window": "next available forecast hour", "vessel_type": "small fishing boat"}}
{"query": "Kochi ke paas fishing safe hai kya aaj?", "output": {"location_name": "Kochi", "persona": "fisherman", "query_type": "safety", "narrow_topic": null, "time_window": "today", "vessel_type": "small fishing boat"}}
"""

_VALID_PERSONAS      = {"fisherman", "authority"}
_VALID_QUERY_TYPES   = {"safety", "fishing", "marine_conditions"}
_VALID_TIME_WINDOWS  = {"today", "tomorrow", "next available forecast hour"}
_VALID_VESSELS       = {"small fishing boat", "medium trawler", "large cargo vessel"}
NARROW_TOPICS        = {"wind_speed", "wave_height", "swell", "pfz", "geofence", "score", "sea_surface_temperature", "chlorophyll"}

INLAND_STATES = {
    "haryana", "punjab", "rajasthan", "delhi", "uttar pradesh", "bihar",
    "madhya pradesh", "chhattisgarh", "jharkhand", "himachal pradesh",
    "uttarakhand", "telangana", "assam", "meghalaya", "manipur",
    "mizoram", "nagaland", "tripura", "arunachal pradesh", "sikkim",
    "ladakh", "jammu and kashmir", "jammu & kashmir"
}


def detect_narrow_topic(text: str) -> str | None:
    """Detect if the query is asking narrowly about one single topic."""
    if not text:
        return None
    t = text.lower()

    # Broad open-ended question patterns
    broad_indicators = [
        r"\bis it safe to fish\b",
        r"\bis it safe\b",
        r"\bcan i go\b",
        r"\bcan i fish\b",
        r"\bshould i go\b",
        r"\bhow are conditions\b",
        r"\bhow is the weather\b",
        r"\bweather forecast\b",
        r"\bsea conditions\b",
        r"\btrip assessment\b",
        r"\bmarine assessment\b",
        r"\bfull report\b",
        r"\bregional risk\b",
        r"\bjaana theek\b",
        r"\bja sakte\b",
        r"\bja sakta\b",
        r"\bmausam kaisa\b",
        r"\bkaisa rahega\b",
        r"\boverall\b",
    ]
    for pattern in broad_indicators:
        if re.search(pattern, t):
            return None

    # Topic detectors
    has_wind = bool(re.search(r"\b(wind\s*speeds?|windspeed|winds?|hawa|pawan)\b", t))
    has_wave = bool(re.search(r"\b(wave\s*heights?|waves?|lehar|lehrein|tarang)\b", t))
    has_swell = bool(re.search(r"\b(swell\s*periods?|swell\s*heights?|swell\s*surge|kallakkadal|swell)\b", t))
    has_pfz = bool(re.search(r"\b(pfz|potential\s*fishing\s*zones?|fishing\s*zones?|machhli\s*zones?)\b", t))
    has_geofence = bool(re.search(r"\b(geofence|restricted\s*zones?|protected\s*areas?|mpa|boundary|restricted\s*areas?)\b", t))
    has_score = bool(re.search(r"\b(safety\s*scores?|fishing\s*scores?|opportunity\s*scores?|scores?)\b", t))
    has_sst = bool(re.search(
        r"\b(sst|sea\s*surface\s*temps?(?:eratures?)?|surface\s*temps?(?:eratures?)?|ocean\s*temps?(?:eratures?)?|water\s*temps?(?:eratures?)?|samudr[ia]?\s*(?:satah\s*ka\s*)?t[aa]pm[aa]n|paani\s*ka\s*t[aa]pm[aa]n|satah\s*ka\s*t[aa]pm[aa]n)\b",
        t
    ))
    has_chloro = bool(re.search(r"(?:ch[l]+or|kloro)", t))

    # Disambiguate swell vs wave if user asked specifically about swell
    if has_swell and not re.search(r"\bwave\s*heights?\b", t):
        has_wave = False

    matched = []
    if has_wind:
        matched.append("wind_speed")
    if has_wave:
        matched.append("wave_height")
    if has_swell:
        matched.append("swell")
    if has_pfz:
        matched.append("pfz")
    if has_geofence:
        matched.append("geofence")
    if has_score:
        matched.append("score")
    if has_sst:
        matched.append("sea_surface_temperature")
    if has_chloro:
        matched.append("chlorophyll")

    if len(matched) == 1:
        return matched[0]
    return None


def _is_peninsular_inland(lat: float, lon: float) -> bool:
    """Deterministic bounding check for peninsular Indian landmass far from both coasts."""
    if not (8.0 <= lat <= 24.5 and 68.0 <= lon <= 89.0):
        return False
    if 8.0 <= lat < 12.5 and 77.2 <= lon <= 79.5:
        return True
    if 12.5 <= lat < 15.5 and 75.4 <= lon <= 79.8:
        return True
    if 15.5 <= lat < 18.5 and 74.2 <= lon <= 81.2:
        return True
    if 18.5 <= lat < 21.5 and 73.5 <= lon <= 84.0:
        return True
    if 21.5 <= lat <= 24.5 and 73.5 <= lon <= 87.0:
        return True
    return False


def check_is_coastal(location: dict | None) -> tuple[bool, str | None]:
    """Check if the resolved location is meaningfully close to an Indian coastline."""
    if not location:
        return True, None

    lat = location.get("latitude")
    lon = location.get("longitude")
    name = (location.get("name") or "").lower()
    admin1 = (location.get("admin1") or "").lower().strip()
    place_label = location.get("name") or "The requested location"

    # 1. State / administrative metadata check (0ms overhead)
    if admin1 in INLAND_STATES or any(f", {st}" in name or f" {st}" in name for st in INLAND_STATES):
        return False, (
            f"{place_label} does not appear to be a coastal area. "
            "NEER provides marine, ocean, and coastal safety intelligence for maritime and fishing operations. "
            "Please try a coastal location or port instead, such as Kochi, Mumbai, or Chennai."
        )

    # 2. Geographic latitude check for India
    # Coastlines in India do not extend north of 24.5° N (Rann of Kutch ends ~24°N, Sundarbans ends ~22.5°N)
    if lat is not None and lon is not None:
        if 65.0 <= lon <= 98.0 and lat > 24.5:
            return False, (
                f"{place_label} does not appear to be a coastal area. "
                "NEER provides marine, ocean, and coastal safety intelligence for maritime and fishing operations. "
                "Please try a coastal location or port instead, such as Kochi, Mumbai, or Chennai."
            )

        # 3. Peninsular inland check (fast bounding box between east & west coasts)
        if _is_peninsular_inland(lat, lon):
            return False, (
                f"{place_label} does not appear to be a coastal area. "
                "NEER provides marine, ocean, and coastal safety intelligence for maritime and fishing operations. "
                "Please try a coastal location or port instead, such as Kochi, Mumbai, or Chennai."
            )

        # 4. Marine grid data verification via Open-Meteo marine API (when online)
        if not _has_marine_data(lat, lon):
            return False, (
                f"{place_label} does not appear to be a coastal area. "
                "NEER provides marine, ocean, and coastal safety intelligence for maritime and fishing operations. "
                "Please try a coastal location or port instead, such as Kochi, Mumbai, or Chennai."
            )

    return True, None


def _llm_extract_intent(query: str, agent_query: str) -> dict | None:
    """Call Sarvam AI (sarvam-105b) to extract structured intent. Returns validated dict or None."""
    combined = f"Original: {query}\nTranslated: {agent_query}" if query != agent_query else query
    messages = [
        {"role": "system", "content": _INTENT_SYSTEM_PROMPT},
        {"role": "user", "content": combined},
    ]
    raw = sarvam_chat_completion(messages, temperature=0.0, max_tokens=2048)
    if not raw:
        return None

    # Robust JSON parsing: handles raw JSON or ```json ... ``` code blocks
    extracted = None
    m = re.search(r"\{.*\}", raw, re.DOTALL)
    if m:
        try:
            extracted = json.loads(m.group(0))
        except Exception:
            pass
    if not extracted:
        try:
            extracted = json.loads(raw.strip())
        except Exception:
            return None

    # Schema validation — any invalid enum value → discard and fall back to regex
    if (
        isinstance(extracted.get("location_name"), str)
        and extracted.get("persona") in _VALID_PERSONAS
        and extracted.get("query_type") in _VALID_QUERY_TYPES
        and (extracted.get("narrow_topic") is None or extracted.get("narrow_topic") in NARROW_TOPICS)
        and extracted.get("time_window") in _VALID_TIME_WINDOWS
        and extracted.get("vessel_type") in _VALID_VESSELS
    ):
        return extracted
    return None


def _regex_extract_intent(searchable_text: str) -> dict:
    """Regex-based fallback classification — used when LLM is unavailable."""
    _AUTHORITY_MARKERS = (
        "authority", "authorities", "coast guard", "coastguard",
        "district", "disaster management", "fisheries department",
        "which areas", "coastal areas", "regional", "region wise",
        "priority areas", "generate warning", "issue warning", "issue advisory",
        "issue alert", "broadcast", "generate advisory", "generate alert",
        "high-risk zone", "high risk zone", "risk assessment", "area assessment",
        "briefing", "identify areas", "identify zones", "which coastal",
        "assess sea conditions for", "marine warning",
        "warning jaari", "alert jaari", "advisory jaari", "suchna jaari",
        "jaari karna chahiye", "jaari karni chahiye", "jaari karo",
    )
    if any(w in searchable_text for w in ("safe", "safety", "risk", "danger", "jaana", "ja sakte", "ja sakta", "go fishing", "safe hai")):
        query_type = "safety"
    elif any(w in searchable_text for w in ("fish", "fishing", "pfz", "machhli")):
        query_type = "fishing"
    else:
        query_type = "marine_conditions"

    if "today" in searchable_text or "aaj" in searchable_text:
        time_window = "today"
    elif "tomorrow" in searchable_text or "kal" in searchable_text or "kl" in searchable_text:
        time_window = "tomorrow"
    else:
        time_window = "next available forecast hour"

    vessel = (
        "large cargo vessel" if any(x in searchable_text for x in ("cargo", "ship"))
        else "medium trawler" if "trawler" in searchable_text
        else DEFAULT_VESSEL
    )
    persona = "authority" if any(m in searchable_text for m in _AUTHORITY_MARKERS) else "fisherman"
    narrow_topic = detect_narrow_topic(searchable_text)
    return {"persona": persona, "query_type": query_type, "narrow_topic": narrow_topic, "time_window": time_window, "vessel_type": vessel}


# ---------------------------------------------------------------------------
# Geocoding helpers (always deterministic — no LLM hallucination risk)
# ---------------------------------------------------------------------------

def _has_marine_data(lat: float, lon: float) -> bool:
    """Returns True only if Open-Meteo marine API has wave data at this location."""
    marine_url = os.getenv("OPEN_METEO_MARINE_URL", "https://marine-api.open-meteo.com/v1/marine")
    cache_key = (round(lat, 1), round(lon, 1))
    cached = _MARINE_PROBE_CACHE.get(cache_key)
    if cached is not None:
        return cached
    try:
        res = get_json(marine_url, {"latitude": lat, "longitude": lon, "hourly": "wave_height", "timezone": "Asia/Kolkata"})
        wave_values = res.get("hourly", {}).get("wave_height", [])
        result = any(v is not None for v in wave_values[:6])
    except Exception:
        result = True  # Network error → don't discard; let downstream agents detect null
    _MARINE_PROBE_CACHE[cache_key] = result
    return result


def _geocode_with_candidates(candidates: list[str]) -> tuple[dict | None, str | None]:
    """Try each candidate string against Gazetteer then Open-Meteo geocoding API."""
    url = os.getenv("OPEN_METEO_GEOCODING_URL", GEOCODING_URL)
    best: dict | None = None

    for candidate in candidates:
        candidate_key = candidate.lower().strip()
        if candidate_key in COASTAL_GAZETTEER:
            hit = dict(COASTAL_GAZETTEER[candidate_key])
            hit["source"] = "Indian Coastal Directory"
            hit["geocoded_from"] = candidate
            return hit, None

        if candidate_key in INLAND_GAZETTEER:
            hit = dict(INLAND_GAZETTEER[candidate_key])
            hit["source"] = "Indian Inland Directory"
            hit["geocoded_from"] = candidate
            return hit, None

        for st in INLAND_STATES:
            if candidate_key == st or candidate_key.endswith(f" {st}") or candidate_key.endswith(f", {st}"):
                st_info = INLAND_GAZETTEER.get(st, {
                    "name": candidate.title(),
                    "latitude": 28.5,
                    "longitude": 77.0,
                    "admin1": st.title(),
                    "country_code": "IN",
                })
                hit = dict(st_info)
                hit["name"] = candidate.title()
                hit["admin1"] = st.title()
                hit["source"] = "Indian Inland Directory"
                hit["geocoded_from"] = candidate
                return hit, None

        try:
            payload = get_json(url, {"name": candidate, "count": 20, "language": "en", "format": "json"})
        except (URLError, TimeoutError, ValueError, KeyError):
            continue

        for result in payload.get("results", []):
            if result.get("country_code") != "IN":
                continue
            admin = result.get("admin1", "")
            lat, lon = result["latitude"], result["longitude"]
            name = result.get("name", candidate.title())
            hit = {
                "name": f"{name}, {admin}" if admin else name,
                "latitude": lat,
                "longitude": lon,
                "admin1": admin,
                "admin2": result.get("admin2"),
                "country_code": result.get("country_code"),
                "source": "Open-Meteo Geocoding API",
                "geocoded_from": candidate,
            }
            if _has_marine_data(lat, lon):
                return hit, None
            if best is None:
                best = hit  # inland fallback — kept as last resort

    if best:
        return best, None
    return None, "I could not resolve the Indian coastal location. Please try a more specific place name or enter coordinates (e.g. 10.5, 72.6 for Lakshadweep)."


def _regex_location_candidates(agent_query: str, original_query: str) -> list[str]:
    """Regex-based candidate extraction — used when LLM provides no location_name."""
    _STOP_WORDS = {
        "a", "about", "after", "all", "am", "an", "and", "any", "are", "around", "as", "at",
        "be", "been", "before", "being", "between", "both", "but", "by",
        "can", "check", "could", "did", "do", "does", "during",
        "each", "few", "for", "from", "further", "give", "go", "going",
        "had", "has", "have", "he", "her", "here", "him", "his", "how",
        "i", "if", "in", "into", "is", "it", "its", "just",
        "may", "me", "might", "more", "most", "must", "my",
        "no", "nor", "not", "now", "of", "off", "on", "once", "only", "or", "other", "our", "out", "over", "own",
        "please", "same", "shall", "she", "should", "show", "so", "some", "such",
        "tell", "than", "that", "the", "their", "them", "then", "there", "these", "they", "this",
        "those", "through", "to", "too", "under", "until", "up", "us", "very",
        "was", "we", "were", "what", "when", "where", "which", "while", "who", "whom", "why",
        "will", "with", "would", "you", "your",
        # Marine / activity intent words (NOT port/harbor/island/coast — they form place names)
        "alert", "advisory", "boat", "cargo", "condition", "conditions", "current", "currents",
        "danger", "dangerous", "fish", "fishing", "forecast", "height", "high",
        "marine", "ocean", "report", "risk", "safe", "safety", "seas", "ship", "speed",
        "status", "suitability", "suitable", "swell", "tide", "tides", "trawler",
        "vessel", "waters", "wave", "waves", "weather", "wind", "winds",
        # Temporal
        "aaj", "afternoon", "day", "days", "evening", "hour", "hours", "kal", "kl",
        "month", "morning", "night", "now", "subah", "dopahar", "shaam", "raat",
        "today", "tomorrow", "tonight", "week", "yesterday",
        # Hindi / Hinglish conversational
        "apne", "baare", "baat", "batao", "bataiye", "batana", "bhi", "bhai", "chahiye",
        "dekho", "dekhna", "gaye", "gaya", "hoga", "hogi", "honge", "hai", "hain", "ho", "hua", "hui",
        "ja", "jaa", "jaana", "jaane", "jana", "jane", "jaaye", "jaate", "jaata",
        "ka", "ke", "ki", "ko", "kar", "kare", "karein", "karna", "karne", "kr", "kya", "kyu", "kyun",
        "kaisa", "kaise", "kaisi", "kitna", "kitne", "kitni", "le", "liye",
        "machhli", "machli", "mein", "mera", "meri", "mere",
        "paas", "pass", "pakad", "pakada", "pakadna", "pakadne", "pani", "paani", "par",
        "raha", "rahe", "rahi", "rahega", "rahegi", "rahenge",
        "saath", "sakta", "sakte", "sakti", "sakenge", "sakunga", "samundar", "samundari",
        "se", "sir", "tha", "the", "thi",
    }

    def _extract(text: str) -> list[str]:
        if not text:
            return []
        cleaned = re.sub(r"[^a-zA-Z0-9\s,.-]", " ", text).lower()
        cleaned = re.sub(r"\b(?:ke|kay|ki|ka)\s+(?:pass|paas|near)\b", " near ", cleaned)
        cands: list[str] = []
        parts = re.split(r"\b(?:near|in|at|around|off|from|pass|paas)\b", cleaned)
        if len(parts) > 1:
            after = parts[-1].strip().split(",")[0].strip()
            words_after = [w for w in re.findall(r"[a-zA-Z.-]+", after) if len(w) > 1]
            filtered_after = [w for w in words_after if w not in _STOP_WORDS]
            if words_after:
                cands.append(" ".join(words_after[:3]))
                if len(words_after) > 2:  # also try 2-word prefix
                    sub2 = " ".join(words_after[:2])
                    if sub2 not in cands:
                        cands.append(sub2)
            if filtered_after:
                sub = " ".join(filtered_after[:3])
                if sub not in cands:
                    cands.append(sub)
                if len(filtered_after) > 2:  # also try 2-word prefix
                    sub2 = " ".join(filtered_after[:2])
                    if sub2 not in cands:
                        cands.append(sub2)
                for w in filtered_after:
                    if w not in cands:
                        cands.append(w)
        all_words = [w for w in re.findall(r"[a-zA-Z.-]+", cleaned) if len(w) > 1]
        filtered_all = [w for w in all_words if w not in _STOP_WORDS]
        if filtered_all:
            sub = " ".join(filtered_all[:3])
            if sub not in cands:
                cands.append(sub)
            for w in filtered_all:
                if w not in cands:
                    cands.append(w)
        return [c.strip() for c in cands if len(c.strip()) > 1]

    candidates: list[str] = []
    for text in (agent_query, original_query):
        for c in _extract(text):
            if c not in candidates:
                candidates.append(c)
    return candidates


# ---------------------------------------------------------------------------
# Main agent entry point
# ---------------------------------------------------------------------------

def agent_1_intent(query: str) -> dict:
    agent_query, language = prepare_for_agent_1(query)
    searchable_text = f"{agent_query.lower()}\n{query.lower()}"

    # ── 1. Coordinate detection (always deterministic) ──────────────────────
    coords = re.search(r"\b([0-3]?\d(?:\.\d+)?)\s*[, ]\s*([6-9]\d(?:\.\d+)?)\b", searchable_text)
    if coords and float(coords.group(1)) <= 38.0 and 65.0 <= float(coords.group(2)) <= 98.0:
        location: dict | None = {
            "name": "Coordinates supplied by user",
            "latitude": float(coords.group(1)),
            "longitude": float(coords.group(2)),
        }
        clarification: str | None = None
        llm_location_name: str = ""
    else:
        location = None
        clarification = None
        llm_location_name = ""

    # ── 2. LLM intent extraction (falls back gracefully) ────────────────────
    llm = _llm_extract_intent(query, agent_query)

    if llm:
        persona    = llm["persona"]
        query_type = llm["query_type"]
        narrow_topic = llm.get("narrow_topic")
        time_window = llm["time_window"]
        vessel     = llm["vessel_type"]
        llm_location_name = (llm.get("location_name") or "").strip()
    else:
        # Regex fallback
        extracted  = _regex_extract_intent(searchable_text)
        persona    = extracted["persona"]
        query_type = extracted["query_type"]
        narrow_topic = extracted.get("narrow_topic")
        time_window = extracted["time_window"]
        vessel     = extracted["vessel_type"]

    # Fallback / verification for narrow single-topic classification
    if not narrow_topic or narrow_topic not in NARROW_TOPICS:
        narrow_topic = detect_narrow_topic(searchable_text)

    # ── 3. Geocoding (deterministic) ────────────────────────────────────────
    if location is None:
        if llm_location_name:
            # LLM gave a clean location name → use it as primary candidate
            candidates = [llm_location_name] + _regex_location_candidates(agent_query, query)
        else:
            candidates = _regex_location_candidates(agent_query, query)
        location, clarification = _geocode_with_candidates(candidates)

    # ── 4. Coastal location check (early pipeline gate) ──────────────────────
    is_coastal, non_coastal_msg = check_is_coastal(location)

    return {
        "agent": "intent",
        "original_query": query,
        "agent_query": agent_query,
        "language": language,
        "persona": persona,
        "query_type": query_type,
        "narrow_topic": narrow_topic,
        "location": location,
        "is_coastal": is_coastal,
        "non_coastal_message": non_coastal_msg,
        "location_confidence": 0.95 if location else 0.0,
        "time_window": time_window,
        "vessel_type": vessel,
        "required_agents": ["weather", "ocean_advisory", "geofence", "route", "risk", "response"] if is_coastal else ["response"],
        "clarifying_question": None if location else clarification,
        "llm_used": llm is not None,
    }
