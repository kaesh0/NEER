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
import math
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
    # Key coastal cities and ports
    "kochi":                 {"name": "Kochi, Kerala",                          "latitude": 9.9312,  "longitude": 76.2673, "admin1": "Kerala",                  "country_code": "IN"},
    "cochin":                {"name": "Kochi, Kerala",                          "latitude": 9.9312,  "longitude": 76.2673, "admin1": "Kerala",                  "country_code": "IN"},
    "visakhapatnam":         {"name": "Visakhapatnam, Andhra Pradesh",           "latitude": 17.6868, "longitude": 83.2185, "admin1": "Andhra Pradesh",           "country_code": "IN"},
    "vizag":                 {"name": "Visakhapatnam, Andhra Pradesh",           "latitude": 17.6868, "longitude": 83.2185, "admin1": "Andhra Pradesh",           "country_code": "IN"},
    "mumbai":                {"name": "Mumbai, Maharashtra",                   "latitude": 18.9667, "longitude": 72.8333, "admin1": "Maharashtra",            "country_code": "IN"},
    "bombay":                {"name": "Mumbai, Maharashtra",                   "latitude": 18.9667, "longitude": 72.8333, "admin1": "Maharashtra",            "country_code": "IN"},
    "chennai":               {"name": "Chennai, Tamil Nadu",                   "latitude": 13.0827, "longitude": 80.2707, "admin1": "Tamil Nadu",             "country_code": "IN"},
    "madras":                {"name": "Chennai, Tamil Nadu",                   "latitude": 13.0827, "longitude": 80.2707, "admin1": "Tamil Nadu",             "country_code": "IN"},
    "mangalore":             {"name": "Mangalore, Karnataka",                  "latitude": 12.8698, "longitude": 74.8426, "admin1": "Karnataka",              "country_code": "IN"},
    "mangaluru":             {"name": "Mangalore, Karnataka",                  "latitude": 12.8698, "longitude": 74.8426, "admin1": "Karnataka",              "country_code": "IN"},
    "panaji":                {"name": "Panaji, Goa",                             "latitude": 15.40,   "longitude": 73.80,   "admin1": "Goa",                     "country_code": "IN"},
    "goa":                   {"name": "Panaji, Goa",                             "latitude": 15.40,   "longitude": 73.80,   "admin1": "Goa",                     "country_code": "IN"},
    "veraval":               {"name": "Veraval, Gujarat",                      "latitude": 20.9071, "longitude": 70.3632, "admin1": "Gujarat",                "country_code": "IN"},
    "porbandar":             {"name": "Porbandar, Gujarat",                    "latitude": 21.6417, "longitude": 69.6293, "admin1": "Gujarat",                "country_code": "IN"},
    "dwarka":                {"name": "Dwarka, Gujarat",                       "latitude": 22.2394, "longitude": 68.9678, "admin1": "Gujarat",                "country_code": "IN"},
    "puri":                  {"name": "Puri, Odisha",                          "latitude": 19.8133, "longitude": 85.8315, "admin1": "Odisha",                 "country_code": "IN"},
    "paradip":               {"name": "Paradip, Odisha",                       "latitude": 20.3167, "longitude": 86.6167, "admin1": "Odisha",                 "country_code": "IN"},
    "haldia":                {"name": "Haldia, West Bengal",                   "latitude": 22.0667, "longitude": 88.0694, "admin1": "West Bengal",            "country_code": "IN"},
    "digha":                 {"name": "Digha, West Bengal",                    "latitude": 21.6266, "longitude": 87.5074, "admin1": "West Bengal",            "country_code": "IN"},
    "alleppey":              {"name": "Alappuzha, Kerala",                       "latitude": 9.4981,  "longitude": 76.3388, "admin1": "Kerala",                  "country_code": "IN"},
    "alappuzha":             {"name": "Alappuzha, Kerala",                       "latitude": 9.4981,  "longitude": 76.3388, "admin1": "Kerala",                  "country_code": "IN"},
    "calicut":               {"name": "Kozhikode, Kerala",                       "latitude": 11.2588, "longitude": 75.7804, "admin1": "Kerala",                  "country_code": "IN"},
    "kozhikode":             {"name": "Kozhikode, Kerala",                       "latitude": 11.2588, "longitude": 75.7804, "admin1": "Kerala",                  "country_code": "IN"},
    "kollam":                {"name": "Kollam, Kerala",                          "latitude": 8.8932,  "longitude": 76.6141, "admin1": "Kerala",                  "country_code": "IN"},
    "kannur":                {"name": "Kannur, Kerala",                          "latitude": 11.8745, "longitude": 75.3704, "admin1": "Kerala",                  "country_code": "IN"},
    "ratnagiri":             {"name": "Ratnagiri, Maharashtra",                  "latitude": 16.9902, "longitude": 73.3120, "admin1": "Maharashtra",            "country_code": "IN"},
    "karwar":                {"name": "Karwar, Karnataka",                       "latitude": 14.8136, "longitude": 74.1298, "admin1": "Karnataka",              "country_code": "IN"},
    "udupi":                 {"name": "Udupi, Karnataka",                        "latitude": 13.3409, "longitude": 74.7421, "admin1": "Karnataka",              "country_code": "IN"},
    "kanyakumari":           {"name": "Kanyakumari, Tamil Nadu",                 "latitude": 8.0883,  "longitude": 77.5385, "admin1": "Tamil Nadu",             "country_code": "IN"},
    "rameswaram":            {"name": "Rameswaram, Tamil Nadu",                  "latitude": 9.2876,  "longitude": 79.3129, "admin1": "Tamil Nadu",             "country_code": "IN"},
    "tuticorin":             {"name": "Thoothukudi, Tamil Nadu",                 "latitude": 8.7642,  "longitude": 78.1348, "admin1": "Tamil Nadu",             "country_code": "IN"},
    "thoothukudi":           {"name": "Thoothukudi, Tamil Nadu",                 "latitude": 8.7642,  "longitude": 78.1348, "admin1": "Tamil Nadu",             "country_code": "IN"},
    "cuddalore":             {"name": "Cuddalore, Tamil Nadu",                   "latitude": 11.7480, "longitude": 79.7714, "admin1": "Tamil Nadu",             "country_code": "IN"},
    "machilipatnam":         {"name": "Machilipatnam, Andhra Pradesh",           "latitude": 16.1875, "longitude": 81.1389, "admin1": "Andhra Pradesh",           "country_code": "IN"},
    "kakinada":              {"name": "Kakinada, Andhra Pradesh",                "latitude": 16.9891, "longitude": 82.2475, "admin1": "Andhra Pradesh",           "country_code": "IN"},
    "lakshadweep":           {"name": "Kavaratti, Lakshadweep",                  "latitude": 10.5669, "longitude": 72.6420, "admin1": "Lakshadweep",             "country_code": "IN"},
    "kavaratti":             {"name": "Kavaratti, Lakshadweep",                  "latitude": 10.5669, "longitude": 72.6420, "admin1": "Lakshadweep",             "country_code": "IN"},
    "daman":                 {"name": "Daman, Daman and Diu",                    "latitude": 20.3974, "longitude": 72.8328, "admin1": "Daman and Diu",           "country_code": "IN"},
    "diu":                   {"name": "Diu, Daman and Diu",                      "latitude": 20.7141, "longitude": 70.9822, "admin1": "Daman and Diu",           "country_code": "IN"},
    "puducherry":            {"name": "Puducherry",                              "latitude": 11.9416, "longitude": 79.8083, "admin1": "Puducherry",              "country_code": "IN"},
    "pondicherry":           {"name": "Puducherry",                              "latitude": 11.9416, "longitude": 79.8083, "admin1": "Puducherry",              "country_code": "IN"},
    "port blair":            {"name": "Port Blair, Andaman and Nicobar",        "latitude": 11.6233, "longitude": 92.7265, "admin1": "Andaman and Nicobar",    "country_code": "IN"},
    "andaman":               {"name": "Port Blair, Andaman and Nicobar",        "latitude": 11.6233, "longitude": 92.7265, "admin1": "Andaman and Nicobar",    "country_code": "IN"},
    "andaman and nicobar":   {"name": "Port Blair, Andaman and Nicobar",        "latitude": 11.6233, "longitude": 92.7265, "admin1": "Andaman and Nicobar",    "country_code": "IN"},
    # Coastal state names → representative coastal city
    "andhra pradesh":        {"name": "Visakhapatnam, Andhra Pradesh",           "latitude": 17.6868, "longitude": 83.2185, "admin1": "Andhra Pradesh",           "country_code": "IN"},
    "andhra":                {"name": "Visakhapatnam, Andhra Pradesh",           "latitude": 17.6868, "longitude": 83.2185, "admin1": "Andhra Pradesh",           "country_code": "IN"},
    "kerala":                {"name": "Kochi, Kerala",                          "latitude": 9.9312,  "longitude": 76.2673, "admin1": "Kerala",                  "country_code": "IN"},
    "gujarat":               {"name": "Veraval, Gujarat",                      "latitude": 20.9071, "longitude": 70.3632, "admin1": "Gujarat",                "country_code": "IN"},
    "gujrat":                {"name": "Veraval, Gujarat",                      "latitude": 20.9071, "longitude": 70.3632, "admin1": "Gujarat",                "country_code": "IN"},
    "bengal":                {"name": "Haldia, West Bengal",                   "latitude": 22.0667, "longitude": 88.0694, "admin1": "West Bengal",            "country_code": "IN"},
    "tamil nadu":            {"name": "Chennai, Tamil Nadu",                   "latitude": 13.0827, "longitude": 80.2707, "admin1": "Tamil Nadu",             "country_code": "IN"},
    "tamilnadu":             {"name": "Chennai, Tamil Nadu",                   "latitude": 13.0827, "longitude": 80.2707, "admin1": "Tamil Nadu",             "country_code": "IN"},
    "odisha":                {"name": "Puri, Odisha",                          "latitude": 19.8133, "longitude": 85.8315, "admin1": "Odisha",                 "country_code": "IN"},
    "orissa":                {"name": "Puri, Odisha",                          "latitude": 19.8133, "longitude": 85.8315, "admin1": "Odisha",                 "country_code": "IN"},
    "west bengal":           {"name": "Haldia, West Bengal",                   "latitude": 22.0667, "longitude": 88.0694, "admin1": "West Bengal",            "country_code": "IN"},
    "maharashtra":           {"name": "Mumbai, Maharashtra",                   "latitude": 18.9667, "longitude": 72.8333, "admin1": "Maharashtra",            "country_code": "IN"},
    "karnataka":             {"name": "Mangalore, Karnataka",                  "latitude": 12.8698, "longitude": 74.8426, "admin1": "Karnataka",              "country_code": "IN"},
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

