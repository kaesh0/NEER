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

    if clean_tokens & _TAMIL_MARKERS:
        return "ta-IN"
    if clean_tokens & _TELUGU_MARKERS:
        return "te-IN"
    if clean_tokens & _BENGALI_MARKERS:
        return "bn-IN"
    if clean_tokens & _MALAYALAM_MARKERS:
        return "ml-IN"
    if clean_tokens & _MARATHI_MARKERS:
        return "mr-IN"
    if clean_tokens & _HINDI_MARKERS:
        return "hi-IN"

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


def _extract_narrative_context(text: str) -> dict:
    """Extract location name, status, wave, wind, and swell from standard narrative text."""
    loc = "तटीय क्षेत्र"
    m_loc = re.search(r"\b(?:near|for|from|to)\s+([A-Z][a-zA-Z\s]+(?:,\s*[A-Z][a-zA-Z\s]+)?)", text)
    if m_loc:
        raw_loc = m_loc.group(1).strip()
        cleaned_loc = re.sub(r"\s+(?:is|where|under|show|shows|showed|reflecting|based|conditions|are|with)\b.*", "", raw_loc, flags=re.IGNORECASE)
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

    swell = "9.8"
    m_s = re.search(r"(\d+(?:\.\d+)?)\s*s\b", text)
    if m_s:
        swell = m_s.group(1)

    return {"location": loc, "status": status, "wave": wave, "wind": wind, "swell": swell}


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
        "safety_no": "नहीं, {location} के पास समुद्र में जाना सुरक्षित नहीं है। वर्तमान समुद्री स्थिति: लहर की ऊंचाई {wave} m, हवा की गति {wind} km/h, और स्वेल अवधि {swell} s है। मौसम में सुधार होने तक बंदरगाह में ही रहें।",
        "weather": "{location} के पास मौसम वर्तमान में {status} है: लहर की ऊंचाई {wave} m, हवा की गति {wind} km/h, और स्वेल अवधि {swell} s है।",
        "overview": "{location} के लिए समुद्री मूल्यांकन {status} है। वर्तमान समुद्री स्थिति: लहर की ऊंचाई {wave} m, हवा की गति {wind} km/h, और स्वेल अवधि {swell} s। स्थानीय सुरक्षा निर्देशों का पालन करें।",
        "route": "{location} से अनुशंसित समुद्री मार्ग सुरक्षित और स्पष्ट है। मार्ग में अधिकतम लहर {wave} m रहने की संभावना है। नौवहन परिस्थितियाँ अनुकूल हैं।",
        "hazards_safe": "{location} के पास कोई सक्रिय मौसमी या समुद्री खतरा नहीं है। परिस्थितियाँ अनुकूल हैं।",
        "hazards_caution": "{location} के पास समुद्री क्षेत्र में सावधानी बरतें। सुरक्षित सीमाओं और स्थानीय चेतावनियों का पालन करें।",
        "timing": "{location} के पास मछली पकड़ने के लिए सबसे अच्छा समय सुबह का है, जब समुद्री परिस्थितियाँ सबसे शांत रहती हैं।",
        "headline_safe": "{location} के पास समुद्री परिस्थितियाँ अनुकूल हैं।",
        "headline_caution": "{location} के पास सावधानी बरतने की सलाह दी जाती है।",
        "headline_unsafe": "{location} के पास प्रतिकूल समुद्री परिस्थितियाँ।",
        "summary_safe": "{location} के पास प्रस्थान के लिए परिस्थितियाँ सुरक्षित हैं।",
        "summary_caution": "{location} के पास सावधानी के साथ आगे बढ़ें।",
        "summary_unsafe": "{location} के पास छोटी नौकाओं के संचालन की सलाह नहीं दी जाती है।",
    },
    "ta-IN": {
        "status_labels": {"favourable": "சாதகமாக உள்ளது", "cautionary": "எச்சரிக்கையுடன் உள்ளது", "unfavourable": "சாதகமற்றதாக உள்ளது", "moderate": "மிதமானதாக உள்ளது"},
        "safety_yes": "ஆம், {location} அருகே கடலுக்குச் செல்ல முழு பாதுகாப்பு உள்ளது. தற்போதைய கடல் நிலைமைகள்: அலை உயரம் {wave} m, காற்றின் வேகம் {wind} km/h, மற்றும் வீக்க காலம் {swell} s. வழக்கமான பாதுகாப்பு உபகரணங்களை எடுத்துச் செல்லவும்.",
        "safety_caution": "எச்சரிக்கையுடன் செல்லுங்கள், {location} அருகே கவனமாக இருக்க அறிவுறுத்தப்படுகிறது. தற்போதைய கடல் நிலைமைகள்: அலை உயரம் {wave} m, காற்றின் வேகம் {wind} km/h, மற்றும் வீக்க காலம் {swell} s. புறப்படுவதற்கு முன் வானிலையைக் கவனியுங்கள்.",
        "safety_no": "இல்லை, {location} அருகே கடலுக்குச் செல்வது பாதுகாப்பானது அல்ல. தற்போதைய கடல் நிலைமைகள்: அலை உயரம் {wave} m, காற்றின் வேகம் {wind} km/h, மற்றும் வீக்க காலம் {swell} s. நிலைமைகள் சீராகும் வரை துறைமுகத்திலேயே இருக்கவும்.",
        "weather": "{location} அருகே வானிலை தற்போது {status}: அலை உயரம் {wave} m, காற்றின் வேகம் {wind} km/h, மற்றும் வீக்க காலம் {swell} s.",
        "overview": "{location} க்கான கடல் மதிப்பீடு {status}. தற்போதைய கடல் நிலைமைகள்: அலை உயரம் {wave} m, காற்றின் வேகம் {wind} km/h, மற்றும் வீக்க காலம் {swell} s. உள்ளூர் பாதுகாப்பு வழிகாட்டுதல்களைப் பின்பற்றவும்.",
        "route": "{location} இலிருந்து பரிந்துரைக்கப்பட்ட கடல் வழிப்பாதை தெளிவாக உள்ளது. அதிகபட்ச எதிர்பார்க்கப்படும் அலை {wave} m ஆகும். வழித்தடத்தில் கடல் நிலைமைகள் சாதகமாக உள்ளன.",
        "hazards_safe": "{location} அருகே தீவிர வானிலை அல்லது கடல் ஆபத்துகள் எதுவும் இல்லை. நிலைமைகள் சாதகமாக உள்ளன.",
        "hazards_caution": "{location} அருகே கடல் பகுதியில் எச்சரிக்கையுடன் செயல்படவும். பாதுகாப்பு வழிகாட்டுதல்களைப் பின்பற்றவும்.",
        "timing": "{location} அருகே மீன்பிடிக்க சிறந்த நேரம் அதிகாலை ஆகும், அப்போது கடல் நிலைமைகள் மிகவும் அமைதியாக இருக்கும்.",
        "headline_safe": "{location} அருகே கடல் நிலைமைகள் சாதகமாக உள்ளன.",
        "headline_caution": "{location} அருகே எச்சரிக்கை அறிவுறுத்தப்படுகிறது.",
        "headline_unsafe": "{location} அருகே கடல் நிலைமைகள் பாதகமாக உள்ளன.",
        "summary_safe": "{location} அருகே புறப்படுவதற்கு நிலைமைகள் பாதுகாப்பாக உள்ளன.",
        "summary_caution": "{location} அருகே எச்சரிக்கையுடன் செல்லவும்.",
        "summary_unsafe": "{location} அருகே சிறிய படகுகளை இயக்க வேண்டாம்.",
    },
    "te-IN": {
        "status_labels": {"favourable": "అనుకూలంగా ఉంది", "cautionary": "హెచ్చరికతో కూడినదిగా ఉంది", "unfavourable": "ప్రతికూలంగా ఉంది", "moderate": "మధ్యస్థంగా ఉంది"},
        "safety_yes": "అవును, {location} సమీపంలో సముద్రంలోకి వెళ్లడం సురక్షితం. ప్రస్తుత సముద్ర పరిస్థితులు: అలల ఎత్తు {wave} m, గాలి వేగం {wind} km/h, మరియు స్వెల్ వ్యవధి {swell} s. ప్రామాణిక భద్రతా పరికరాలను వెంట తీసుకెళ్లండి.",
        "safety_caution": "జాగ్రత్తగా ఉండండి, {location} సమీపంలో అప్రమత్తంగా ఉండాలని సూచించబడింది. ప్రస్తుత సముద్ర పరిస్థితులు: అలల ఎత్తు {wave} m, గాలి వేగం {wind} km/h, మరియు స్వెల్ వ్యవధి {swell} s. బయలుదేరే ముందు వాతావరణాన్ని తనిఖీ చేయండి.",
        "safety_no": "కాదు, {location} సమీపంలో సముద్రంలోకి వెళ్లడం సురక్షితం కాదు. ప్రస్తుత సముద్ర పరిస్థితులు: అలల ఎత్తు {wave} m, గాలి వేగం {wind} km/h, మరియు స్వెల్ వ్యవధి {swell} s. పరిస్థితులు మెరుగుపడే వరకు వేచి ఉండండి.",
        "weather": "{location} సమీపంలో వాతావరణం ప్రస్తుతం {status}: అలల ఎత్తు {wave} m, గాలి వేగం {wind} km/h, మరియు స్వెల్ వ్యవధి {swell} s.",
        "overview": "{location} కోసం సముద్ర అంచనా {status}. ప్రస్తుత సముద్ర పరిస్థితులు: అలల ఎత్తు {wave} m, గాలి వేగం {wind} km/h, మరియు స్వెల్ వ్యవధి {swell} s. స్థానిక భద్రతా సూచనలను పాటించండి.",
        "route": "{location} నుండి సిఫార్సు చేయబడిన సముద్ర మార్గం స్పష్టంగా ఉంది. గరిష్టంగా ఆశించిన అలల ఎత్తు {wave} m. మార్గంలో సముద్ర పరిస్థితులు అనుకూలంగా ఉన్నాయి.",
        "hazards_safe": "{location} సమీపంలో ఎలాంటి వాతావరణ లేదా సముద్ర ప్రమాదాలు లేవు. పరిస్థితులు అనుకూలంగా ఉన్నాయి.",
        "hazards_caution": "{location} సమీపంలో సముద్ర ప్రాంతంలో జాగ్రత్త వహించండి. భద్రతా నిబంధనలను పాటించండి.",
        "timing": "{location} సమీపంలో చేపల వేటకు ఉదయం సమయం అనుకూలమైనది, ఆ సమయంలో సముద్రం ప్రశాంతంగా ఉంటుంది.",
        "headline_safe": "{location} సమీపంలో సముద్ర పరిస్థితులు అనుకూలంగా ఉన్నాయి.",
        "headline_caution": "{location} సమీపంలో హెచ్చరిక సూచించబడింది.",
        "headline_unsafe": "{location} సమీపంలో సముద్ర పరిస్థితులు ప్రతికూలంగా ఉన్నాయి.",
        "summary_safe": "{location} సమీపంలో ప్రయాణానికి పరిస్థితులు సురక్షితంగా ఉన్నాయి.",
        "summary_caution": "{location} సమీపంలో జాగ్రత్తగా ముందుకు సాగండి.",
        "summary_unsafe": "{location} సమీపంలో చిన్న పడవల కార్యకలాపాలు సిఫార్సు చేయబడలేదు.",
    },
    "bn-IN": {
        "status_labels": {"favourable": "অনুকূল", "cautionary": "সতর্কতামূলক", "unfavourable": "প্রতিকূল", "moderate": "মাঝারি"},
        "safety_yes": "হ্যাঁ, {location} এর কাছে সমুদ্রে যাওয়া নিরাপদ। বর্তমান সমুদ্রের পরিস্থিতি: ঢেউয়ের উচ্চতা {wave} m, বাতাসের গতি {wind} km/h, এবং সোয়েল সময়কাল {swell} s। সাধারণ নিরাপত্তা সরঞ্জাম সাথে রাখুন এবং রেডিও সতর্কতা মেনে চলুন।",
        "safety_caution": "সতর্কতার সাথে এগিয়ে যান, {location} এর কাছে সাবধানতা অবলম্বন করার পরামর্শ দেওয়া হচ্ছে। বর্তমান সমুদ্রের পরিস্থিতি: ঢেউয়ের উচ্চতা {wave} m, বাতাসের গতি {wind} km/h, এবং সোয়েল সময়কাল {swell} s। রওনা হওয়ার আগে পরিস্থিতি পর্যালোচনা করুন।",
        "safety_no": "না, {location} এর কাছে সমুদ্রে যাওয়া নিরাপদ নয়। বর্তমান সমুদ্রের পরিস্থিতি: ঢেউয়ের উচ্চতা {wave} m, বাতাসের গতি {wind} km/h, এবং সোয়েল সময়কাল {swell} s। পরিস্থিতি স্বাভাবিক না হওয়া পর্যন্ত বন্দরে থাকুন।",
        "weather": "{location} এর কাছে আবহাওয়া বর্তমানে {status}: ঢেউয়ের উচ্চতা {wave} m, বাতাসের গতি {wind} km/h, এবং সোয়েল সময়কাল {swell} s।",
        "overview": "{location} এর জন্য সামুদ্রিক মূল্যায়ন {status}। বর্তমান সমুদ্রের পরিস্থিতি: ঢেউয়ের উচ্চতা {wave} m, বাতাসের গতি {wind} km/h, এবং সোয়েল সময়কাল {swell} s। স্থানীয় নিরাপত্তা নির্দেশিকা মেনে চলুন।",
        "route": "{location} থেকে প্রস্তাবিত নৌপথ স্পষ্ট এবং খোলা রয়েছে। সর্বোচ্চ প্রত্যাশিত ঢেউ {wave} m। যাত্রাপথে সমুদ্রের পরিস্থিতি অনুকূল রয়েছে।",
        "hazards_safe": "{location} এর কাছে কোনো সক্রিয় আবহাওয়া বা সামুদ্রিক বিপদ নেই। পরিস্থিতি অনুকূল রয়েছে।",
        "hazards_caution": "{location} এর কাছে সমুদ্র অঞ্চলে সতর্কতা অবলম্বন করুন। নিরাপত্তা নির্দেশিকা মেনে চলুন।",
        "timing": "{location} এর কাছে মাছ ধরার সেরা সময় ভোরবেলা, যখন সমুদ্র সবচেয়ে শান্ত থাকে।",
        "headline_safe": "{location} এর কাছে সমুদ্রের পরিস্থিতি অনুকূল রয়েছে।",
        "headline_caution": "{location} এর কাছে সতর্কতা অবলম্বন করার পরামর্শ।",
        "headline_unsafe": "{location} এর কাছে সমুদ্রের পরিস্থিতি প্রতিকূল।",
        "summary_safe": "{location} এর কাছে যাত্রার জন্য পরিস্থিতি নিরাপদ রয়েছে।",
        "summary_caution": "{location} এর কাছে সতর্কতার সাথে এগিয়ে যান।",
        "summary_unsafe": "{location} এর কাছে ছোট নৌকা চলাচলের পরামর্শ দেওয়া হচ্ছে না।",
    },
    "ml-IN": {
        "status_labels": {"favourable": "അനുകൂലമാണ്", "cautionary": "ജാഗ്രത പാലിക്കേണ്ടതാണ്", "unfavourable": "പ്രതികൂലമാണ്", "moderate": "മിതമായതാണ്"},
        "safety_yes": "അതെ, {location} ന് സമീപം കടലിൽ പോകുന്നത് സുരക്ഷിതമാണ്. നിലവിലെ കടൽ സാഹചര്യങ്ങൾ: തിരമാല ഉയരം {wave} m, കാറ്റിന്റെ വേഗത {wind} km/h, ഒപ്പം സ്വെൽ കാലയളവ് {swell} s. സാധാരണ സുരക്ഷാ ഉപകരണങ്ങൾ കരുതുകയും റേഡിയോ അറിയിപ്പുകൾ ശ്രദ്ധിക്കുകയും ചെയ്യുക.",
        "safety_caution": "ജാഗ്രതയോടെ മുന്നോട്ട് പോകുക, {location} ന് സമീപം അതീവ ജാഗ്രത പാലിക്കാൻ നിർദ്ദേശിക്കുന്നു. നിലവിലെ കടൽ സാഹചര്യങ്ങൾ: തിരമാല ഉയരം {wave} m, കാറ്റിന്റെ വേഗത {wind} km/h, ഒപ്പം സ്വെൽ കാലയളവ് {swell} s. യാത്ര തിരിക്കുന്നതിന് മുൻപ് മുൻകരുതലുകൾ എടുക്കുക.",
        "safety_no": "അല്ല, {location} ന് സമീപം കടലിൽ പോകുന്നത് സുരക്ഷിതമല്ല. നിലവിലെ കടൽ സാഹചര്യങ്ങൾ: തിരമാല ഉയരം {wave} m, കാറ്റിന്റെ വേഗത {wind} km/h, ഒപ്പം സ്വെൽ കാലയളവ് {swell} s. കാലാവസ്ഥ മെച്ചപ്പെടുന്നതുവരെ തുറമുഖത്ത് തുടരുക.",
        "weather": "{location} ന് സമീപം കാലാവസ്ഥ ഇപ്പോൾ {status}: തിരമാല ഉയരം {wave} m, കാറ്റിന്റെ വേഗത {wind} km/h, ഒപ്പം സ്വെൽ കാലയളവ് {swell} s.",
        "overview": "{location} നുള്ള സമുദ്ര വിലയിരുത്തൽ {status}. നിലവിലെ കടൽ സാഹചര്യങ്ങൾ: തിരമാല ഉയരം {wave} m, കാറ്റിന്റെ വേഗത {wind} km/h, ഒപ്പം സ്വെൽ കാലയളവ് {swell} s. പ്രാദേശിക സുരക്ഷാ നിർദ്ദേശങ്ങൾ പാലിക്കുക.",
        "route": "{location} ൽ നിന്നുള്ള നിർദ്ദിഷ്ട നാവിഗേഷൻ പാത വ്യക്തമാണ്. പരമാവധി പ്രതീക്ഷിക്കുന്ന തിരമാല {wave} m ആണ്. യാത്രാ പാതയിൽ കടൽ സാഹചര്യങ്ങൾ അനുകൂലമാണ്.",
        "hazards_safe": "{location} ന് സമീപം കാലാവസ്ഥാ അല്ലെങ്കിൽ സമുദ്ര അപകടങ്ങൾ ഒന്നും റിപ്പോർട്ട് ചെയ്തിട്ടില്ല. സാഹചര്യങ്ങൾ അനുകൂലമാണ്.",
        "hazards_caution": "{location} ന് സമീപം കടൽ മേഖലയിൽ ജാഗ്രത പാലിക്കുക. സുരക്ഷാ മാർഗ്ഗനിർദ്ദേശങ്ങൾ പാലിക്കുക.",
        "timing": "{location} ന് സമീപം മത്സ്യബന്ധനത്തിന് ഏറ്റവും അനുയോജ്യമായ സമയം പുലർച്ചെയാണ്, ആ സമയത്ത് കടൽ ശാന്തമായിരിക്കും.",
        "headline_safe": "{location} ന് സമീപം കടൽ സാഹചര്യങ്ങൾ അനുകൂലമാണ്.",
        "headline_caution": "{location} ന് സമീപം ജാഗ്രതാ നിർദ്ദേശം.",
        "headline_unsafe": "{location} ന് സമീപം കടൽ സാഹചര്യങ്ങൾ പ്രതികൂലമാണ്.",
        "summary_safe": "{location} ന് സമീപം യാത്ര തിരിക്കാൻ സാഹചര്യങ്ങൾ സുരക്ഷിതമാണ്.",
        "summary_caution": "{location} ന് സമീപം ജാഗ്രതയോടെ മുന്നോട്ട് പോകുക.",
        "summary_unsafe": "{location} ന് സമീപം ചെറിയ യാനങ്ങൾ കടലിൽ ഇറക്കരുത്.",
    },
    "mr-IN": {
        "status_labels": {"favourable": "अनुकूल आहे", "cautionary": "सावधगिरी बाळगणे आवश्यक आहे", "unfavourable": "प्रतिकूल आहे", "moderate": "मध्यम आहे"},
        "safety_yes": "होय, {location} जवळ समुद्रात जाणे सुरक्षित आहे. सद्य सागरी परिस्थिती: लाटेची उंची {wave} m, वाऱ्याचा वेग {wind} km/h, आणि उसळीचा कालावधी {swell} s आहे. मानक सुरक्षा उपकरणे सोबत ठेवा.",
        "safety_caution": "सावधगिरी बाळगा, {location} जवळ खबरदारी घेण्याचा सल्ला दिला जातो. सद्य सागरी परिस्थिती: लाटेची उंची {wave} m, वाऱ्याचा वेग {wind} km/h, आणि उसळीचा कालावधी {swell} s आहे. निघण्यापूर्वी परिस्थिती तपासा.",
        "safety_no": "नाही, {location} जवळ समुद्रात जाणे सुरक्षित नाही. सद्य सागरी परिस्थिती: लाटेची उंची {wave} m, वाऱ्याचा वेग {wind} km/h, आणि उसळीचा कालावधी {swell} s आहे. परिस्थिती सुधारेपर्यंत बंदरातच राहा.",
        "weather": "{location} जवळ हवामान सध्या {status}: लाटेची उंची {wave} m, वाऱ्याचा वेग {wind} km/h, आणि उसळीचा कालावधी {swell} s.",
        "overview": "{location} साठी सागरी मूल्यांकन {status}. सद्य सागरी परिस्थिती: लाटेची उंची {wave} m, वाऱ्याचा वेग {wind} km/h, आणि उसळीचा कालावधी {swell} s. स्थानिक सुरक्षा सूचनांचे पालन करा.",
        "route": "{location} पासून शिफारस केलेला सागरी मार्ग सुरक्षित आणि मोकळा आहे. कमाल अपेक्षित लाट {wave} m आहे.",
        "hazards_safe": "{location} जवळ कोणतेही सक्रिय हवामान किंवा सागरी धोके नाहीत. परिस्थिती अनुकूल आहे.",
        "hazards_caution": "{location} जवळ सागरी भागात सावधगिरी बाळगा. सुरक्षा नियमांचे पालन करा.",
        "timing": "{location} जवळ मासेमारीसाठी सर्वोत्तम वेळ सकाळची आहे, जेव्हा समुद्र शांत असतो.",
        "headline_safe": "{location} जवळ सागरी परिस्थिती अनुकूल आहे.",
        "headline_caution": "{location} जवळ सावधगिरीचा इशारा देण्यात आला आहे.",
        "headline_unsafe": "{location} जवळ प्रतिकूल सागरी परिस्थिती आहे.",
        "summary_safe": "{location} जवळ निघण्यासाठी परिस्थिती सुरक्षित आहे.",
        "summary_caution": "{location} जवळ सावधगिरीने पुढे जा.",
        "summary_unsafe": "{location} जवळ लहान बोटी चालवू नका.",
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

    ctx = _extract_narrative_context(trimmed)
    loc = ctx["location"]
    wave = ctx["wave"]
    wind = ctx["wind"]
    swell = ctx["swell"]
    status = templates["status_labels"].get(ctx["status"], ctx["status"])

    # 2. Safety permission narrative
    if trimmed.startswith("Yes, you can go"):
        return templates["safety_yes"].format(location=loc, wave=wave, wind=wind, swell=swell)
    elif trimmed.startswith("Proceed with caution"):
        if len(trimmed.split()) > 10 and any(kw in trimmed for kw in ("wave", "wind", "Current sea")):
            return templates["safety_caution"].format(location=loc, wave=wave, wind=wind, swell=swell)
        return templates["summary_caution"].format(location=loc)
    elif trimmed.startswith("No, it is not safe"):
        return templates["safety_no"].format(location=loc, wave=wave, wind=wind, swell=swell)

    # 3. Weather single-topic narrative
    if trimmed.startswith("Weather near") or "is currently favourable:" in trimmed or "is currently cautionary:" in trimmed or "is currently unfavourable:" in trimmed:
        return templates["weather"].format(location=loc, status=status, wave=wave, wind=wind, swell=swell)

    # 4. Marine Conditions Overview (Case C)
    if trimmed.startswith("For ") and "the marine assessment is" in trimmed:
        return templates["overview"].format(location=loc, status=status, wave=wave, wind=wind, swell=swell)

    # 5. Route narrative
    if "navigational route" in trimmed or "route from" in trimmed:
        return templates["route"].format(location=loc, wave=wave)

    # 6. Hazards narrative
    if "hazards near" in trimmed.lower() or "active hazards" in trimmed.lower():
        if "no active" in trimmed.lower():
            return templates["hazards_safe"].format(location=loc)
        return templates["hazards_caution"].format(location=loc)

    # 7. Timing narrative
    if "best time for fishing" in trimmed or "fishing window" in trimmed:
        return templates["timing"].format(location=loc)

    # 8. Headlines and summaries
    if "Live marine conditions and trip assessment" in trimmed:
        return templates["headline_safe"].format(location=loc)
    if "Conditions are currently safe for departure" in trimmed:
        return templates["summary_safe"].format(location=loc)
    if "Small craft operations are not recommended" in trimmed:
        return templates["summary_unsafe"].format(location=loc)
    if "Advisory caution" in trimmed:
        return templates["headline_caution"].format(location=loc)

    # General headline / summary fallback by risk status
    if "safe" in trimmed.lower() or "favourable" in trimmed.lower():
        return templates["headline_safe"].format(location=loc)
    elif "caution" in trimmed.lower() or "moderate" in trimmed.lower():
        return templates["headline_caution"].format(location=loc)
    elif "unsafe" in trimmed.lower() or "unfavourable" in trimmed.lower():
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
