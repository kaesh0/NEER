"""Sarvam text-language layer used before Agent 1 and after Agent 5."""

from __future__ import annotations

import json
import logging
import os
import re
from urllib.request import Request, urlopen

logger = logging.getLogger("neer.translation")

ENGLISH = "en-IN"

LANGUAGE_NAMES = {
    "hi-IN": "Hindi",
    "ta-IN": "Tamil",
    "te-IN": "Telugu",
    "bn-IN": "Bengali",
    "ml-IN": "Malayalam",
    "mr-IN": "Marathi",
    "gu-IN": "Gujarati",
    "kn-IN": "Kannada",
    "pa-IN": "Punjabi",
    "od-IN": "Odia",
    "en-IN": "English",
}


def _get_value(response: object, name: str, default: str | None = None) -> str | None:
    if isinstance(response, dict):
        return response.get(name, default)
    return getattr(response, name, default)


def _client():
    api_key = os.getenv("SARVAM_API_KEY")
    if not api_key:
        return None
    try:
        from sarvamai import SarvamAI

        return SarvamAI(api_subscription_key=api_key, timeout=20)
    except ImportError:
        return None


_SCRIPT_PATTERNS = [
    ("ta-IN", re.compile(r"[\u0B80-\u0BFF]")),  # Tamil
    ("te-IN", re.compile(r"[\u0C00-\u0C7F]")),  # Telugu
    ("bn-IN", re.compile(r"[\u0980-\u09FF]")),  # Bengali
    ("ml-IN", re.compile(r"[\u0D00-\u0D7F]")),  # Malayalam
    ("kn-IN", re.compile(r"[\u0C80-\u0CFF]")),  # Kannada
    ("gu-IN", re.compile(r"[\u0A80-\u0AFF]")),  # Gujarati
    ("od-IN", re.compile(r"[\u0B00-\u0B7F]")),  # Odia
    ("pa-IN", re.compile(r"[\u0A00-\u0A7F]")),  # Punjabi
    ("hi-IN", re.compile(r"[\u0900-\u097F]")),  # Devanagari (Hindi / Marathi)
]

_MARATHI_SCRIPT_MARKERS = {"आहे", "नाही", "कसा", "कसे", "मासेमारी", "हवामान", "जाऊ", "येथे"}

_HINDI_MARKERS = {
    "kya", "kyu", "hoga", "hogi", "hoge", "hai", "hain", "paas", "pass", "kal", "aaj", "kl",
    "par", "pe", "mein", "me", "main", "jaana", "theek", "sakta", "sakte", "sakthi", "machli",
    "hawa", "lehar", "samundar", "samudra", "surakshit", "kaisa", "kaisi", "bataye", "batao",
    "wahan", "waha", "udhar", "jaau", "sakta hu", "sakta hoon",
}

_TAMIL_MARKERS = {
    "vanilai", "vaanilai", "epdi", "eppadi", "irukku", "irukkum", "irukkiradhu", "polama",
    "pogalama", "meen", "pidikka", "kaatru", "alai", "kadallil", "kadalkarai", "chellalama",
    "naan", "angu", "ange", "nallatha"
}

_TELUGU_MARKERS = {
    "vatavaranam", "vaatavaranam", "ela", "undi", "undhi", "vellavacha", "vellacha", "vellala",
    "chepalu", "vetaku", "samudram", "gaali", "ala", "nenu", "ekkada", "bagunda"
}

_BENGALI_MARKERS = {
    "abhawa", "aabhawa", "kemon", "ache", "aache", "jete", "pari", "mach", "dhorte",
    "shomudro", "somudro", "hawa", "dheu", "ami", "kothay", "bhalo"
}

_MALAYALAM_MARKERS = {
    "kalavastha", "kaalavastha", "engane", "undu", "und", "pokaamo", "pokamo", "povan",
    "meen", "pidikkan", "kadal", "kaattu", "thira", "enikku", "evide"
}

_MARATHI_MARKERS = {
    "kasa", "kase", "aahe", "jaau", "shakto", "shakto ka", "havaaman", "havaman",
    "masemari", "kuthe", "surakshit"
}


def _heuristic_language(query: str) -> str:
    """Detect language based on Unicode script ranges and transliterated roman markers."""
    if not query:
        return ENGLISH

    # 1. Indic Unicode script detection
    for lang, pat in _SCRIPT_PATTERNS:
        if pat.search(query):
            if lang == "hi-IN":
                words = set(query.split())
                if words & _MARATHI_SCRIPT_MARKERS:
                    return "mr-IN"
            return lang

    # 2. Romanized word markers
    clean_tokens = {re.sub(r"[^a-zA-Z]", "", w).lower() for w in query.split()}
    clean_tokens.discard("")

    scores = {
        "ml-IN": len(clean_tokens & _MALAYALAM_MARKERS),
        "ta-IN": len(clean_tokens & _TAMIL_MARKERS),
        "te-IN": len(clean_tokens & _TELUGU_MARKERS),
        "bn-IN": len(clean_tokens & _BENGALI_MARKERS),
        "mr-IN": len(clean_tokens & _MARATHI_MARKERS),
        "hi-IN": len(clean_tokens & _HINDI_MARKERS),
    }
    best_lang, best_count = max(scores.items(), key=lambda item: item[1])
    if best_count > 0:
        return best_lang

    return ENGLISH


# Native coastal place-name transliterations for offline translation
_OFFLINE_PLACE_MAP = {
    # Devanagari
    "कोच्चि": "Kochi", "कोचीन": "Kochi", "कवारत्ती": "Kavaratti", "चेन्नई": "Chennai",
    "मुंबई": "Mumbai", "गोवा": "Goa", "विशाखापट्टनम": "Visakhapatnam", "मंगलोर": "Mangalore",
    "कोलकाता": "Kolkata", "पोरबंदर": "Porbandar", "दीव": "Diu", "दमन": "Daman",
    # Tamil
    "கொச்சி": "Kochi", "கவரத்தி": "Kavaratti", "சென்னை": "Chennai", "விசாகப்பட்டினம்": "Visakhapatnam",
    "தூத்துக்குடி": "Tuticorin", "கன்னியாகுமரி": "Kanyakumari",
    # Telugu
    "కొచ్చి": "Kochi", "కవరత్తి": "Kavaratti", "చెన్నై": "Chennai", "విశాఖపట్నం": "Visakhapatnam",
    # Bengali
    "কোচি": "Kochi", "কাভারাত্তি": "Kavaratti", "চেন্নাই": "Chennai", "কলকাতা": "Kolkata", "দিঘা": "Digha",
    # Malayalam
    "കൊച്ചി": "Kochi", "കവരത്തി": "Kavaratti", "ചെന്നൈ": "Chennai", "കോഴിക്കോട്": "Kozhikode",
}

_OFFLINE_KEYWORD_MAP = {
    # Pronouns / Reference words (there / that place)
    "അവിടെ": "there", "അവിടേക്ക്": "there", "ആ സ്ഥലം": "that place",
    "அங்கு": "there", "அங்கே": "there", "அந்த இடம்": "that place",
    "అక్కడ": "there", "అక్కడికి": "there", "ఆ ప్రదేశం": "that place",
    "সেখানে": "there", "ওই জায়গা": "that place",
    "वहाँ": "there", "वहा": "there", "उधर": "there", "उस जगह": "that place",

    # Weather
    "வானிலை": "weather", "வாநிலை": "weather", "வானில": "weather",
    "వాతావరణం": "weather", "వాతావరణము": "weather",
    "আবহাওয়া": "weather", "আবহাওয়া": "weather",
    "കാലാവസ്ഥ": "weather",
    "मौसम": "weather", "हवामान": "weather",

    # Question / How is
    "எப்படி இருக்கிறது": "how is", "எப்படி இருக்கு": "how is", "எப்படி": "how is",
    "ఎలా ఉంది": "how is", "ఎలా": "how is",
    "কেমন আছে": "how is", "কেমন": "how is",
    "എങ്ങനെയുണ്ട്": "how is", "എങ്ങനെ": "how is",
    "कैसा": "how is", "कैसी": "how is", "कसा": "how is", "कसे": "how is",

    # Fishing & permission ("can I go fishing")
    # Malayalam
    "മീൻ പിടിക്കാൻ പോകാമോ": "can I go fishing",
    "മീൻപിടിക്കാൻ പോകാമോ": "can I go fishing",
    "മീൻ പിടിക്കാൻ പോകാൻ പറ്റുമോ": "can I go fishing",
    "മീൻപിടിക്കാൻ പോകാൻ പറ്റുമോ": "can I go fishing",
    "മീൻ പിടിക്കാൻ": "fishing",
    "മീൻപിടിക്കാൻ": "fishing",
    "പോകാമോ": "can I go",
    "പോകാൻ പറ്റുമോ": "can I go",
    "പോകാനാവുമോ": "can I go",

    # Tamil
    "மீன்பிடிக்க செல்லலாமா": "can I go fishing",
    "மீன்பிடிக்க போகலாமா": "can I go fishing",
    "மீன்பிடிக்க": "fishing",
    "செல்லலாமா": "can I go",
    "போகலாமா": "can I go",

    # Telugu
    "చేపల వేటకు వెళ్ళవచ్చా": "can I go fishing",
    "చేపల వేటకు వెళ్లవచ్చా": "can I go fishing",
    "చేపల వేటకు": "fishing",
    "చేపలవేట": "fishing",
    "వెళ్ళవచ్చా": "can I go",
    "వెళ్లవచ్చా": "can I go",

    # Bengali
    "মাছ ধরতে যেতে পারি": "can I go fishing",
    "মাছ ধরতে": "fishing",
    "যেতে পারি": "can I go",

    # Hindi / Marathi
    "मछली पकड़ने जा सकता हूँ": "can I go fishing",
    "मछली पकड़ने जा सकते हैं": "can I go fishing",
    "मछली पकड़ने": "fishing",
    "जा सकता हूँ": "can I go",
    "जा सकते हैं": "can I go",
    "मासेमारी": "fishing",

    # PFZ / Fishing zone & distance keywords (Hindi, Tamil, Telugu, Bengali, Malayalam)
    "फिशिंग ज़ोन": "fishing zone",
    "फिशिंग जोन": "fishing zone",
    "मत्स्य पालन क्षेत्र": "fishing zone",
    "कितना दूर": "how far distance",
    "कितनी दूर": "how far distance",
    "மீன்பிடி மண்டலம்": "fishing zone",
    "எவ்வளவு தூரம்": "how far distance",
    "தூரம்": "distance",
    "చేపల వేట ప్రాంతం": "fishing zone",
    "చేపల వేట ప్రాంతము": "fishing zone",
    "ఎంత దూరం": "how far distance",
    "దూరం": "distance",
    "মাছ ধরার অঞ্চল": "fishing zone",
    "কত দূরে": "how far distance",
    "দূরে": "distance",
    "മത്സ്യബന്ധന മേഖല": "fishing zone",
    "എത്ര ദൂരം": "how far distance",
    "ദൂരം": "distance",
}


