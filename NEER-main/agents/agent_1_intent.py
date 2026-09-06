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
  "time_window": "today" | "tomorrow" | "next available forecast hour",
  "vessel_type": "small fishing boat" | "medium trawler" | "large cargo vessel"
}

Rules:
- persona=authority: for government officials, coast guard, disaster management, district officers, regional advisories, or warning generation.
- persona=fisherman: for individual fishermen asking about their own trips.
- query_type=safety: asking if it is safe/dangerous/risky to go out to sea.
- query_type=fishing: asking about best fishing spots, PFZ zones, or catch potential.
- query_type=marine_conditions: general sea/weather/conditions questions.
- vessel_type defaults to "small fishing boat" unless cargo ship or trawler is explicitly mentioned.
- Preserve the FULL location name (e.g. "Andhra Pradesh coast" -> "Andhra Pradesh").

Few-shot examples:
{"query": "Kochi ke paas fishing safe hai kya aaj?", "output": {"location_name": "Kochi", "persona": "fisherman", "query_type": "safety", "time_window": "today", "vessel_type": "small fishing boat"}}
{"query": "Is it safe to fish near Visakhapatnam tomorrow?", "output": {"location_name": "Visakhapatnam", "persona": "fisherman", "query_type": "safety", "time_window": "tomorrow", "vessel_type": "small fishing boat"}}
{"query": "Regional risk assessment for Andhra Pradesh coast", "output": {"location_name": "Andhra Pradesh", "persona": "authority", "query_type": "marine_conditions", "time_window": "next available forecast hour", "vessel_type": "small fishing boat"}}
{"query": "Which coastal areas need attention tomorrow?", "output": {"location_name": "", "persona": "authority", "query_type": "marine_conditions", "time_window": "tomorrow", "vessel_type": "small fishing boat"}}
{"query": "Generate warning for fishermen in Visakhapatnam region", "output": {"location_name": "Visakhapatnam", "persona": "authority", "query_type": "safety", "time_window": "next available forecast hour", "vessel_type": "small fishing boat"}}
{"query": "Coast guard report for Kerala coast", "output": {"location_name": "Kerala", "persona": "authority", "query_type": "marine_conditions", "time_window": "next available forecast hour", "vessel_type": "small fishing boat"}}
{"query": "Mumbai mein kal cargo ship ke liye weather kaisa rahega?", "output": {"location_name": "Mumbai", "persona": "fisherman", "query_type": "marine_conditions", "time_window": "tomorrow", "vessel_type": "large cargo vessel"}}
{"query": "Goa ke paas best fishing zone kaunsa hai aaj?", "output": {"location_name": "Goa", "persona": "fisherman", "query_type": "fishing", "time_window": "today", "vessel_type": "small fishing boat"}}
{"query": "kya samundar mein jaana theek rahega?", "output": {"location_name": "", "persona": "fisherman", "query_type": "safety", "time_window": "next available forecast hour", "vessel_type": "small fishing boat"}}
{"query": "Ernakulam ke paas kal fishermen ke liye warning jaari karni chahiye kya?", "output": {"location_name": "Ernakulam", "persona": "authority", "query_type": "safety", "time_window": "tomorrow", "vessel_type": "small fishing boat"}}
{"query": "Lakshadweep ke paas trawler fishing ke liye conditions kal kaisi hongi?", "output": {"location_name": "Lakshadweep", "persona": "fisherman", "query_type": "fishing", "time_window": "tomorrow", "vessel_type": "medium trawler"}}
{"query": "Identify high-risk zones for fishermen along Odisha coast", "output": {"location_name": "Odisha", "persona": "authority", "query_type": "safety", "time_window": "next available forecast hour", "vessel_type": "small fishing boat"}}
"""

_VALID_PERSONAS      = {"fisherman", "authority"}
_VALID_QUERY_TYPES   = {"safety", "fishing", "marine_conditions"}
_VALID_TIME_WINDOWS  = {"today", "tomorrow", "next available forecast hour"}
_VALID_VESSELS       = {"small fishing boat", "medium trawler", "large cargo vessel"}


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
        and extracted.get("time_window") in _VALID_TIME_WINDOWS
        and extracted.get("vessel_type") in _VALID_VESSELS
    ):
        return extracted
    return None


def _contains_word(text: str, *words: str) -> bool:
    """Word-boundary keyword match. Substring checks misfire on words like
    'kal' inside 'kolkata' or 'ship' inside 'workshop' — both real bugs here."""
    return any(re.search(rf"\b{re.escape(w)}\b", text) for w in words)


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
    if _contains_word(searchable_text, "safe", "safety", "risk", "danger", "jaana", "ja sakte", "ja sakta", "go fishing"):
        query_type = "safety"
    elif _contains_word(searchable_text, "fish", "fishing", "pfz", "machhli"):
        query_type = "fishing"
    else:
        query_type = "marine_conditions"

    if _contains_word(searchable_text, "today", "aaj"):
        time_window = "today"
    elif _contains_word(searchable_text, "tomorrow", "kal", "kl"):
        time_window = "tomorrow"
    else:
        time_window = "next available forecast hour"

    vessel = (
        "large cargo vessel" if _contains_word(searchable_text, "cargo", "ship")
        else "medium trawler" if _contains_word(searchable_text, "trawler")
        else DEFAULT_VESSEL
    )
    persona = "authority" if any(m in searchable_text for m in _AUTHORITY_MARKERS) else "fisherman"
    return {"persona": persona, "query_type": query_type, "time_window": time_window, "vessel_type": vessel}


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

# Bounded fan-out: every candidate can cost a geocoding call plus a marine
# probe (12 s timeout each), so the candidate list must never be unbounded.
_MAX_GEOCODE_CANDIDATES = 5


def _location_confidence(location: dict | None) -> float:
    """Confidence actually reflects how the location was resolved, not a fixed 0.95."""
    if not location:
        return 0.0
    if location.get("name") == "Coordinates supplied by user":
        return 1.0
    source = location.get("source")
    if source == "Indian Coastal Directory":
        return 0.95
    if source == "Open-Meteo Geocoding API":
        return 0.8
    return 0.6


def agent_1_intent(query: str, history: list | None = None, use_llm: bool = True) -> dict:
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

    # ── 2. Intent extraction — LLM first (falls back gracefully). Fast mode
    # (dashboards, fixed English queries) skips the LLM round trip entirely.
    llm = _llm_extract_intent(query, agent_query) if use_llm else None

    if llm:
        persona    = llm["persona"]
        query_type = llm["query_type"]
        time_window = llm["time_window"]
        vessel     = llm["vessel_type"]
        llm_location_name = (llm.get("location_name") or "").strip()
    else:
        # Regex fallback
        extracted  = _regex_extract_intent(searchable_text)
        persona    = extracted["persona"]
        query_type = extracted["query_type"]
        time_window = extracted["time_window"]
        vessel     = extracted["vessel_type"]

    # ── 3. Geocoding (deterministic) ────────────────────────────────────────
    if location is None:
        if llm_location_name:
            # LLM gave a clean location name → use it as primary candidate
            candidates = [llm_location_name] + _regex_location_candidates(agent_query, query)
        else:
            candidates = _regex_location_candidates(agent_query, query)
        candidates = candidates[:_MAX_GEOCODE_CANDIDATES]
        location, clarification = _geocode_with_candidates(candidates)

    return {
        "agent": "intent",
        "original_query": query,
        "agent_query": agent_query,
        "language": language,
        "persona": persona,
        "query_type": query_type,
        "location": location,
        "location_confidence": _location_confidence(location),
        "time_window": time_window,
        "vessel_type": vessel,
        "required_agents": ["weather", "ocean_advisory", "geofence", "route", "risk", "response"],
        "clarifying_question": None if location else clarification,
        "llm_used": llm is not None,
    }