Extract intent from the user query (may be English, Hindi, Hinglish, Malayalam, Tamil, Telugu, Bengali, Marathi, or other Indian coastal languages) and return ONLY a valid JSON object:

{
  "location_name": "<full place name as mentioned; preserve multi-word names like 'Andhra Pradesh', 'Port Blair'; empty string if no location>",
  "persona": "fisherman" | "authority",
  "query_type": "safety" | "fishing" | "marine_conditions",
  "narrow_topic": "weather" | "wind_speed" | "wave_height" | "swell" | "pfz" | "geofence" | "hazards" | "route" | "score" | "sea_surface_temperature" | "chlorophyll" | "timing" | null,
  "time_window": "today" | "tomorrow" | "next available forecast hour",
  "vessel_type": "small fishing boat" | "medium trawler" | "large cargo vessel"
}

Rules:
- persona=authority: for government officials, coast guard, disaster management, district officers, regional advisories, or warning generation.
- persona=fisherman: for individual fishermen asking about their own trips.
- query_type=safety: ANY question about whether it is safe/permitted/advisable to go out to sea, sail, launch, venture out, or fish — including phrasings like "can I go fishing at X", "can I go to X to fish", "is it okay to fish there", "can I venture out", "Kya me waha fishing ke liye jaa sakta hu", "kya me fishing ke liye jaa sakta hu", "എനിക്ക് അവിടെ മീൻ പിടിക്കാൻ പോകാമോ", "நான் அங்கு மீன்பிடிக்க செல்லலாமா", "నేను అక్కడ చేపల వేటకు వెళ్ళవచ్చా", "আমি কি সেখানে মাছ ধরতে যেতে পারি" — even though the word "fishing" appears, the intent is permission/safety/risk, not discovering fish locations.
- query_type=fishing: ONLY when the question is specifically asking WHERE to fish, for potential fishing zones (PFZ), or catch potential/abundance with no go/venture/permission framing (e.g. "where's the nearest PFZ zone", "best spot to catch fish today", "machhli kahan milegi").
- query_type=marine_conditions: general sea/weather/conditions overview or parameter queries (e.g. "how are conditions", "wave height in Kochi", "weather near Mumbai").
- narrow_topic: set ONLY if the user is asking specifically and narrowly about ONE topic ("weather", "wind_speed", "wave_height", "swell", "pfz", "geofence", "hazards", "route", "score", "sea_surface_temperature", "chlorophyll", "timing"). Set to null for broad or open-ended questions like "is it safe to fish", "how are conditions", or general assessments.
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
{"query": "what time should I go fishing near Kochi", "output": {"location_name": "Kochi", "persona": "fisherman", "query_type": "fishing", "narrow_topic": "timing", "time_window": "today", "vessel_type": "small fishing boat"}}
{"query": "any hazards near Chennai", "output": {"location_name": "Chennai", "persona": "fisherman", "query_type": "safety", "narrow_topic": "hazards", "time_window": "today", "vessel_type": "small fishing boat"}}
{"query": "which route is safe near Mangalore", "output": {"location_name": "Mangalore", "persona": "fisherman", "query_type": "safety", "narrow_topic": "route", "time_window": "today", "vessel_type": "small fishing boat"}}
{"query": "how is the weather near Mumbai today", "output": {"location_name": "Mumbai", "persona": "fisherman", "query_type": "marine_conditions", "narrow_topic": "weather", "time_window": "today", "vessel_type": "small fishing boat"}}
{"query": "Kya me kavaratti me fishing ke liye jaa sakta hu?", "output": {"location_name": "Kavaratti", "persona": "fisherman", "query_type": "safety", "narrow_topic": null, "time_window": "today", "vessel_type": "small fishing boat"}}
{"query": "can I go fishing near Mangalore today", "output": {"location_name": "Mangalore", "persona": "fisherman", "query_type": "safety", "narrow_topic": null, "time_window": "today", "vessel_type": "small fishing boat"}}
{"query": "Kya me waha fishing ke liye jaa sakta hu?", "output": {"location_name": "", "persona": "fisherman", "query_type": "safety", "narrow_topic": null, "time_window": "today", "vessel_type": "small fishing boat"}}
{"query": "എനിക്ക് അവിടെ മീൻ പിടിക്കാൻ പോകാമോ?", "output": {"location_name": "", "persona": "fisherman", "query_type": "safety", "narrow_topic": null, "time_window": "today", "vessel_type": "small fishing boat"}}
{"query": "நான் அங்கு மீன்பிடிக்க செல்லலாமா?", "output": {"location_name": "", "persona": "fisherman", "query_type": "safety", "narrow_topic": null, "time_window": "today", "vessel_type": "small fishing boat"}}
{"query": "నేను అక్కడ చేపల వేటకు వెళ్ళవచ్చా?", "output": {"location_name": "", "persona": "fisherman", "query_type": "safety", "narrow_topic": null, "time_window": "today", "vessel_type": "small fishing boat"}}
{"query": "আমি কি সেখানে মাছ ধরতে যেতে পারি?", "output": {"location_name": "", "persona": "fisherman", "query_type": "safety", "narrow_topic": null, "time_window": "today", "vessel_type": "small fishing boat"}}
"""

_VALID_PERSONAS      = {"fisherman", "authority"}
_VALID_QUERY_TYPES   = {"safety", "fishing", "marine_conditions"}
_VALID_TIME_WINDOWS  = {"today", "tomorrow", "next available forecast hour"}
_VALID_VESSELS       = {"small fishing boat", "medium trawler", "large cargo vessel"}
NARROW_TOPICS        = {"weather", "wind_speed", "wave_height", "swell", "pfz", "geofence", "hazards", "route", "score", "sea_surface_temperature", "chlorophyll", "timing"}

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

    # Broad open-ended question patterns (asking about whole trip/safety assessment)
    broad_indicators = [
        r"\bis it safe to fish\b",
        r"\bis it safe\b",
        r"\bcan i go\b",
        r"\bcan i fish\b",
        r"\bshould i go\b",
        r"\btrip assessment\b",
        r"\bmarine assessment\b",
        r"\bfull report\b",
        r"\bregional risk\b",
        r"\bjaana theek\b",
        r"\bja sakte\b",
        r"\bja sakta\b",
        r"\bjaa sakte\b",
        r"\bjaa sakta\b",
        r"\bfishing\s*ke\s*liye\b",
        r"\boverall\b",
    ]
    for pattern in broad_indicators:
        if re.search(pattern, t):
            return None

    # Topic detectors
    has_weather = bool(re.search(r"\b(weather|mausam|sea\s*conditions?|conditions?\s*there|weather\s*there|how\s*is\s*the\s*weather)\b", t))
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
    has_hazard = bool(re.search(r"\b(hazards?|dangers?|khatra|khatre|any\s*hazards?|active\s*hazards?)\b", t))
    has_route = bool(re.search(r"\b(route|routes|navigation|navigational\s*path|passage\s*corridor|rasta|waypoint)\b", t))
    has_timing = bool(re.search(r"\b(good\s*time|best\s*time|right\s*time|optimal\s*time|what\s*time|timing|timings|when\s*(?:should|can|to|would)\s*(?:i|we|be)?\s*(?:go|fish|sail|a\s*good)|kab\s*(?:jaana|jaayein|machhli)|shubh\s*samay|achha\s*samay|samay|time\s*for\s*fishing)\b", t))

    # Disambiguate swell vs wave if user asked specifically about swell
    if has_swell and not re.search(r"\bwave\s*heights?\b", t):
        has_wave = False

    matched = []
    if has_timing:
        matched.append("timing")
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
    if has_route:
        matched.append("route")
    if has_score:
        matched.append("score")
    if has_sst:
        matched.append("sea_surface_temperature")
    if has_chloro:
        matched.append("chlorophyll")
    if has_hazard and not matched:
        matched.append("hazards")
    if has_weather and not matched:
        matched.append("weather")

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


def _llm_extract_intent(query: str, agent_query: str, conversation_context: dict | None = None) -> dict | None:
    """Call Sarvam AI (sarvam-105b) to extract structured intent. Returns validated dict or None."""
    combined = f"Original: {query}\nTranslated: {agent_query}" if query != agent_query else query

    if conversation_context and conversation_context.get("recent_turns"):
        recent = conversation_context["recent_turns"]
        if recent:
            last_turn = recent[-1]
            last_q = last_turn.get("query", "")
            last_loc = conversation_context.get("last_location")
            last_loc_name = (last_loc.get("name") if isinstance(last_loc, dict) else last_loc) or ""
            if last_loc_name:
                context_prefix = f'Previous turn: user asked "{last_q}", location resolved to "{last_loc_name}".\nCurrent query: '
            else:
                context_prefix = f'Previous turn: user asked "{last_q}".\nCurrent query: '
            combined = f"{context_prefix}{combined}"

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
    safety_markers = (
        "safe", "safety", "risk", "danger", "hazard", "khatra",
        "can i go", "can we go", "should i go", "should we go",
        "can i fish", "can we fish", "should i fish",
        "can i sail", "can we sail", "should i sail",
        "can i venture", "venture out", "go out", "go fishing",
        "launch my boat", "launch boat", "leave harbor", "leave port",
        "is it okay", "is it good", "is it safe",
        "jaana", "ja sakte", "ja sakta", "jaa sakta", "jaa sakte",
        "jaa sakta hu", "jaa sakte hain", "ja sakta hu", "ja sakte hain",
        "jaana chahiye", "jaana theek", "fishing ke liye ja",
        "safe hai", "theek hai", "kaisa rahega",
        # Malayalam permission & safety phrases
        "പോകാമോ", "പോകാൻ പറ്റുമോ", "പോകാനാവുമോ", "മീൻ പിടിക്കാൻ പോകാമോ", "മീൻപിടിക്കാൻ പോകാമോ",
        "മീൻ പിടിക്കാൻ", "മീൻപിടിക്കാൻ", "സുരക്ഷിതമാണോ",
        # Tamil permission & safety phrases
        "போகலாமா", "செல்லலாமா", "மீன்பிடிக்க செல்லலாமா", "மீன்பிடிக்க போகலாமா", "பாதுகாப்பானதா",
        # Telugu permission & safety phrases
        "వెళ్ళవచ్చా", "వెళ్లవచ్చా", "చేపల వేటకు వెళ్ళవచ్చా", "చేపల వేటకు వెళ్లవచ్చా", "సురక్షితమేనా",
        # Bengali permission & safety phrases
        "যেতে পারি", "মাছ ধরতে যেতে পারি", "নিরাপদ কি",
    )
    fishing_markers = (
        "where to fish", "where should i fish", "where can i fish",
        "fishing spot", "fishing spots", "fishing zone", "fishing zones",
        "pfz", "potential fishing zone", "catch fish", "find fish",
        "machhli kahan", "machli zone", "machli kahan",
    )
    # Check safety_markers with higher priority than fishing_markers
    if any(w in searchable_text for w in safety_markers):
        query_type = "safety"
    elif any(w in searchable_text for w in fishing_markers):
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
    if narrow_topic == "timing":
        query_type = "fishing"
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
        candidate_prefix = candidate_key.split(",")[0].strip()

        if candidate_key in COASTAL_GAZETTEER:
            hit = dict(COASTAL_GAZETTEER[candidate_key])
            hit["source"] = "Indian Coastal Directory"
            hit["geocoded_from"] = candidate
            return hit, None

        if candidate_prefix in COASTAL_GAZETTEER:
            hit = dict(COASTAL_GAZETTEER[candidate_prefix])
            hit["source"] = "Indian Coastal Directory"
            hit["geocoded_from"] = candidate
            return hit, None

        if candidate_key in INLAND_GAZETTEER:
            hit = dict(INLAND_GAZETTEER[candidate_key])
            hit["source"] = "Indian Inland Directory"
            hit["geocoded_from"] = candidate
            return hit, None

        if candidate_prefix in INLAND_GAZETTEER:
            hit = dict(INLAND_GAZETTEER[candidate_prefix])
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
        # Hindi / Hinglish conversational & location pronouns
        "apne", "baare", "baat", "batao", "bataiye", "batana", "bhi", "bhai", "chahiye",
        "dekho", "dekhna", "gaye", "gaya", "hoga", "hogi", "honge", "hai", "hain", "ho", "hua", "hui",
        "hoon", "hu", "hum",
        "ja", "jaa", "jaana", "jaane", "jana", "jane", "jaaye", "jaate", "jaata",
        "ka", "ke", "ki", "ko", "kar", "kare", "karein", "karna", "karne", "kr", "kya", "kyu", "kyun",
        "kaisa", "kaise", "kaisi", "kitna", "kitne", "kitni", "le", "liye",
        "machhli", "machli", "main", "mein", "mera", "meri", "mere",
        "paas", "pass", "pakad", "pakada", "pakadna", "pakadne", "pani", "paani", "par",
        "raha", "rahe", "rahi", "rahega", "rahegi", "rahenge",
        "saath", "sakta", "sakte", "sakti", "sakenge", "sakunga", "samundar", "samundari",
        "se", "sir", "tha", "the", "thi",
        "waha", "wahan", "vahan", "vaha", "wahin", "vahin", "there", "that place", "same place", "jagah",
        # Regional pronouns and particles
        "enikku", "njan", "avide", "naan", "angu", "ange", "nenu", "akkada", "ami", "sekhane",
        "എനിക്ക്", "അവിടെ", "ഞാൻ", "പോകാമോ",
        "நான்", "அங்கு", "அங்கே", "போகலாமா",
        "నేను", "అక్కడ", "వెళ్ళవచ్చా",
        "আমি", "সেখানে", "যেতে",
        "मैं", "वहाँ", "वहा", "हूँ", "हूं",
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


def _reverse_geocode_coastal(lat: float, lon: float) -> str:
    """Find the closest coastal gazetteer location using haversine distance.
    Returns e.g. 'Panaji, Goa' or 'Off Panaji Coast, Goa'.
    """
    best_item = None
    min_dist = float("inf")
    R = 6371.0  # km

    seen_names = set()
    for entry in COASTAL_GAZETTEER.values():
        name = entry.get("name")
        if not name or name in seen_names:
            continue
        seen_names.add(name)

        c_lat = entry["latitude"]
        c_lon = entry["longitude"]

        d_lat = math.radians(c_lat - lat)
        d_lon = math.radians(c_lon - lon)
        a = (
            math.sin(d_lat / 2.0) ** 2
            + math.cos(math.radians(lat)) * math.cos(math.radians(c_lat)) * math.sin(d_lon / 2.0) ** 2
        )
        c = 2.0 * math.atan2(math.sqrt(max(0.0, a)), math.sqrt(max(0.0, 1.0 - a)))
        dist = R * c

        if dist < min_dist:
            min_dist = dist
            best_item = entry

    if not best_item:
        return f"{lat:.4f}° N, {lon:.4f}° E"

    full_name = best_item["name"]
    parts = [p.strip() for p in full_name.split(",")]
    place = parts[0]
    admin = parts[1] if len(parts) > 1 else ""

    if min_dist <= 8.0:
        return full_name
    elif min_dist <= 45.0:
        return f"Off {place} Coast, {admin}" if admin else f"Off {place} Coast"
    else:
        rounded_km = round(min_dist / 5.0) * 5
        return f"Off {place} Coast (~{rounded_km} km), {admin}" if admin else f"Off {place} Coast (~{rounded_km} km)"


# ---------------------------------------------------------------------------
# Main agent entry point
# ---------------------------------------------------------------------------

def agent_1_intent(
    query: str,
    fallback_location: str | None = None,
    fallback_persona: str | None = None,
    conversation_context: dict | None = None,
) -> dict:
    agent_query, language = prepare_for_agent_1(query)
    searchable_text = f"{agent_query.lower()}\n{query.lower()}"

    # ── 1. Coordinate detection (always deterministic) ──────────────────────
    coords = re.search(r"\b([0-3]?\d(?:\.\d+)?)\s*[, ]\s*([6-9]\d(?:\.\d+)?)\b", searchable_text)
    if not coords and fallback_location:
        coords = re.search(r"\b([0-3]?\d(?:\.\d+)?)\s*[, ]\s*([6-9]\d(?:\.\d+)?)\b", fallback_location)

    if coords and float(coords.group(1)) <= 38.0 and 65.0 <= float(coords.group(2)) <= 98.0:
        c_lat = float(coords.group(1))
        c_lon = float(coords.group(2))
        location: dict | None = {
            "name": _reverse_geocode_coastal(c_lat, c_lon),
            "latitude": c_lat,
            "longitude": c_lon,
            "source": "Coastal reverse geocoding",
        }
        clarification: str | None = None
        llm_location_name: str = ""
    else:
        location = None
        clarification = None
        llm_location_name = ""

    # ── 2. LLM intent extraction (falls back gracefully) ────────────────────
    llm = _llm_extract_intent(query, agent_query, conversation_context=conversation_context)

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

    effective_fallback_persona = fallback_persona
    if not effective_fallback_persona and conversation_context and conversation_context.get("last_persona"):
        effective_fallback_persona = conversation_context["last_persona"]

    if effective_fallback_persona and effective_fallback_persona in ("fisherman", "authority", "marine"):
        # If user is in authority/marine mode in frontend or previous turn, apply unless query was explicitly contradictory
        if persona in ("general", "fisherman") and effective_fallback_persona != "fisherman":
            persona = effective_fallback_persona

    # Vessel fallback: if current query didn't mention a vessel, carry over last_vessel_type
    vessel_mentioned = any(x in searchable_text for x in ("cargo", "ship", "trawler", "boat", "vessel", "catamaran", "canoe", "dinghy", "dhow", "nau", "kisti", "jahaz"))
    if not vessel_mentioned and conversation_context and conversation_context.get("last_vessel_type"):
        last_vessel = conversation_context["last_vessel_type"]
        if last_vessel in _VALID_VESSELS:
            vessel = last_vessel

    # Fallback / verification for narrow single-topic classification
    if not narrow_topic or narrow_topic not in NARROW_TOPICS:
        narrow_topic = detect_narrow_topic(searchable_text)

    # Permission / Safety safeguard:
    # "Can I go [fishing]", "is it safe to go/fish", or regional permission phrases ("പോകാമോ", "போகலாமா", etc.)
    # are structurally safety/risk permission questions (CASE A) and must never be classified as
    # generic marine_conditions (CASE C) or fishing location discovery.
    _PERMISSION_SAFETY_PATTERNS = [
        r"\bcan\s+(?:i|we)\s+(?:go|fish|sail|venture)\b",
        r"\b(?:go|going)\s+fishing\b",
        r"\bshould\s+(?:i|we)\s+(?:go|fish|sail)\b",
        r"\bis\s+it\s+(?:safe|okay|permitted|advisable)\b",
        r"\bja+a?\s+sakta\b",
        r"\bja+a?\s+sakte\b",
        r"\bപോകാമോ\b",
        r"\bപോകാൻ\s*പറ്റുമോ\b",
        r"\bപോകാനാവുമോ\b",
        r"\bസുരക്ഷിതമാണോ\b",
        r"\bபோகலாமா\b",
        r"\bசெல்லலாமா\b",
        r"\bபாதுகாப்பானதா\b",
        r"\bవెళ్ళవచ్చా\b",
        r"\bవెళ్లవచ్చా\b",
        r"\bసురక్షితమేనా\b",
        r"\bযেতে\s*পারি\b",
        r"\bনিরাপদ\s*কি\b",
    ]
    is_timing = bool(re.search(r"\b(what\s+time|when|best\s+time|which\s+time|timing|kab|kis\s+samay|eppol|eppozhum|eppo)\b", searchable_text, re.IGNORECASE))
    if not is_timing and any(re.search(pat, searchable_text, re.IGNORECASE) for pat in _PERMISSION_SAFETY_PATTERNS):
        query_type = "safety"
        narrow_topic = None

    # ── 3. Geocoding (deterministic) ────────────────────────────────────────
    if location is None:
        _LOCATION_PRONOUN_PATTERNS = [
            r"\b(waha|wahan|vahan|vaha|wahin|vahin)\b",
            r"\b(us|uss|wahi|vahi)\s+jagah\b",
            r"\b(there|that\s+place|same\s+place|that\s+spot|same\s+spot)\b",
            r"\b(അവിടെ|അവിടേക്ക്|ആ\s+സ്ഥലം)\b",
            r"\b(அங்கு|அங்கே|அந்த\s+இடம்)\b",
            r"\b(அక్కడ|అక్కడికి|ఆ\s+ప్రదేశం)\b",
            r"\b(সেখানে|ওই\s+জায়গা)\b",
            r"\b(वहाँ|वहा|उधर|उस\s+जगह)\b",
        ]
        _LOCATION_PRONOUN_WORDS = {
            "waha", "wahan", "vahan", "vaha", "wahin", "vahin",
            "us jagah", "uss jagah", "wahi jagah", "vahi jagah",
            "there", "that place", "same place", "place", "spot",
            "അവിടെ", "അവിടേക്ക്", "ആ സ്ഥലം",
            "அங்கு", "அங்கே", "அந்த இடம்",
            "అక్కడ", "అక్కడికి", "ఆ ప్రదేశం",
            "সেখানে", "ওই জায়গা",
            "वहाँ", "वहा", "उधर", "उस जगह",
        }
        has_pronoun = any(re.search(p, searchable_text) for p in _LOCATION_PRONOUN_PATTERNS)
        last_loc = conversation_context.get("last_location") if conversation_context else None

        # Gather candidate place names ONLY from the current query
        raw_candidates = []
        if llm_location_name and llm_location_name.strip().lower() not in _LOCATION_PRONOUN_WORDS:
            raw_candidates.append(llm_location_name.strip())
        for c in _regex_location_candidates(agent_query, query):
            c_strip = c.strip()
            if c_strip and c_strip.lower() not in _LOCATION_PRONOUN_WORDS and c_strip not in raw_candidates:
                raw_candidates.append(c_strip)

        # (a) Explicit location in current query wins always
        if raw_candidates:
            loc, _ = _geocode_with_candidates(raw_candidates)
            if loc:
                location = loc
                clarification = None

        # (b) Pronoun / reference match ("waha", "there", etc.) OR no explicit location mentioned
        #     If conversation_context has last_location, use it before falling back to UI default
        if location is None and last_loc:
            if isinstance(last_loc, dict) and last_loc.get("latitude") is not None:
                location = last_loc
                clarification = None
            elif isinstance(last_loc, str) and last_loc.strip():
                loc, _ = _geocode_with_candidates([last_loc.strip()])
                if loc:
                    location = loc
                    clarification = None

        # (c) Otherwise fall back to fallback_location (UI static default, e.g. Kochi)
        if location is None and fallback_location and fallback_location.strip():
            fb_loc, _ = _geocode_with_candidates([fallback_location.strip()])
            if fb_loc:
                location = fb_loc
                clarification = None

        if location is None:
            clarification = "I could not resolve the Indian coastal location. Please try a more specific place name or enter coordinates (e.g. 10.5, 72.6 for Lakshadweep)."

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