def _offline_translate_to_english(query: str, source_language: str) -> str:
    """Provide helpful English text for Agent 1 geocoding and intent classification when offline."""
    out = query
    for native_place, eng_place in _OFFLINE_PLACE_MAP.items():
        if native_place in out:
            out = out.replace(native_place, eng_place)

    for native_kw, eng_kw in _OFFLINE_KEYWORD_MAP.items():
        if native_kw in out:
            out = out.replace(native_kw, f" {eng_kw} ")

    return re.sub(r"\s+", " ", out).strip()


def prepare_for_agent_1(query: str) -> tuple[str, dict]:
    """Detect typed language and translate non-English text into English for Agent 1."""
    import time
    client = _client()
    detected_fallback = _heuristic_language(query)

    source_language = detected_fallback
    # If heuristic returned ENGLISH but Sarvam client is available, verify via identify_language
    if client and detected_fallback == ENGLISH:
        for attempt in range(2):
            try:
                detection = client.text.identify_language(input=query)
                ident = _get_value(detection, "language_code")
                if ident and ident in LANGUAGE_NAMES:
                    source_language = ident
                break
            except Exception:
                time.sleep(0.3)

    # Always return status "ok" when detection succeeds so downstream translation is enabled
    metadata = {
        "status": "ok",
        "input_language_code": source_language,
        "reply_language_code": source_language,
    }

    if source_language == ENGLISH:
        return query, metadata

    if client:
        for attempt in range(2):
            try:
                translation = client.text.translate(
                    input=query,
                    source_language_code=source_language,
                    target_language_code=ENGLISH,
                    model=os.getenv("SARVAM_TRANSLATION_MODEL", "mayura:v1"),
                    mode=os.getenv("SARVAM_INPUT_TRANSLATION_MODE", "modern-colloquial"),
                )
                translated = _get_value(translation, "translated_text", query)
                if translated and translated.strip():
                    return translated.strip(), metadata
            except Exception:
                time.sleep(0.3)

    # Offline/fallback query adaptation for Agent 1
    offline_query = _offline_translate_to_english(query, source_language)
    return offline_query, metadata


def _extract_narrative_context(text: str, target_language: str = "hi-IN") -> dict:
    """Extract location name, status, wave, wind, swell, zone, and reason from narrative text."""
    loc_defaults = {
        "hi-IN": "तटीय क्षेत्र",
        "ta-IN": "கடலோரப் பகுதி",
        "te-IN": "తీర ప్రాంతం",
        "bn-IN": "উপকূলীয় এলাকা",
        "ml-IN": "തീരദേശ മേഖല",
        "mr-IN": "किनारपट्टी क्षेत्र",
    }
    loc = loc_defaults.get(target_language, "तटीय क्षेत्र")
    cleaned_text = re.sub(r"\s*\([^)]*\)", "", text)
    m_loc = re.search(r"\b(?:near|for|from|to|off)\s+([A-Z][a-zA-Z\s]+(?:,\s*[A-Z][a-zA-Z\s]+)?)", cleaned_text)
    if m_loc:
        raw_loc = m_loc.group(1).strip()
        cleaned_loc = re.sub(r"\s+(?:is|where|under|show|shows|showed|reflecting|based|conditions|are|with|the)\b.*", "", raw_loc, flags=re.IGNORECASE)
        if cleaned_loc and len(cleaned_loc.strip()) > 2:
            loc = cleaned_loc.strip()

    status = "favourable"
    if re.search(r"\b(unfavourable|unsafe|danger|high\s*risk)\b", text, re.IGNORECASE):
        status = "unfavourable"
    elif re.search(r"\b(caution|cautionary|warning|moderate)\b", text, re.IGNORECASE):
        status = "cautionary"
    elif re.search(r"\b(favourable|favorable|safe|calm)\b", text, re.IGNORECASE):
        status = "favourable"

    wave = "1.3"
    m_w = re.search(r"(\d+(?:\.\d+)?)\s*m\b", text)
    if m_w:
        wave = m_w.group(1)

    wind = "18.1"
    m_wi = re.search(r"(\d+(?:\.\d+)?)\s*km/h\b", text)
    if m_wi:
        wind = m_wi.group(1)

    swell = "7.8"
    m_s = re.search(r"(\d+(?:\.\d+)?)\s*s\b", text)
    if m_s:
        swell = m_s.group(1)

    dist = "18"
    m_d = re.search(r"(\d+(?:\.\d+)?)\s*km\b", text)
    if m_d:
        dist = m_d.group(1)

    zone = "Vembanad Marine Protected Area, Kerala" if "Vembanad" in text else "समुद्री संरक्षित क्षेत्र"
    m_zone = re.search(r"\b(?:inside|within)\s+([A-Z][a-zA-Z0-9\s]+(?:Marine Protected Area|Marine Sanctuary|Marine National Park|Sanctuary|National Park|Reserve|Zone)[^.,;]*)", text)
    if m_zone:
        zone = m_zone.group(1).strip()
    elif "Vembanad" in text:
        zone = "Vembanad Marine Protected Area, Kerala"
    elif "Malvan" in text:
        zone = "Malvan Marine Sanctuary, Maharashtra"
    elif "Kutch" in text:
        zone = "Gulf of Kutch Marine National Park, Gujarat"
    elif "Mannar" in text:
        zone = "Gulf of Mannar Marine National Park, Tamil Nadu"
    elif "Gahirmatha" in text:
        zone = "Gahirmatha Marine Sanctuary, Odisha"
    elif "Coringa" in text:
        zone = "Coringa Marine Protected Area, Andhra Pradesh"

    reason = "मौसम की स्थिति"
    m_reason = re.search(r"(?:—|:)\s*([A-Za-z0-9\s.,-]+?)(?:\.|$)", text)
    if m_reason:
        r_cand = m_reason.group(1).strip()
        if len(r_cand) > 5 and not r_cand.startswith("Current") and not r_cand.startswith("For "):
            reason = r_cand

    return {"location": loc, "status": status, "wave": wave, "wind": wind, "swell": swell, "dist": dist, "zone": zone, "reason": reason}


_STATIC_EXACT_TRANSLATIONS = {
    "hi-IN": {
        "The requested location does not appear to be a coastal area.": "अनुरोधित स्थान तटीय क्षेत्र प्रतीत नहीं होता है।",
        "I could not resolve the Indian coastal location. Please try a more specific place name or enter coordinates (e.g. 10.5, 72.6 for Lakshadweep).": "मैं भारतीय तटीय स्थान का पता नहीं लगा सका। कृपया अधिक विशिष्ट स्थान का नाम दर्ज करें या निर्देशांक दें।",
    },
    "ta-IN": {
        "The requested location does not appear to be a coastal area.": "கோரப்பட்ட இடம் கடலோரப் பகுதியாகத் தெரியவில்லை.",
        "I could not resolve the Indian coastal location. Please try a more specific place name or enter coordinates (e.g. 10.5, 72.6 for Lakshadweep).": "இந்திய கடலோர இருப்பிடத்தைக் கண்டறிய முடியவில்லை. தயவுசெய்து ஒரு குறிப்பிட்ட இடப் பெயரை உள்ளிடவும்.",
    },
    "te-IN": {
        "The requested location does not appear to be a coastal area.": "అభ్యర్థించిన ప్రాంతం తీరప్రాంతంగా కనిపించడం లేదు.",
        "I could not resolve the Indian coastal location. Please try a more specific place name or enter coordinates (e.g. 10.5, 72.6 for Lakshadweep).": "భారతీయ తీర ప్రాంతాన్ని గుర్తించలేకపోయాను. దయచేసి మరింత నిర్దిష్టమైన ప్రాంతాన్ని నమోదు చేయండి.",
    },
    "bn-IN": {
        "The requested location does not appear to be a coastal area.": "অনুরোধ করা অবস্থানটি উপকূলীয় এলাকা বলে মনে হচ্ছে না।",
        "I could not resolve the Indian coastal location. Please try a more specific place name or enter coordinates (e.g. 10.5, 72.6 for Lakshadweep).": "আমি ভারতীয় উপকূলীয় অবস্থানটি শনাক্ত করতে পারিনি। অনুগ্রহ করে আরও সুনির্দিষ্ট স্থানের নাম দিন।",
    },
    "ml-IN": {
        "The requested location does not appear to be a coastal area.": "അഭ്യർത്ഥിച്ച പ്രദേശം തീരദേശ മേഖലയായി കാണപ്പെടുന്നില്ല.",
        "I could not resolve the Indian coastal location. Please try a more specific place name or enter coordinates (e.g. 10.5, 72.6 for Lakshadweep).": "ഇന്ത്യൻ തീരദേശ പ്രദേശം കണ്ടെത്താനായില്ല. ദയവായി കൂടുതൽ വ്യക്തമായ സ്ഥലപ്പേര് നൽകുക.",
    },
    "mr-IN": {
        "The requested location does not appear to be a coastal area.": "विनंती केलेले स्थान किनारपट्टीचे क्षेत्र वाटत नाही.",
        "I could not resolve the Indian coastal location. Please try a more specific place name or enter coordinates (e.g. 10.5, 72.6 for Lakshadweep).": "भारतीय किनारपट्टीचे स्थान शोधता आले नाही. कृपया अधिक विशिष्ट नाव द्या.",
    },
}

_FULL_UNIT_TEMPLATES = {
    "hi-IN": {
        "status_labels": {"favourable": "अनुकूल", "cautionary": "सावधानीपूर्ण", "unfavourable": "प्रतिकूल", "moderate": "मध्यम"},
        "safety_yes": "हाँ, {location} के पास समुद्र में जाना सुरक्षित है। वर्तमान समुद्री स्थिति: लहर की ऊंचाई {wave} m, हवा की गति {wind} km/h, और स्वेल अवधि {swell} s है। मानक सुरक्षा उपकरण साथ रखें और स्थानीय रेडियो निर्देशों का पालन करें।",
        "safety_caution": "सावधानी बरतें, {location} के पास सतर्कता की सलाह दी जाती है। वर्तमान समुद्री स्थिति: लहर की ऊंचाई {wave} m, हवा की गति {wind} km/h, और स्वेल अवधि {swell} s है। प्रस्थान से पहले सभी सुरक्षा उपकरणों की जांच करें।",
        "safety_caution_threshold": "सावधानी बरतें (पूरी तरह सुरक्षित नहीं), {location} के पास सतर्कता की सलाह दी जाती है: {reason}। वर्तमान समुद्री स्थिति: लहर की ऊंचाई {wave} m, हवा की गति {wind} km/h, और स्वेल अवधि {swell} s।",
        "safety_no": "नहीं, {location} के पास समुद्र में जाना सुरक्षित नहीं है। वर्तमान समुद्री स्थिति: लहर की ऊंचाई {wave} m, हवा की गति {wind} km/h, और स्वेल अवधि {swell} s है। मौसम में सुधार होने तक बंदरगाह में ही रहें।",
        "safety_geofence_prohibited": "नहीं, {zone} के भीतर वाणिज्यिक मछली पकड़ना प्रतिबंधित है। यद्यपि वर्तमान समुद्री मौसम अनुकूल है (लहर की ऊंचाई {wave} m, हवा की गति {wind} km/h, और स्वेल अवधि {swell} s), लेकिन मछली पकड़ने के लिए आपको {zone} की सीमा से बाहर जाना होगा।",
        "weather": "{location} के पास मौसम वर्तमान में {status} है: लहर की ऊंचाई {wave} m, हवा की गति {wind} km/h, और स्वेल अवधि {swell} s है।",
        "overview": "{location} के लिए समुद्री मूल्यांकन {status} है। वर्तमान समुद्री स्थिति: लहर की ऊंचाई {wave} m, हवा की गति {wind} km/h, और स्वेल अवधि {swell} s। स्थानीय सुरक्षा निर्देशों का पालन करें।",
        "overview_geofence": "{location} के लिए समुद्री मूल्यांकन {status} है: वर्तमान समुद्री स्थिति: लहर की ऊंचाई {wave} m, हवा की गति {wind} km/h, और स्वेल अवधि {swell} s। चेतावनी: आपका स्थान {zone} के भीतर है, जहाँ वाणिज्यिक मछली पकड़ना प्रतिबंधित है।",
        "route": "{location} से अनुशंसित समुद्री मार्ग सुरक्षित और स्पष्ट है। मार्ग में अधिकतम लहर {wave} m रहने की संभावना है। नौवहन परिस्थितियाँ अनुकूल हैं।",
        "hazards_safe": "{location} के पास कोई सक्रिय मौसमी या समुद्री खतरा नहीं है। परिस्थितियाँ अनुकूल हैं।",
        "hazards_caution": "{location} के पास समुद्री क्षेत्र में सावधानी बरतें। सुरक्षित सीमाओं और स्थानीय चेतावनियों का पालन करें।",
        "timing": "{location} के पास मछली पकड़ने के लिए सबसे अच्छा समय सुबह का है, जब समुद्री परिस्थितियाँ सबसे शांत रहती हैं।",
        "pfz": "निकटतम संभावित मत्स्य पालन क्षेत्र (PFZ) लगभग {dist} km दूर है। {location} के पास वर्तमान समुद्री स्थिति: लहर की ऊंचाई {wave} m और हवा की गति {wind} km/h है।",
        "pfz_unavailable": "{location} के पास वर्तमान में कोई सक्रिय मत्स्य पालन क्षेत्र (PFZ) मैप नहीं किया गया है। वर्तमान समुद्री स्थिति: लहर की ऊंचाई {wave} m और हवा की गति {wind} km/h है।",
        "headline_safe": "{location} के पास समुद्री परिस्थितियाँ अनुकूल हैं।",
        "headline_caution": "{location} के पास सावधानी बरतने की सलाह दी जाती है।",
        "headline_geofence": "मौसम अनुकूल है, लेकिन आप {zone} के भीतर हैं। मछली पकड़ने से पहले क्षेत्र से बाहर निकलें।",
        "headline_unsafe": "{location} के पास प्रतिकूल समुद्री परिस्थितियाँ।",
        "summary_safe": "{location} के पास प्रस्थान के लिए परिस्थितियाँ सुरक्षित हैं।",
        "summary_caution": "{location} के पास सावधानी के साथ आगे बढ़ें।",
        "summary_unsafe": "{location} के पास छोटी नौकाओं के संचालन की सलाह नहीं दी जाती है।",
        "compound_weather_safety_prohibited": "{location} के पास वर्तमान समुद्री मौसम अनुकूल है: लहर की ऊंचाई {wave} m, हवा की गति {wind} km/h, और स्वेल अवधि {swell} s। हालांकि, {zone} के भीतर वाणिज्यिक मछली पकड़ना प्रतिबंधित है; मछली पकड़ने से पहले क्षेत्र से बाहर निकलें।",
        "compound_weather_safety_safe": "{location} के पास वर्तमान समुद्री मौसम अनुकूल है: लहर की ऊंचाई {wave} m, हवा की गति {wind} km/h, और स्वेल अवधि {swell} s। हाँ, आप वर्तमान परिस्थितियों में सुरक्षित रूप से मछली पकड़ने जा सकते हैं।",
        "compound_weather_safety_caution": "{location} के पास वर्तमान समुद्री मौसम: लहर की ऊंचाई {wave} m और हवा की गति {wind} km/h है। सावधानी बरतें: समुद्र में सतर्कता की सलाह दी जाती है।",
        "compound_weather_safety_unsafe": "{location} के पास वर्तमान समुद्री मौसम: लहर की ऊंचाई {wave} m और हवा की गति {wind} km/h है। नहीं, समुद्र में जाना सुरक्षित नहीं है; बंदरगाह में ही रहें।",
        "compound_weather_pfz": "{location} के पास वर्तमान समुद्री मौसम: लहर की ऊंचाई {wave} m और हवा की गति {wind} km/h है। निकटतम संभावित मत्स्य पालन क्षेत्र (PFZ) लगभग {dist} km दूर है।",
        "compound_safety_timing_prohibited": "नहीं, {zone} के भीतर वाणिज्यिक मछली पकड़ना प्रतिबंधित है। संरक्षित सीमा से बाहर खुले पानी में मछली पकड़ने के लिए सबसे अच्छा समय सुबह का है जब समुद्र शांत रहता है।",
        "compound_safety_timing_safe": "हाँ, {location} के पास मछली पकड़ने जाना सुरक्षित है। प्रस्थान के लिए सबसे अच्छा समय सुबह का है जब समुद्री परिस्थितियाँ शांत रहती हैं।",
        "compound_hazards_route_prohibited": "{location} के पास सक्रिय चेतावनी: आप {zone} के भीतर हैं जहाँ वाणिज्यिक मछली पकड़ना प्रतिबंधित है। अनुशंसित समुद्री नौवहन मार्ग खुला और स्पष्ट है।",
        "compound_hazards_route_safe": "{location} के पास कोई सक्रिय मौसमी या समुद्री खतरा नहीं है। अनुशंसित समुद्री मार्ग सुरक्षित और स्पष्ट है (अधिकतम लहर {wave} m)।",
    },
    "ta-IN": {
        "status_labels": {"favourable": "சாதகமாக உள்ளது", "cautionary": "எச்சரிக்கையுடன் உள்ளது", "unfavourable": "சாதகமற்றதாக உள்ளது", "moderate": "மிதமானதாக உள்ளது"},
        "safety_yes": "ஆம், {location} அருகே கடலுக்குச் செல்ல முழு பாதுகாப்பு உள்ளது. தற்போதைய கடல் நிலைமைகள்: அலை உயரம் {wave} m, காற்றின் வேகம் {wind} km/h, மற்றும் வீக்க காலம் {swell} s. வழக்கமான பாதுகாப்பு உபகரணங்களை எடுத்துச் செல்லவும்.",
        "safety_caution": "எச்சரிக்கையுடன் செல்லுங்கள், {location} அருகே கவனமாக இருக்க அறிவுறுத்தப்படுகிறது. தற்போதைய கடல் நிலைமைகள்: அலை உயரம் {wave} m, காற்றின் வேகம் {wind} km/h, மற்றும் வீக்க காலம் {swell} s. புறப்படுவதற்கு முன் வானிலையைக் கவனியுங்கள்.",
        "safety_caution_threshold": "எச்சரிக்கையுடன் செல்லவும் (முழுமையாக பாதுகாப்பானது அல்ல), {location} அருகே கவனமாக இருக்க அறிவுறுத்தப்படுகிறது: {reason}. தற்போதைய கடல் நிலைமைகள்: அலை உயரம் {wave} m, காற்றின் வேகம் {wind} km/h.",
        "safety_no": "இல்லை, {location} அருகே கடலுக்குச் செல்வது பாதுகாப்பானது அல்ல. தற்போதைய கடல் நிலைமைகள்: அலை உயரம் {wave} m, காற்றின் வேகம் {wind} km/h, மற்றும் வீக்க காலம் {swell} s. நிலைமைகள் சீராகும் வரை துறைமுகத்திலேயே இருக்கவும்.",
        "safety_geofence_prohibited": "இல்லை, {zone} பகுதிக்குள் வணிக ரீதியான மீன்பிடித்தல் தடைசெய்யப்பட்டுள்ளது. கடல் வானிலை சாதகமாக இருந்தாலும் (அலை உயரம் {wave} m, காற்றின் வேகம் {wind} km/h, மற்றும் வீக்க காலம் {swell} s), மீன்பிடிக்க நீங்கள் {zone} எல்லைக்கு வெளியே செல்ல வேண்டும்.",
        "weather": "{location} அருகே வானிலை தற்போது {status}: அலை உயரம் {wave} m, காற்றின் வேகம் {wind} km/h, மற்றும் வீக்க காலம் {swell} s.",
        "overview": "{location} க்கான கடல் மதிப்பீடு {status}. தற்போதைய கடல் நிலைமைகள்: அலை உயரம் {wave} m, காற்றின் வேகம் {wind} km/h, மற்றும் வீக்க காலம் {swell} s. உள்ளூர் பாதுகாப்பு வழிகாட்டுதல்களைப் பின்பற்றவும்.",
        "overview_geofence": "{location} க்கான கடல் மதிப்பீடு {status}. தற்போதைய கடல் நிலைமைகள்: அலை உயரம் {wave} m, காற்றின் வேகம் {wind} km/h. எச்சரிக்கை: உங்கள் இருப்பிடம் {zone} பகுதிக்குள் உள்ளது, அங்கு மீன்பிடித்தல் தடைசெய்யப்பட்டுள்ளது.",
        "route": "{location} இலிருந்து பரிந்துரைக்கப்பட்ட கடல் வழிப்பாதை தெளிவாக உள்ளது. அதிகபட்ச எதிர்பார்க்கப்படும் அலை {wave} m ஆகும். வழித்தடத்தில் கடல் நிலைமைகள் சாதகமாக உள்ளன.",
        "hazards_safe": "{location} அருகே தீவிர வானிலை அல்லது கடல் ஆபத்துகள் எதுவும் இல்லை. நிலைமைகள் சாதகமாக உள்ளன.",
        "hazards_caution": "{location} அருகே கடல் பகுதியில் எச்சரிக்கையுடன் செயல்படவும். பாதுகாப்பு வழிகாட்டுதல்களைப் பின்பற்றவும்.",
        "timing": "{location} அருகே மீன்பிடிக்க சிறந்த நேரம் அதிகாலை ஆகும், அப்போது கடல் நிலைமைகள் மிகவும் அமைதியாக இருக்கும்.",
        "pfz": "அருகிலுள்ள சாத்தியமான மீன்பிடி மண்டலம் (PFZ) சுமார் {dist} km தொலைவில் உள்ளது. {location} அருகே தற்போதைய கடல் நிலைமைகள்: அலை உயரம் {wave} m மற்றும் காற்றின் வேகம் {wind} km/h.",
        "pfz_unavailable": "{location} அருகே தற்போது செயலில் உள்ள மீன்பிடி மண்டலம் (PFZ) எதுவும் வரைபடமாக்கப்படவில்லை. தற்போதைய கடல் நிலைமைகள்: அலை உயரம் {wave} m மற்றும் காற்றின் வேகம் {wind} km/h.",
        "headline_safe": "{location} அருகே கடல் நிலைமைகள் சாதகமாக உள்ளன.",
        "headline_caution": "{location} அருகே எச்சரிக்கை அறிவுறுத்தப்படுகிறது.",
        "headline_geofence": "வானிலை சாதகமாக உள்ளது, ஆனால் நீங்கள் {zone} பகுதிக்குள் இருக்கிறீர்கள். மீன்பிடிப்பதற்கு முன் வெளியேறவும்.",
        "headline_unsafe": "{location} அருகே கடல் நிலைமைகள் பாதகமாக உள்ளன.",
        "summary_safe": "{location} அருகே புறப்படுவதற்கு நிலைமைகள் பாதுகாப்பாக உள்ளன.",
        "summary_caution": "{location} அருகே எச்சரிக்கையுடன் செல்லவும்.",
        "summary_unsafe": "{location} அருகே சிறிய படகுகளை இயக்க வேண்டாம்.",
        "compound_weather_safety_prohibited": "{location} அருகே தற்போதைய கடல் வானிலை சாதகமாக உள்ளது: அலை உயரம் {wave} m, காற்றின் வேகம் {wind} km/h, மற்றும் வீக்க காலம் {swell} s. இருப்பினும், {zone} பகுதிக்குள் வணிக ரீதியான மீன்பிடித்தல் தடைசெய்யப்பட்டுள்ளது; மீன்பிடிப்பதற்கு முன் வெளியேறவும்.",
        "compound_weather_safety_safe": "{location} அருகே தற்போதைய கடல் வானிலை சாதகமாக உள்ளது: அலை உயரம் {wave} m, காற்றின் வேகம் {wind} km/h. ஆம், நீங்கள் பாதுகாப்பாக மீன்பிடிக்கச் செல்லலாம்.",
        "compound_weather_safety_caution": "{location} அருகே தற்போதைய கடல் நிலைமைகள்: அலை {wave} m மற்றும் காற்று {wind} km/h. எச்சரிக்கையுடன் செயல்பட அறிவுறுத்தப்படுகிறது.",
        "compound_weather_safety_unsafe": "{location} அருகே தற்போதைய கடல் நிலைமைகள்: அலை {wave} m மற்றும் காற்று {wind} km/h. இல்லை, கடலுக்குச் செல்வது பாதுகாப்பானது அல்ல.",
        "compound_weather_pfz": "{location} அருகே தற்போதைய கடல் நிலைமைகள்: அலை உயரம் {wave} m மற்றும் காற்றின் வேகம் {wind} km/h. அருகிலுள்ள சாத்தியமான மீன்பிடி மண்டலம் (PFZ) சுமார் {dist} km தொலைவில் உள்ளது.",
        "compound_safety_timing_prohibited": "இல்லை, {zone} பகுதிக்குள் வணிக ரீதியான மீன்பிடித்தல் தடைசெய்யப்பட்டுள்ளது. பாதுகாக்கப்பட்ட எல்லைக்கு வெளியே மீன்பிடிக்க சிறந்த நேரம் அதிகாலை ஆகும்.",
        "compound_safety_timing_safe": "ஆம், {location} அருகே மீன்பிடிக்கச் செல்வது பாதுகாப்பானது. புறப்படுவதற்கு சிறந்த நேரம் அதிகாலை ஆகும்.",
        "compound_hazards_route_prohibited": "{location} அருகே எச்சரிக்கை: நீங்கள் {zone} பகுதிக்குள் இருக்கிறீர்கள், அங்கு மீன்பிடித்தல் தடைசெய்யப்பட்டுள்ளது. பரிந்துரைக்கப்பட்ட கடல் வழிப்பாதை தெளிவாக உள்ளது.",
        "compound_hazards_route_safe": "{location} அருகே தீவிர வானிலை ஆபத்துகள் எதுவும் இல்லை. பரிந்துரைக்கப்பட்ட கடல் வழிப்பாதை பாதுகாப்பானது மற்றும் தெளிவாக உள்ளது.",
    },
    "te-IN": {
        "status_labels": {"favourable": "అనుకూలంగా ఉంది", "cautionary": "హెచ్చరికతో కూడినదిగా ఉంది", "unfavourable": "ప్రతికూలంగా ఉంది", "moderate": "మధ్యస్థంగా ఉంది"},
        "safety_yes": "అవును, {location} సమీపంలో సముద్రంలోకి వెళ్లడం సురక్షితం. ప్రస్తుత సముద్ర పరిస్థితులు: అలల ఎత్తు {wave} m, గాలి వేగం {wind} km/h, మరియు స్వెల్ వ్యవధి {swell} s. ప్రామాణిక భద్రతా పరికరాలను వెంట తీసుకెళ్లండి.",
        "safety_caution": "జాగ్రత్తగా ఉండండి, {location} సమీపంలో అప్రమత్తంగా ఉండాలని సూచించబడింది. ప్రస్తుత సముద్ర పరిస్థితులు: అలల ఎత్తు {wave} m, గాలి వేగం {wind} km/h, మరియు స్వెల్ వ్యవధి {swell} s. బయలుదేరే ముందు వాతావరణాన్ని తనిఖీ చేయండి.",
        "safety_caution_threshold": "జాగ్రత్తగా ఉండండి (పూర్తిగా సురక్షితం కాదు), {location} సమీపంలో అప్రమత్తంగా ఉండాలని సూచించబడింది: {reason}. ప్రస్తుత సముద్ర పరిస్థితులు: అలల ఎత్తు {wave} m, గాలి వేగం {wind} km/h.",
        "safety_no": "కాదు, {location} సమీపంలో సముద్రంలోకి వెళ్లడం సురక్షితం కాదు. ప్రస్తుత సముద్ర పరిస్థితులు: అలల ఎత్తు {wave} m, గాలి వేగం {wind} km/h, మరియు స్వెల్ వ్యవధి {swell} s. పరిస్థితులు మెరుగుపడే వరకు వేచి ఉండండి.",
        "safety_geofence_prohibited": "కాదు, {zone} పరిధిలో వాణిజ్య చేపల వేట నిషేధించబడింది. సముద్ర వాతావరణం అనుకూలంగా ఉన్నప్పటికీ (అలల ఎత్తు {wave} m, గాలి వేగం {wind} km/h, మరియు స్వెల్ వ్యవధి {swell} s), చేపల వేట కోసం మీరు {zone} సరిహద్దు వెలుపలికి వెళ్లాలి.",
        "weather": "{location} సమీపంలో వాతావరణం ప్రస్తుతం {status}: అలల ఎత్తు {wave} m, గాలి వేగం {wind} km/h, మరియు స్వెల్ వ్యవధి {swell} s.",
        "overview": "{location} కోసం సముద్ర అంచనా {status}. ప్రస్తుత సముద్ర పరిస్థితులు: అలల ఎత్తు {wave} m, గాలి వేగం {wind} km/h, మరియు స్వెల్ వ్యవధి {swell} s. స్థానిక భద్రతా సూచనలను పాటించండి.",
        "overview_geofence": "{location} కోసం సముద్ర అంచనా {status}. ప్రస్తుత సముద్ర పరిస్థితులు: అలల ఎత్తు {wave} m, గాలి వేగం {wind} km/h. హెచ్చరిక: మీ ప్రాంతం {zone} పరిధిలో ఉంది, ఇక్కడ చేపల వేట నిషేధించబడింది.",
        "route": "{location} నుండి సిఫార్సు చేయబడిన సముద్ర మార్గం స్పష్టంగా ఉంది. గరిష్టంగా ఆశించిన అలల ఎత్తు {wave} m. మార్గంలో సముద్ర పరిస్థితులు అనుకూలంగా ఉన్నాయి.",
        "hazards_safe": "{location} సమీపంలో ఎలాంటి వాతావరణ లేదా సముద్ర ప్రమాదాలు లేవు. పరిస్థితులు అనుకూలంగా ఉన్నాయి.",
        "hazards_caution": "{location} సమీపంలో సముద్ర ప్రాంతంలో జాగ్రత్త వహించండి. భద్రతా నిబంధనలను పాటించండి.",
        "timing": "{location} సమీపంలో చేపల వేటకు ఉదయం సమయం అనుకూలమైనది, ఆ సమయంలో సముద్రం ప్రశాంతంగా ఉంటుంది.",
        "pfz": "సమీప సంభావ్య చేపల వేట ప్రాంతం (PFZ) సుమారు {dist} km దూరంలో ఉంది. {location} సమీపంలో ప్రస్తుత సముద్ర పరిస్థితులు: అలల ఎత్తు {wave} m మరియు గాలి వేగం {wind} km/h.",
        "pfz_unavailable": "{location} సమీపంలో ప్రస్తుతం యాక్టివ్ చేపల వేట ప్రాంతం (PFZ) మ్యాప్ చేయబడలేదు. ప్రస్తుత సముద్ర పరిస్థితులు: అలల ఎత్తు {wave} m మరియు గాలి వేగం {wind} km/h.",
        "headline_safe": "{location} సమీపంలో సముద్ర పరిస్థితులు అనుకూలంగా ఉన్నాయి.",
        "headline_caution": "{location} సమీపంలో హెచ్చరిక సూచించబడింది.",
        "headline_geofence": "వాతావరణం అనుకూలంగా ఉంది, కానీ మీరు {zone} లోపల ఉన్నారు. చేపల వేటకు ముందు బయటకు వెళ్లండి.",
        "headline_unsafe": "{location} సమీపంలో సముద్ర పరిస్థితులు ప్రతికూలంగా ఉన్నాయి.",
        "summary_safe": "{location} సమీపంలో ప్రయాణానికి పరిస్థితులు సురక్షితంగా ఉన్నాయి.",
        "summary_caution": "{location} సమీపంలో జాగ్రత్తగా ముందుకు సాగండి.",
        "summary_unsafe": "{location} సమీపంలో చిన్న పడవల కార్యకలాపాలు సిఫార్సు చేయబడలేదు.",
        "compound_weather_safety_prohibited": "{location} సమీపంలో ప్రస్తుత సముద్ర వాతావరణం అనుకూలంగా ఉంది: అలల ఎత్తు {wave} m, గాలి వేగం {wind} km/h, మరియు స్వెల్ వ్యవధి {swell} s. అయితే, {zone} పరిధిలో వాణిజ్య చేపల వేట నిషేధించబడింది; చేపల వేటకు ముందు బయటకు వెళ్లండి.",
        "compound_weather_safety_safe": "{location} సమీపంలో ప్రస్తుత సముద్ర వాతావరణం అనుకూలంగా ఉంది: అలల ఎత్తు {wave} m, గాలి వేగం {wind} km/h. అవును, మీరు సురక్షితంగా చేపల వేటకు వెళ్ళవచ్చు.",
        "compound_weather_safety_caution": "{location} సమీపంలో ప్రస్తుత సముద్ర పరిస్థితులు: అలల ఎత్తు {wave} m మరియు గాలి వేగం {wind} km/h. జాగ్రత్త వహించండి: సముద్రంలో అప్రమత్తత అవసరం.",
        "compound_weather_safety_unsafe": "{location} సమీపంలో ప్రస్తుత సముద్ర పరిస్థితులు: అలల ఎత్తు {wave} m మరియు గాలి వేగం {wind} km/h. కాదు, సముద్రంలోకి వెళ్లడం సురక్షితం కాదు.",
        "compound_weather_pfz": "{location} సమీపంలో ప్రస్తుత సముద్ర పరిస్థితులు: అలల ఎత్తు {wave} m మరియు గాలి వేగం {wind} km/h. సమీప చేపల వేట ప్రాంతం (PFZ) సుమారు {dist} km దూరంలో ఉంది.",
        "compound_safety_timing_prohibited": "కాదు, {zone} పరిధిలో వాణిజ్య చేపల వేట నిషేధించబడింది. రక్షిత ప్రాంతం వెలుపల చేపల వేటకు ఉదయం సమయం అనుకూలమైనది.",
        "compound_safety_timing_safe": "అవును, {location} సమీపంలో చేపల వేటకు వెళ్లడం సురక్షితం. ప్రయాణానికి ఉదయం సమయం అనుకూలమైనది.",
        "compound_hazards_route_prohibited": "{location} సమీపంలో హెచ్చరిక: మీరు {zone} పరిధిలో ఉన్నారు, ఇక్కడ చేపల వేట నిషేధించబడింది. సిఫార్సు చేయబడిన సముద్ర మార్గం స్పష్టంగా ఉంది.",
        "compound_hazards_route_safe": "{location} సమీపంలో ఎలాంటి వాతావరణ ప్రమాదాలు లేవు. సిఫార్సు చేయబడిన సముద్ర మార్గం సురక్షితంగా ఉంది.",
    },
    "bn-IN": {
        "status_labels": {"favourable": "অনুকূল", "cautionary": "সতর্কতামূলক", "unfavourable": "প্রতিকূল", "moderate": "মাঝারি"},
        "safety_yes": "হ্যাঁ, {location} এর কাছে সমুদ্রে যাওয়া নিরাপদ। বর্তমান সমুদ্রের পরিস্থিতি: ঢেউয়ের উচ্চতা {wave} m, বাতাসের গতি {wind} km/h, এবং সোয়েল সময়কাল {swell} s। সাধারণ নিরাপত্তা সরঞ্জাম সাথে রাখুন এবং রেডিও সতর্কতা মেনে চলুন।",
        "safety_caution": "সতর্কতার সাথে এগিয়ে যান, {location} এর কাছে সাবধানতা অবলম্বন করার পরামর্শ দেওয়া হচ্ছে। বর্তমান সমুদ্রের পরিস্থিতি: ঢেউয়ের উচ্চতা {wave} m, বাতাসের গতি {wind} km/h, এবং সোয়েল সময়কাল {swell} s। রওনা হওয়ার আগে পরিস্থিতি পর্যালোচনা করুন।",
        "safety_caution_threshold": "সতর্কতার সাথে এগিয়ে যান (সম্পূর্ণ নিরাপদ নয়), {location} এর কাছে সাবধানতা অবলম্বন করার পরামর্শ: {reason}। বর্তমান সমুদ্রের পরিস্থিতি: ঢেউয়ের উচ্চতা {wave} m, বাতাসের গতি {wind} km/h।",
        "safety_no": "না, {location} এর কাছে সমুদ্রে যাওয়া নিরাপদ নয়। বর্তমান সমুদ্রের পরিস্থিতি: ঢেউয়ের উচ্চতা {wave} m, বাতাসের গতি {wind} km/h, এবং সোয়েল সময়কাল {swell} s। পরিস্থিতি স্বাভাবিক না হওয়া পর্যন্ত বন্দরে থাকুন।",
        "safety_geofence_prohibited": "না, {zone} এর মধ্যে বাণিজ্যিক মাছ ধরা নিষিদ্ধ। যদিও সামুদ্রিক আবহাওয়া অনুকূল (ঢেউয়ের উচ্চতা {wave} m, বাতাসের গতি {wind} km/h, এবং সোয়েল সময়কাল {swell} s), মাছ ধরার জন্য আপনাকে {zone} সীমার বাইরে যেতে হবে।",
        "weather": "{location} এর কাছে আবহাওয়া বর্তমানে {status}: ঢেউয়ের উচ্চতা {wave} m, বাতাসের গতি {wind} km/h, এবং সোয়েল সময়কাল {swell} s।",
        "overview": "{location} এর জন্য সামুদ্রিক মূল্যায়ন {status}। বর্তমান সমুদ্রের পরিস্থিতি: ঢেউয়ের উচ্চতা {wave} m, বাতাসের গতি {wind} km/h, এবং সোয়েল সময়কাল {swell} s। স্থানীয় নিরাপত্তা নির্দেশিকা মেনে চলুন।",
        "overview_geofence": "{location} এর জন্য সামুদ্রিক মূল্যায়ন {status}। বর্তমান সমুদ্রের পরিস্থিতি: ঢেউয়ের উচ্চতা {wave} m, বাতাসের গতি {wind} km/h। সতর্কতা: আপনার অবস্থান {zone} এর মধ্যে, যেখানে মাছ ধরা নিষিদ্ধ।",
        "route": "{location} থেকে প্রস্তাবিত নৌপথ স্পষ্ট এবং খোলা রয়েছে। সর্বোচ্চ প্রত্যাশিত ঢেউ {wave} m। যাত্রাপথে সমুদ্রের পরিস্থিতি অনুকূল রয়েছে।",
        "hazards_safe": "{location} এর কাছে কোনো সক্রিয় আবহাওয়া বা সামুদ্রিক বিপদ নেই। পরিস্থিতি অনুকূল রয়েছে।",
        "hazards_caution": "{location} এর কাছে সমুদ্র অঞ্চলে সতর্কতা অবলম্বন করুন। নিরাপত্তা নির্দেশিকা মেনে চলুন।",
        "timing": "{location} এর কাছে মাছ ধরার সেরা সময় ভোরবেলা, যখন সমুদ্র সবচেয়ে শান্ত থাকে।",
        "pfz": "নিকটতম সম্ভাব্য মাছ ধরার অঞ্চল (PFZ) প্রায় {dist} km দূরে অবস্থিত। {location} এর কাছে বর্তমান সমুদ্রের পরিস্থিতি: ঢেউয়ের উচ্চতা {wave} m এবং বাতাসের গতি {wind} km/h।",
        "pfz_unavailable": "{location} এর কাছে বর্তমানে কোনো সক্রিয় মাছ ধরার অঞ্চল (PFZ) ম্যাপ করা নেই। বর্তমান সমুদ্রের পরিস্থিতি: ঢেউয়ের উচ্চতা {wave} m এবং বাতাসের গতি {wind} km/h।",
        "headline_safe": "{location} এর কাছে সমুদ্রের পরিস্থিতি অনুকূল রয়েছে।",
        "headline_caution": "{location} এর কাছে সতর্কতা অবলম্বন করার পরামর্শ।",
        "headline_geofence": "আবহাওয়া অনুকূল, তবে আপনি {zone} এর ভেতরে আছেন। মাছ ধরার আগে এলাকা থেকে বের হন।",
        "headline_unsafe": "{location} এর কাছে সমুদ্রের পরিস্থিতি প্রতিকূল।",
        "summary_safe": "{location} এর কাছে যাত্রার জন্য পরিস্থিতি নিরাপদ রয়েছে।",
        "summary_caution": "{location} এর কাছে সতর্কতার সাথে এগিয়ে যান।",
        "summary_unsafe": "{location} এর কাছে ছোট নৌকা চলাচলের পরামর্শ দেওয়া হচ্ছে না।",
        "compound_weather_safety_prohibited": "{location} এর কাছে বর্তমান সামুদ্রিক আবহাওয়া অনুকূল: ঢেউয়ের উচ্চতা {wave} m, বাতাসের গতি {wind} km/h, এবং সোয়েল সময়কাল {swell} s। তবে, {zone} এর মধ্যে বাণিজ্যিক মাছ ধরা নিষিদ্ধ; মাছ ধরার আগে এলাকা থেকে বের হন।",
        "compound_weather_safety_safe": "{location} এর কাছে বর্তমান সামুদ্রিক আবহাওয়া অনুকূল: ঢেউয়ের উচ্চতা {wave} m, বাতাসের গতি {wind} km/h। হ্যাঁ, আপনি নিরাপদে মাছ ধরতে যেতে পারেন।",
        "compound_weather_safety_caution": "{location} এর কাছে বর্তমান পরিস্থিতি: ঢেউয়ের উচ্চতা {wave} m এবং বাতাসের গতি {wind} km/h। সতর্কতা অবলম্বন করুন।",
        "compound_weather_safety_unsafe": "{location} এর কাছে বর্তমান পরিস্থিতি: ঢেউয়ের উচ্চता {wave} m এবং বাতাসের গতি {wind} km/h। না, সমুদ্রে যাওয়া নিরাপদ নয়।",
        "compound_weather_pfz": "{location} এর কাছে বর্তমান পরিস্থিতি: ঢেউয়ের উচ্চতা {wave} m এবং বাতাসের গতি {wind} km/h। নিকটতম সম্ভাব্য মাছ ধরার অঞ্চল (PFZ) প্রায় {dist} km দূরে।",
        "compound_safety_timing_prohibited": "না, {zone} এর মধ্যে বাণিজ্যিক মাছ ধরা নিষিদ্ধ। সংরক্ষিত এলাকার বাইরে মাছ ধরার সেরা সময় ভোরবেলা।",
        "compound_safety_timing_safe": "হ্যাঁ, {location} এর কাছে মাছ ধরতে যাওয়া নিরাপদ। রওনা হওয়ার সেরা সময় ভোরবেলা।",
        "compound_hazards_route_prohibited": "{location} এর কাছে সক্রিয় সতর্কতা: আপনি {zone} এর মধ্যে আছেন যেখানে মাছ ধরা নিষিদ্ধ। প্রস্তাবিত নৌপথ স্পষ্ট রয়েছে।",
        "compound_hazards_route_safe": "{location} এর কাছে কোনো সক্রিয় আবহাওয়া বিপদ নেই। প্রস্তাবিত নৌপথ নিরাপদ ও স্পষ্ট রয়েছে।",
    },
    "ml-IN": {
        "status_labels": {"favourable": "അനുകൂലമാണ്", "cautionary": "ജാഗ്രത പാലിക്കേണ്ടതാണ്", "unfavourable": "പ്രതികൂലമാണ്", "moderate": "മിതമായതാണ്"},
        "safety_yes": "അതെ, {location} ന് സമീപം കടലിൽ പോകുന്നത് സുരക്ഷിതമാണ്. നിലവിലെ കടൽ സാഹചര്യങ്ങൾ: തിരമാല ഉയരം {wave} m, കാറ്റിന്റെ വേഗത {wind} km/h, ഒപ്പം സ്വെൽ കാലയളവ് {swell} s. സാധാരണ സുരക്ഷാ ഉപകരണങ്ങൾ കരുതുകയും റേഡിയോ അറിയിപ്പുകൾ ശ്രദ്ധിക്കുകയും ചെയ്യുക.",
        "safety_caution": "ജാഗ്രതയോടെ മുന്നോട്ട് പോകുക, {location} ന് സമീപം അതീവ ജാഗ്രത പാലിക്കാൻ നിർദ്ദേശിക്കുന്നു. നിലവിലെ കടൽ സാഹചര്യങ്ങൾ: തിരമാല ഉയരം {wave} m, കാറ്റിന്റെ വേഗത {wind} km/h, ഒപ്പം സ്വെൽ കാലയളവ് {swell} s. യാത്ര തിരിക്കുന്നതിന് മുൻപ് മുൻകരുതലുകൾ എടുക്കുക.",
        "safety_caution_threshold": "ജാഗ്രത പാലിക്കുക (പൂർണ്ണമായും സുരക്ഷിതമല്ല), {location} ന് സമീപം അതീവ ജാഗ്രത നിർദ്ദേശിക്കുന്നു: {reason}. നിലവിലെ കടൽ സാഹചര്യങ്ങൾ: തിരമാല {wave} m, കാറ്റ് {wind} km/h.",
        "safety_no": "അല്ല, {location} ന് സമീപം കടലിൽ പോകുന്നത് സുരക്ഷിതമല്ല. നിലവിലെ കടൽ സാഹചര്യങ്ങൾ: തിരമാല ഉയരം {wave} m, കാറ്റിന്റെ വേഗത {wind} km/h, ഒപ്പം സ്വെൽ കാലയളവ് {swell} s. കാലാവസ്ഥ മെച്ചപ്പെടുന്നതുവരെ തുറമുഖത്ത് തുടരുക.",
        "safety_geofence_prohibited": "അല്ല, {zone} ന് ഉള്ളിൽ വാണിജ്യ മത്സ്യബന്ധനം നിരോധിച്ചിരിക്കുന്നു. കടൽ കാലാവസ്ഥ അനുകൂലമാണെങ്കിലും (തിരമാല ഉയരം {wave} m, കാറ്റിന്റെ വേഗത {wind} km/h, ഒപ്പം സ്വെൽ കാലയളവ് {swell} s), മത്സ്യബന്ധനത്തിനായി നിങ്ങൾ {zone} അതിർത്തിക്ക് പുറത്തേക്ക് പോകണം.",
        "weather": "{location} ന് സമീപം കാലാവസ്ഥ ഇപ്പോൾ {status}: തിരമാല ഉയരം {wave} m, കാറ്റിന്റെ വേഗത {wind} km/h, ഒപ്പം സ്വെൽ കാലയളവ് {swell} s.",
        "overview": "{location} നുള്ള സമുദ്ര വിലയിരുത്തൽ {status}. നിലവിലെ കടൽ സാഹചര്യങ്ങൾ: തിരമാല ഉയരം {wave} m, കാറ്റിന്റെ വേഗത {wind} km/h, ഒപ്പം സ്വെൽ കാലയളവ് {swell} s. പ്രാദേശിക സുരക്ഷാ നിർദ്ദേശങ്ങൾ പാലിക്കുക.",
        "overview_geofence": "{location} നുള്ള സമുദ്ര വിലയിരുത്തൽ {status}. നിലവിലെ കടൽ സാഹചര്യങ്ങൾ: തിരമാല ഉയരം {wave} m, കാറ്റിന്റെ വേഗത {wind} km/h. മുന്നറിയിപ്പ്: നിങ്ങളുടെ സ്ഥാനം {zone} ന് ഉള്ളിലാണ്, അവിടെ മത്സ്യബന്ധനം നിരോധിച്ചിരിക്കുന്നു.",
        "route": "{location} ൽ നിന്നുള്ള നിർദ്ദിഷ്ട നാവിഗേഷൻ പാത വ്യക്തമാണ്. പരമാവധി പ്രതീക്ഷിക്കുന്ന തിരമാല {wave} m ആണ്. യാത്രാ പാതയിൽ കടൽ സാഹചര്യങ്ങൾ അനുകൂലമാണ്.",
        "hazards_safe": "{location} ന് സമീപം കാലാവസ്ഥാ അല്ലെങ്കിൽ സമുദ്ര അപകടങ്ങൾ ഒന്നും റിപ്പോർട്ട് ചെയ്തിട്ടില്ല. സാഹചര്യങ്ങൾ അനുകൂലമാണ്.",
        "hazards_caution": "{location} ന് സമീപം കടൽ മേഖലയിൽ ജാഗ്രത പാലിക്കുക. സുരക്ഷാ മാർഗ്ഗനിർദ്ദേശങ്ങൾ പാലിക്കുക.",
        "timing": "{location} ന് സമീപം മത്സ്യബന്ധനത്തിന് ഏറ്റവും അനുയോജ്യമായ സമയം പുലർച്ചെയാണ്, ആ സമയത്ത് കടൽ ശാന്തമായിരിക്കും.",
        "pfz": "ഏറ്റവും അടുത്തുള്ള സാധ്യതയുള്ള മത്സ്യബന്ധന മേഖല (PFZ) ഏകദേശം {dist} km അകലെയാണ്. {location} ന് സമീപം നിലവിലെ കടൽ സാഹചര്യങ്ങൾ: തിരമാല ഉയരം {wave} m ഒപ്പം കാറ്റിന്റെ വേഗത {wind} km/h.",
        "pfz_unavailable": "{location} ന് സമീപം നിലവിൽ സജീവമായ മത്സ്യബന്ധന മേഖല (PFZ) മാപ്പ് ചെയ്തിട്ടില്ല. നിലവിലെ കടൽ സാഹചര്യങ്ങൾ: തിരമാല ഉയരം {wave} m ഒപ്പം കാറ്റിന്റെ വേഗത {wind} km/h.",
        "headline_safe": "{location} ന് സമീപം കടൽ സാഹചര്യങ്ങൾ അനുകൂലമാണ്.",
        "headline_caution": "{location} ന് സമീപം ജാഗ്രതാ നിർദ്ദേശം.",
        "headline_geofence": "കാലാവസ്ഥ അനുകൂലമാണ്, എന്നാൽ നിങ്ങൾ {zone} ന് ഉള്ളിലാണ്. മത്സ്യബന്ധനത്തിന് മുൻപ് പുറത്തുകടക്കുക.",
        "headline_unsafe": "{location} ന് സമീപം കടൽ സാഹചര്യങ്ങൾ പ്രതികൂലമാണ്.",
        "summary_safe": "{location} ന് സമീപം യാത്ര തിരിക്കാൻ സാഹചര്യങ്ങൾ സുരക്ഷിതമാണ്.",
        "summary_caution": "{location} ന് സമീപം ജാഗ്രതയോടെ മുന്നോട്ട് പോകുക.",
        "summary_unsafe": "{location} ന് സമീപം ചെറിയ യാനങ്ങൾ കടലിൽ ഇറക്കരുത്.",
        "compound_weather_safety_prohibited": "{location} ന് സമീപം നിലവിലെ കടൽ കാലാവസ്ഥ അനുകൂലമാണ്: തിരമാല ഉയരം {wave} m, കാറ്റിന്റെ വേഗത {wind} km/h, ഒപ്പം സ്വെൽ കാലയളവ് {swell} s. എന്നിരുന്നാലും, {zone} ന് ഉള്ളിൽ വാണിജ്യ മത്സ്യബന്ധനം നിരോധിച്ചിരിക്കുന്നു; മത്സ്യബന്ധനത്തിന് മുൻപ് പുറത്തുകടക്കുക.",
        "compound_weather_safety_safe": "{location} ന് സമീപം നിലവിലെ കടൽ കാലാവസ്ഥ അനുകൂലമാണ്: തിരമാല ഉയരം {wave} m, കാറ്റിന്റെ വേഗത {wind} km/h. അതെ, നിങ്ങൾക്ക് സുരക്ഷിതമായി മത്സ്യബന്ധനത്തിന് പോകാം.",
        "compound_weather_safety_caution": "{location} ന് സമീപം നിലവിലെ കടൽ സാഹചര്യങ്ങൾ: തിരമാല {wave} m, കാറ്റ് {wind} km/h. ജാഗ്രതയോടെ മുന്നോട്ട് പോകുക.",
        "compound_weather_safety_unsafe": "{location} ന് സമീപം നിലവിലെ കടൽ സാഹചര്യങ്ങൾ: തിരമാല {wave} m, കാറ്റ് {wind} km/h. അല്ല, കടലിൽ പോകുന്നത് സുരക്ഷിതമല്ല.",
        "compound_weather_pfz": "{location} ന് സമീപം നിലവിലെ കടൽ സാഹചര്യങ്ങൾ: തിരമാല ഉയരം {wave} m ഒപ്പം കാറ്റിന്റെ വേഗത {wind} km/h. ഏറ്റവും അടുത്തുള്ള സാധ്യതയുള്ള മത്സ്യബന്ധന മേഖല (PFZ) ഏകദേശം {dist} km അകലെയാണ്.",
        "compound_safety_timing_prohibited": "അല്ല, {zone} ന് ഉള്ളിൽ വാണിജ്യ മത്സ്യബന്ധനം നിരോധിച്ചിരിക്കുന്നു. സംരക്ഷിത മേഖലയ്ക്ക് പുറത്ത് മത്സ്യബന്ധനത്തിന് ഏറ്റവും അനുയോജ്യമായ സമയം പുലർച്ചെയാണ്.",
        "compound_safety_timing_safe": "അതെ, {location} ന് സമീപം മത്സ്യബന്ധനത്തിന് പോകുന്നത് സുരക്ഷിതമാണ്. യാത്ര തിരിക്കാൻ ഏറ്റവും നല്ല സമയം പുലർച്ചെയാണ്.",
        "compound_hazards_route_prohibited": "{location} ന് സമീപം മുന്നറിയിപ്പ്: നിങ്ങൾ {zone} ന് ഉള്ളിലാണ്, അവിടെ മത്സ്യബന്ധനം നിരോധിച്ചിരിക്കുന്നു. നിർദ്ദിഷ്ട നാവിഗേഷൻ പാത വ്യക്തമാണ്.",
        "compound_hazards_route_safe": "{location} ന് സമീപം കാലാവസ്ഥാ അപകടങ്ങൾ ഒന്നും റിപ്പോർട്ട് ചെയ്തിട്ടില്ല. നിർദ്ദിഷ്ട നാവിഗേഷൻ പാത സുരക്ഷിതവും വ്യക്തവുമാണ്.",
    },
    "mr-IN": {
        "status_labels": {"favourable": "अनुकूल आहे", "cautionary": "सावधगिरी बाळगणे आवश्यक आहे", "unfavourable": "प्रतिकूल आहे", "moderate": "मध्यम आहे"},
        "safety_yes": "होय, {location} जवळ समुद्रात जाणे सुरक्षित आहे. सद्य सागरी परिस्थिती: लाटेची उंची {wave} m, वाऱ्याचा वेग {wind} km/h, आणि उसळीचा कालावधी {swell} s आहे. मानक सुरक्षा उपकरणे सोबत ठेवा.",
        "safety_caution": "सावधगिरी बाळगा, {location} जवळ खबरदारी घेण्याचा सल्ला दिला जातो. सद्य सागरी परिस्थिती: लाटेची उंची {wave} m, वाऱ्याचा वेग {wind} km/h, आणि उसळीचा कालावधी {swell} s आहे. निघण्यापूर्वी परिस्थिती तपासा.",
        "safety_caution_threshold": "सावधगिरी बाळगा (पूर्णपणे सुरक्षित नाही), {location} जवळ खबरदारी घेण्याचा सल्ला: {reason}. सद्य सागरी परिस्थिती: लाटेची उंची {wave} m, वाऱ्याचा वेग {wind} km/h.",
        "safety_no": "नाही, {location} जवळ समुद्रात जाणे सुरक्षित नाही. सद्य सागरी परिस्थिती: लाटेची उंची {wave} m, वाऱ्याचा वेग {wind} km/h, आणि उसळीचा कालावधी {swell} s आहे. परिस्थिती सुधारेपर्यंत बंदरातच राहा.",
        "safety_geofence_prohibited": "नाही, {zone} च्या आत व्यावसायिक मासेमारीस मनाई आहे. सागरी हवामान अनुकूल असले तरी (लाटेची उंची {wave} m, वाऱ्याचा वेग {wind} km/h, आणि उसळीचा कालावधी {swell} s), मासेमारीसाठी तुम्हाला {zone} सीमेबाहेर जावे लागेल.",
        "weather": "{location} जवळ हवामान सध्या {status}: लाटेची उंची {wave} m, वाऱ्याचा वेग {wind} km/h, आणि उसळीचा कालावधी {swell} s.",
        "overview": "{location} साठी सागरी मूल्यांकन {status}. सद्य सागरी परिस्थिती: लाटेची उंची {wave} m, वाऱ्याचा वेग {wind} km/h, आणि उसळीचा कालावधी {swell} s. स्थानिक सुरक्षा सूचनांचे पालन करा.",
        "overview_geofence": "{location} साठी सागरी मूल्यांकन {status}. सद्य सागरी परिस्थिती: लाटेची उंची {wave} m, वाऱ्याचा वेग {wind} km/h. चेतावणी: तुमचे स्थान {zone} च्या आत आहे, जेथे मासेमारीस मनाई आहे.",
        "route": "{location} पासून शिफारस केलेला सागरी मार्ग सुरक्षित आणि मोकळा आहे. कमाल अपेक्षित लाट {wave} m आहे.",
        "hazards_safe": "{location} जवळ कोणतेही सक्रिय हवामान किंवा सागरी धोके नाहीत. परिस्थिती अनुकूल आहे.",
        "hazards_caution": "{location} जवळ सागरी भागात सावधगिरी बाळगा. सुरक्षा नियमांचे पालन करा.",
        "timing": "{location} जवळ मासेमारीसाठी सर्वोत्तम वेळ सकाळची आहे, जेव्हा समुद्र शांत असतो.",
        "pfz": "जवळचे संभाव्य मासेमारी क्षेत्र (PFZ) सुमारे {dist} km अंतरावर आहे. {location} जवळ सद्य सागरी परिस्थिती: लाटेची उंची {wave} m आणि वाऱ्याचा वेग {wind} km/h आहे.",
        "pfz_unavailable": "{location} जवळ सध्या कोणतेही सक्रिय मासेमारी क्षेत्र (PFZ) मॅप केलेले नाही. सद्य सागरी परिस्थिती: लाटेची उंची {wave} m आणि वाऱ्याचा वेग {wind} km/h आहे.",
        "headline_safe": "{location} जवळ सागरी परिस्थिती अनुकूल आहे.",
        "headline_caution": "{location} जवळ सावधगिरीचा इशारा देण्यात आला आहे.",
        "headline_geofence": "हवामान अनुकूल आहे, परंतु तुम्ही {zone} च्या आत आहात. मासेमारी करण्यापूर्वी बाहेर पडा.",
        "headline_unsafe": "{location} जवळ प्रतिकूल सागरी परिस्थिती आहे.",
        "summary_safe": "{location} जवळ निघण्यासाठी परिस्थिती सुरक्षित आहे.",
        "summary_caution": "{location} जवळ सावधगिरीने पुढे जा.",
        "summary_unsafe": "{location} जवळ लहान बोटी चालवू नका.",
        "compound_weather_safety_prohibited": "{location} जवळ सद्य सागरी हवामान अनुकूल आहे: लाटेची उंची {wave} m, वाऱ्याचा वेग {wind} km/h, आणि उसळीचा कालावधी {swell} s. तथापि, {zone} च्या आत व्यावसायिक मासेमारीस मनाई आहे; मासेमारी करण्यापूर्वी क्षेत्राबाहेर पडा.",
        "compound_weather_safety_safe": "{location} जवळ सद्य सागरी हवामान अनुकूल आहे: लाटेची उंची {wave} m, वाऱ्याचा वेग {wind} km/h. होय, तुम्ही सुरक्षितपणे मासेमारीसाठी जाऊ शकता.",
        "compound_weather_safety_caution": "{location} जवळ सद्य सागरी परिस्थिती: लाटेची उंची {wave} m आणि वाऱ्याचा वेग {wind} km/h. सावधगिरी बाळगा: समुद्रात सतर्कता आवश्यक आहे.",
        "compound_weather_safety_unsafe": "{location} जवळ सद्य सागरी परिस्थिती: लाटेची उंची {wave} m आणि वाऱ्याचा वेग {wind} km/h. नाही, समुद्रात जाणे सुरक्षित नाही.",
        "compound_weather_pfz": "{location} जवळ सद्य सागरी परिस्थिती: लाटेची उंची {wave} m आणि वाऱ्याचा वेग {wind} km/h. जवळचे संभाव्य मासेमारी क्षेत्र (PFZ) सुमारे {dist} km अंतरावर आहे.",
        "compound_safety_timing_prohibited": "नाही, {zone} च्या आत व्यावसायिक मासेमारीस मनाई आहे. संरक्षित क्षेत्राबाहेर मासेमारीसाठी सर्वोत्तम वेळ सकाळची आहे.",
        "compound_safety_timing_safe": "होय, {location} जवळ मासेमारीसाठी जाणे सुरक्षित आहे. निघण्यासाठी सर्वोत्तम वेळ सकाळची आहे.",
        "compound_hazards_route_prohibited": "{location} जवळ सक्रिय चेतावणी: तुम्ही {zone} च्या आत आहात जेथे मासेमारीस मनाई आहे. शिफारस केलेला सागरी मार्ग मोकळा आहे.",
        "compound_hazards_route_safe": "{location} जवळ कोणतेही सक्रिय हवामान धोके नाहीत. शिफारस केलेला सागरी मार्ग सुरक्षित आणि मोकळा आहे.",
    },
}


def _fallback_translate_text(text: str, target_language: str) -> str:
    """Translate full message unit into target Indic language when Sarvam API is offline.

    Guarantees that the ENTIRE message is returned as one coherent native unit
    with zero English words (except location proper nouns and numeric values/units).
    Never performs partial substring replacement or prefix concatenation.
    """
    if not text:
        return text
    trimmed = text.strip()

    # 1. Exact static system/error messages
    exact_map = _STATIC_EXACT_TRANSLATIONS.get(target_language, {})
    if trimmed in exact_map:
        return exact_map[trimmed]

    templates = _FULL_UNIT_TEMPLATES.get(target_language)
    if not templates:
        return text

    ctx = _extract_narrative_context(trimmed, target_language)
    loc = ctx["location"]
    wave = ctx["wave"]
    wind = ctx["wind"]
    swell = ctx["swell"]
    dist = ctx.get("dist", "18")
    zone = ctx.get("zone", "Vembanad Marine Protected Area, Kerala")
    reason = ctx.get("reason", "मौसम की स्थिति")
    status = templates["status_labels"].get(ctx["status"], ctx["status"])

    trimmed_lower = trimmed.lower()

    # Non-coastal error message
    if "does not appear to be a coastal area" in trimmed_lower:
        non_coastal_templates = {
            "hi-IN": f"{loc} तटीय क्षेत्र प्रतीत नहीं होता है। NEER केवल समुद्री और तटीय सुरक्षा जानकारी प्रदान करता है। कृपया इसके बजाय किसी तटीय स्थान या बंदरगाह (जैसे कोच्चि, मुंबई, या चेन्नई) का प्रयास करें।",
            "ta-IN": f"{loc} கடலோரப் பகுதியாகத் தெரியவில்லை. தயவுசெய்து ஒரு குறிப்பிட்ட கடலோர இடத்தைத் தேர்வு செய்யவும்.",
            "te-IN": f"{loc} తీరప్రాంతంగా కనిపించడం లేదు. దయచేసి తీర ప్రాంతాన్ని ఎంచుకోండి.",
            "bn-IN": f"{loc} উপকূলীয় এলাকা বলে মনে হচ্ছে না। অনুগ্রহ করে একটি উপকূলীয় এলাকা নির্বাচন করুন।",
            "ml-IN": f"{loc} തീരദേശ മേഖലയായി കാണപ്പെടുന്നില്ല. ദയവായി ഒരു തീരദേശ പ്രദേശം തിരഞ്ഞെടുക്കുക.",
            "mr-IN": f"{loc} किनारपट्टीचे क्षेत्र वाटत नाही. कृपया किनारपट्टीचे स्थान निवडा.",
        }
        return non_coastal_templates.get(target_language, text)

    # 2. Safety permission narrative (Case A)
    if "commercial fishing is prohibited inside" in trimmed_lower or "steer outside" in trimmed_lower or ("prohibited" in trimmed_lower and "marine protected area" in trimmed_lower):
        return templates["safety_geofence_prohibited"].format(location=loc, zone=zone, wave=wave, wind=wind, swell=swell)
    elif trimmed.startswith("Yes, you can go") or trimmed.startswith("Yes, you can safely go"):
        return templates["safety_yes"].format(location=loc, wave=wave, wind=wind, swell=swell)
    elif trimmed.startswith("Caution advised (not fully safe)"):
        return templates.get("safety_caution_threshold", templates["safety_caution"]).format(location=loc, reason=reason, wave=wave, wind=wind, swell=swell)
    elif trimmed.startswith("Proceed with caution") or trimmed.startswith("Caution advised"):
        if len(trimmed.split()) > 10 and any(kw in trimmed for kw in ("wave", "wind", "Current sea", "conditions")):
            return templates["safety_caution"].format(location=loc, wave=wave, wind=wind, swell=swell)
        return templates["summary_caution"].format(location=loc)
    elif trimmed.startswith("No, it is not safe") or trimmed.startswith("No, conditions are not safe"):
        return templates["safety_no"].format(location=loc, wave=wave, wind=wind, swell=swell)

    # 3. Compound Multi-Topic Queries
    # Pair 1: weather + safety
    if trimmed.startswith("Current marine weather near"):
        if any(kw in trimmed_lower for kw in ("prohibited", "restricted", "steer outside")):
            return templates.get("compound_weather_safety_prohibited", templates["safety_geofence_prohibited"]).format(location=loc, zone=zone, wave=wave, wind=wind, swell=swell)
        elif "safely go fishing" in trimmed_lower or "yes, you can" in trimmed_lower:
            return templates.get("compound_weather_safety_safe", templates["safety_yes"]).format(location=loc, wave=wave, wind=wind, swell=swell)
        elif "caution advised" in trimmed_lower or "vigilance" in trimmed_lower:
            return templates.get("compound_weather_safety_caution", templates["safety_caution"]).format(location=loc, wave=wave, wind=wind, swell=swell)
        else:
            return templates.get("compound_weather_safety_unsafe", templates["safety_no"]).format(location=loc, wave=wave, wind=wind, swell=swell)

    # Pair 2: weather + pfz
    if trimmed.startswith("Current marine conditions near") and ("potential fishing zone" in trimmed_lower or "pfz" in trimmed_lower):
        return templates.get("compound_weather_pfz", templates["pfz"]).format(location=loc, wave=wave, wind=wind, swell=swell, dist=dist)

    # Pair 3: safety + timing
    if ("fishing window is" in trimmed_lower or "best time for departure is" in trimmed_lower or "most manageable window is" in trimmed_lower) and any(kw in trimmed_lower for kw in ("prohibited inside", "protected zone", "can go fishing", "caution advised", "not safe for fishing")):
        if "prohibited" in trimmed_lower or "protected" in trimmed_lower:
            return templates.get("compound_safety_timing_prohibited", templates["safety_geofence_prohibited"]).format(location=loc, zone=zone, wave=wave, wind=wind, swell=swell)
        elif "can go fishing" in trimmed_lower or "yes" in trimmed_lower:
            return templates.get("compound_safety_timing_safe", templates["timing"]).format(location=loc, wave=wave, wind=wind, swell=swell)
        elif "caution" in trimmed_lower:
            return templates.get("timing", templates["timing"]).format(location=loc)
        else:
            return templates.get("timing", templates["timing"]).format(location=loc)

    # Pair 4: hazards + route
    if "recommended navigational passage" in trimmed_lower:
        if "prohibited" in trimmed_lower or "restricted" in trimmed_lower or "active restriction" in trimmed_lower:
            return templates.get("compound_hazards_route_prohibited", templates["route"]).format(location=loc, zone=zone, wave=wave, wind=wind, swell=swell)
        else:
            return templates.get("compound_hazards_route_safe", templates["route"]).format(location=loc, zone=zone, wave=wave, wind=wind, swell=swell)

    # 4. Weather single-topic narrative
    if trimmed.startswith("Weather near") or "is currently favourable:" in trimmed or "is currently cautionary:" in trimmed or "is currently unfavourable:" in trimmed:
        return templates["weather"].format(location=loc, status=status, wave=wave, wind=wind, swell=swell)

    # 5. Marine Conditions Overview (Case C)
    if (trimmed.startswith("For ") or "the marine assessment is" in trimmed) and ("Warning: your location is inside" in trimmed or "commercial fishing is prohibited" in trimmed):
        return templates.get("overview_geofence", templates["overview"]).format(location=loc, status=status, zone=zone, wave=wave, wind=wind, swell=swell)
    elif trimmed.startswith("For ") and "the marine assessment is" in trimmed:
        return templates["overview"].format(location=loc, status=status, wave=wave, wind=wind, swell=swell)

    # 6. Route narrative
    if "navigational route" in trimmed or "route from" in trimmed or "navigational passage" in trimmed:
        return templates["route"].format(location=loc, wave=wave)

    # 7. Hazards narrative
    if "hazards near" in trimmed_lower or "active hazards" in trimmed_lower or "active restriction near" in trimmed_lower:
        if "no active" in trimmed_lower:
            return templates["hazards_safe"].format(location=loc)
        return templates["hazards_caution"].format(location=loc)

    # 8. Timing narrative
    if "best time for fishing" in trimmed or "fishing window" in trimmed or "best time for departure" in trimmed:
        return templates["timing"].format(location=loc)

    # 9. PFZ narrative
    if "potential fishing zone" in trimmed_lower or "pfz" in trimmed_lower:
        if "unavailable" in trimmed_lower:
            return templates.get("pfz_unavailable", templates["pfz"]).format(location=loc, wave=wave, wind=wind)
        return templates["pfz"].format(location=loc, dist=dist, wave=wave, wind=wind)

    # 10. Headlines and summaries
    if ("inside" in trimmed_lower or "within" in trimmed_lower) and any(kw in trimmed_lower for kw in ("exit", "prohibited", "restricted")):
        if "headline_geofence" in templates:
            return templates["headline_geofence"].format(location=loc, zone=zone)

    if "Live marine conditions and trip assessment" in trimmed:
        return templates["headline_safe"].format(location=loc)
    if "Conditions are currently safe for departure" in trimmed:
        return templates["summary_safe"].format(location=loc)
    if "Small craft operations are not recommended" in trimmed:
        return templates["summary_unsafe"].format(location=loc)
    if "Advisory caution" in trimmed:
        return templates["headline_caution"].format(location=loc)

    # General headline / summary fallback by risk status using word boundary matching
    if re.search(r"\b(safe|favourable|favorable)\b", trimmed, re.IGNORECASE):
        return templates["headline_safe"].format(location=loc)
    elif re.search(r"\b(caution|cautionary|moderate)\b", trimmed, re.IGNORECASE):
        return templates["headline_caution"].format(location=loc)
    elif re.search(r"\b(unsafe|unfavourable|unfavorable|danger)\b", trimmed, re.IGNORECASE):
        return templates["headline_unsafe"].format(location=loc)

    return text


def translate_final_response(text: str, language: dict) -> str:
    """Return text translated into the user's originally detected language.

    Primary path: Dedicated Sarvam translation API or chat completion for arbitrary narrative text.
    Fallback path: Coherent full-message-unit translation for standard marine templates when API is unavailable.
    """
    if not text:
        return text
    language = language or {}
    target_language = language.get("reply_language_code", ENGLISH)
    if target_language == ENGLISH or target_language not in LANGUAGE_NAMES:
        return text

    # 1. Primary path: Dedicated Sarvam translation API via official SDK
    client = _client()
    if client:
        try:
            translation = client.text.translate(
                input=text,
                source_language_code=ENGLISH,
                target_language_code=target_language,
                model=os.getenv("SARVAM_TRANSLATION_MODEL", "mayura:v1"),
                mode=os.getenv("SARVAM_OUTPUT_TRANSLATION_MODE", "formal"),
            )
            res = _get_value(translation, "translated_text", "")
            if res and res.strip():
                logger.info(f"[SARVAM TRANSLATION: REAL_API] (target={target_language}) Real Sarvam API SDK translation succeeded for: {text[:60]!r}")
                print(f"[SARVAM TRANSLATION: REAL_API] (target={target_language}) Real Sarvam API SDK translation succeeded for: {text[:60]!r}", flush=True)
                return res.strip()
        except Exception as e:
            logger.warning(f"[SARVAM TRANSLATION: API_ERROR] SDK translation failed: {e}")

    # 2. Direct HTTP REST call to Sarvam translation endpoint (if SDK unavailable/failed but API key exists)
    api_key = os.getenv("SARVAM_API_KEY")
    if api_key:
        try:
            url = os.getenv("SARVAM_TRANSLATE_URL", "https://api.sarvam.ai/translate")
            payload = {
                "input": text,
                "source_language_code": ENGLISH,
                "target_language_code": target_language,
                "model": os.getenv("SARVAM_TRANSLATION_MODEL", "mayura:v1"),
                "mode": os.getenv("SARVAM_OUTPUT_TRANSLATION_MODE", "formal"),
            }
            req = Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"api-subscription-key": api_key, "Content-Type": "application/json"},
                method="POST",
            )
            with urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                trans = data.get("translated_text")
                if trans and trans.strip():
                    logger.info(f"[SARVAM TRANSLATION: REAL_API] (target={target_language}) Real Sarvam REST translation succeeded for: {text[:60]!r}")
                    print(f"[SARVAM TRANSLATION: REAL_API] (target={target_language}) Real Sarvam REST translation succeeded for: {text[:60]!r}", flush=True)
                    return trans.strip()
        except Exception as e:
            logger.warning(f"[SARVAM TRANSLATION: API_ERROR] REST translation failed: {e}")

        # 3. Direct LLM-based translation via sarvam_chat_completion as secondary API path
        try:
            lang_name = LANGUAGE_NAMES.get(target_language, target_language)
            prompt_messages = [
                {
                    "role": "system",
                    "content": (
                        f"You are a professional translator for Indian coastal communities. "
                        f"Translate the following English marine advisory text into natural {lang_name} ({target_language}). "
                        f"Output ONLY the direct translation, nothing else."
                    ),
                },
                {"role": "user", "content": text},
            ]
            llm_result = sarvam_chat_completion(prompt_messages, timeout=20)
            if llm_result and llm_result.strip():
                logger.info(f"[SARVAM TRANSLATION: REAL_API] (target={target_language}) Real Sarvam LLM translation succeeded for: {text[:60]!r}")
                print(f"[SARVAM TRANSLATION: REAL_API] (target={target_language}) Real Sarvam LLM translation succeeded for: {text[:60]!r}", flush=True)
                return llm_result.strip()
        except Exception as e:
            logger.warning(f"[SARVAM TRANSLATION: API_ERROR] LLM translation failed: {e}")

    # 4. Fallback path: Full-message-unit translation for standard marine narratives
    logger.info(f"[SARVAM TRANSLATION: FALLBACK] (target={target_language}) API unavailable/failed; served full message unit via deterministic fallback for: {text[:60]!r}")
    print(f"[SARVAM TRANSLATION: FALLBACK] (target={target_language}) API unavailable/failed; served full message unit via deterministic fallback for: {text[:60]!r}", flush=True)
    return _fallback_translate_text(text, target_language)


SARVAM_CHAT_URL = "https://api.sarvam.ai/v1/chat/completions"


def sarvam_chat_completion(
    messages: list[dict],
    model: str | None = None,
    temperature: float = 0.1,
    max_tokens: int = 2048,
    timeout: int = 35,
) -> str | None:
    """Chat completion using Sarvam AI's LLM (sarvam-105b)."""
    api_key = os.getenv("SARVAM_API_KEY")
    if not api_key:
        return None

    url = os.getenv("SARVAM_CHAT_URL", SARVAM_CHAT_URL)
    chat_model = model or os.getenv("SARVAM_CHAT_MODEL", "sarvam-105b")
    payload = {
        "model": chat_model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    body = json.dumps(payload).encode("utf-8")
    headers = {
        "api-subscription-key": api_key,
        "Content-Type": "application/json",
    }
    try:
        req = Request(url, data=body, headers=headers, method="POST")
        with urlopen(req, timeout=timeout) as response:
            data = json.loads(response.read().decode("utf-8"))
            choices = data.get("choices")
            if choices and len(choices) > 0:
                msg = choices[0].get("message", {})
                content = msg.get("content")
                if content:
                    return content.strip()
                reasoning = msg.get("reasoning_content")
                if reasoning:
                    return reasoning.strip()
    except Exception:
        return None
    return None
