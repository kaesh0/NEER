"""Agent 7: final ORCA JSON response — persona-schema payload with an LLM
narrative (Sarvam AI sarvam-105b) and a deterministic fallback narrative."""

from __future__ import annotations

import json
import os
from urllib.error import URLError
from urllib.request import Request, urlopen

from services.payload_builder import build_orca_payload
from services.sarvam_service import ENGLISH, translate_final_response, sarvam_chat_completion

import re


def _clean_sarvam_narrative(text: str) -> str | None:
    if not text:
        return None

    def is_clean(candidate: str) -> bool:
        if not candidate or len(candidate.strip()) < 20:
            return False
        lower = candidate.lower()
        poison_words = [
            "the user wants", "i must use only", "let me extract", "the instructions say",
            "so i need to", "let me check", "check constraints", "key constraints",
            "evaluating against", "that's 3 sentences", "that's 2 sentences",
            "my draft:", "let me draft:", "sentence 1:", "i need to mention"
        ]
        return not any(pw in lower for pw in poison_words)

    # 1. XML tag extraction
    m = re.search(r"<narrative>(.*?)</narrative>", text, re.DOTALL | re.IGNORECASE)
    if m:
        candidate = m.group(1).strip()
        if is_clean(candidate):
            return candidate

    # 2. Quoted draft extraction: models often write: Let me draft: "..." or Revised: "..."
    quotes = re.findall(r'"([^"]{30,800})"', text)
    valid_quotes = [q.strip() for q in quotes if is_clean(q)]
    if valid_quotes:
        return valid_quotes[-1]  # The latest revision / final draft

    # 3. Devanagari extraction: if reasoning is in English and the answer in Hindi
    devanagari_blocks = re.findall(r'[\u0900-\u097F][\u0900-\u097F\s\d.,/!?:;\\\'"()\-।॥]{20,}', text)
    if devanagari_blocks:
        longest = max(devanagari_blocks, key=len).strip().strip('"\'' ' ')
        if len(longest) > 30 and is_clean(longest):
            return longest

    # 4. Marker extraction (Forward search from conclusion markers)
    markers = [
        "let me draft:", "draft:", "revised:", "revised draft:",
        "final text:", "final response:", "my response:", "let's go with:"
    ]
    lower_text = text.lower()
    for marker in markers:
        if marker in lower_text:
            idx = lower_text.rfind(marker) + len(marker)
            tail = text[idx:].strip()
            if tail.startswith('"') and '"' in tail[1:]:
                q_text = tail[1:tail.index('"', 1)].strip()
                if is_clean(q_text):
                    return q_text
            split_pat = r"(?i)\b(the instructions say|let me check|check constraints|wait,)\b"
            sub_parts = re.split(split_pat, tail)
            cand = sub_parts[0].strip().strip('"\'' '\n')
            if is_clean(cand):
                return cand

    # 5. Head Truncation (Answer first, reasoning trailing after)
    split_pattern = (
        r"(?i)\b(the instructions say|let'?s refine|that'?s \d sentences|let me check|"
        r"i should ensure|check constraints|my draft|revised draft|revised:|let'?s evaluate|"
        r"so i need to|i need to mention|key constraints|sentence \d|let'?s go with|draft:|evaluating against)\b"
    )
    parts = re.split(split_pattern, text)
    if len(parts) > 1 and len(parts[0].strip()) > 30:
        head = parts[0].strip().strip('"\' \n')
        m_sent = re.findall(r".*?[.!।](?:\s|$)", head, re.DOTALL)
        cand = "".join(m_sent).strip().strip('"\' ') if m_sent else head
        if is_clean(cand):
            return cand

    # 6. If entire text is already clean and not excessively long (< 120 words)
    words = text.split()
    if len(words) < 120 and is_clean(text):
        return text.strip(' ""\'')

    # Dirty text with unparseable reasoning fails gracefully to fallback narrative
    return None


def _sarvam_response(payload: dict) -> str | None:
    intent = payload.get("intent") or {}
    narrow_topic = intent.get("narrow_topic")

    if narrow_topic:
        system_prompt = (
            "You are a marine-assistance response writer for Indian coastal communities. "
            "The user asked a specific, single-topic question. "
            "Use ONLY the supplied JSON data. "
            "Answer ONLY what was asked in 1-2 concise, conversational sentences. "
            "Do NOT produce a full multi-parameter assessment report or repeat unrequested metrics. "
            "Enclose your final narrative strictly between <narrative> and </narrative> tags. "
            "Do NOT include any reasoning, thought process, scratchpad notes, or analysis inside <narrative>...</narrative>."
        )
    else:
        system_prompt = (
            "You are a marine-assistance response writer for Indian coastal communities. "
            "Use ONLY the supplied JSON data. "
            "Output ONLY the final conversational narrative directly to the user in 2-4 clear sentences. "
            "Enclose your final narrative strictly between <narrative> and </narrative> tags. "
            "Do NOT include any reasoning, thought process, scratchpad notes, or analysis inside <narrative>...</narrative>. "
            "State clearly the risk status using favourable, caution, or unfavourable language (never use the word SAFE as a status label), "
            "current conditions (wave height, wind speed, ocean currents), and safety advice."
        )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
    ]
    raw = sarvam_chat_completion(messages, temperature=0.1, max_tokens=2048)
    if not raw:
        return None
    return _clean_sarvam_narrative(raw)


def _fmt(value, unit: str) -> str:
    """Human-readable value; never prints 'None' (Sarvam translates it to
    'शून्य'/zero, which reads as a real measurement to a fisherman)."""
    return f"{value} {unit}" if value is not None else "unavailable"


def _narrow_fallback_narrative(
    narrow_topic: str,
    intent: dict,
    weather: dict,
    ocean: dict,
    risk: dict,
    geofence: dict | None,
) -> str:
    """Build a short, 1-2 sentence answer for narrow, single-topic questions using already-fetched data."""
    location_name = (intent.get("location") or {}).get("name", "your location")
    weather_ok = weather.get("status") == "ok"
    source = weather.get("source", "Open-Meteo") if weather_ok else "marine weather service"

    if narrow_topic == "wind_speed":
        if weather_ok and weather.get("wind_speed_kmh") is not None:
            val = weather.get("wind_speed_kmh")
            return f"Wind speed near {location_name} is currently {val} km/h, based on live {source} data."
        return f"Live wind speed data is currently unavailable for {location_name}."

    if narrow_topic == "wave_height":
        if weather_ok and weather.get("wave_height_m") is not None:
            val = weather.get("wave_height_m")
            return f"Wave height near {location_name} is currently {val} m, based on live {source} data."
        return f"Live wave height data is currently unavailable for {location_name}."

    if narrow_topic == "swell":
        if weather_ok:
            period = weather.get("swell_period_s")
            height = weather.get("swell_height_m")
            if period is not None and height is not None:
                return f"Swell conditions near {location_name} show a swell height of {height} m with a period of {period} s, based on live {source} data."
            if period is not None:
                return f"Swell period near {location_name} is currently {period} s, based on live {source} data."
            if height is not None:
                return f"Swell height near {location_name} is currently {height} m, based on live {source} data."
        return f"Live swell data is currently unavailable for {location_name}."

    if narrow_topic == "pfz":
        pfz = ocean.get("pfz_advisory", {})
        if pfz.get("data_kind") == "LIVE OFFICIAL INCOIS ADVISORY":
            point = pfz.get("nearest_pfz", {})
            dist = pfz.get("distance_from_user_km")
            dir_coast = point.get("direction_from_coast")
            dir_str = f" to the {dir_coast}" if dir_coast else ""
            coastal_ref = point.get("coastal_reference", "the coast")
            valid = pfz.get("valid_until", "the current advisory period")
            sector_str = f" {pfz.get('sector')}" if pfz.get("sector") else ""
            return (
                f"According to the official INCOIS{sector_str} advisory (valid until {valid}), "
                f"the nearest potential fishing zone is about {dist} km away{dir_str} near {coastal_ref}."
            )
        if pfz.get("data_kind") == "DEMO FIXTURE - NOT LIVE DATA":
            return f"Potential fishing zone guidance near {location_name} is currently relying on demo fallback data rather than live advisory feeds."
        return f"Potential fishing zone (PFZ) advisories are currently unavailable for {location_name}."

    if narrow_topic == "geofence":
        if geofence and geofence.get("status") == "ok":
            zone = geofence.get("zone_name", "the restricted marine zone")
            if geofence.get("inside_restricted_zone"):
                return f"Warning: your location near {location_name} is inside {zone}, where commercial fishing is restricted."
            dist = geofence.get("nearest_boundary_km")
            boundary_str = f"about {dist} km away" if dist is not None else "nearby"
            return f"Your location near {location_name} is currently outside {zone}, with the nearest boundary {boundary_str}."
        return f"Marine geofence and boundary status is currently unavailable for {location_name}."

    if narrow_topic == "score":
        safety_score = risk.get("safety_score")
        opp_score = risk.get("fishing_opportunity_score")
        status = risk.get("status", "UNKNOWN")
        status_word = {"SAFE": "favourable", "CAUTION": "caution", "UNSAFE": "unfavourable"}.get(status, "uncertain")
        if safety_score is not None and opp_score is not None:
            return f"Near {location_name}, your safety score is {safety_score}/100 and fishing opportunity score is {opp_score}/100, reflecting {status_word} conditions."
        if safety_score is not None:
            return f"Near {location_name}, your safety score is {safety_score}/100, reflecting {status_word} conditions."
        return f"Safety and fishing opportunity scores are currently unavailable for {location_name}."

    if narrow_topic == "sea_surface_temperature":
        mosdac = ocean.get("mosdac", {})
        sst = mosdac.get("sea_surface_temperature_c")
        source = "MOSDAC satellite"
        if sst is None and weather_ok:
            sst = weather.get("sea_surface_temperature_c")
            source = weather.get("source", "Open-Meteo")
        if sst is not None:
            return f"Sea surface temperature near {location_name} is currently {sst} °C, based on live {source} data."
        return f"Sea surface temperature data is currently unavailable for {location_name}."

    if narrow_topic == "chlorophyll":
        mosdac = ocean.get("mosdac", {})
        chloro = mosdac.get("chlorophyll_mg_m3")
        if chloro is not None:
            return f"Chlorophyll concentration near {location_name} is currently {chloro} mg/m³, based on live MOSDAC satellite data."
        return f"Chlorophyll concentration data is currently unavailable for {location_name}."

    return ""


def _fallback_narrative(intent: dict, weather: dict, ocean: dict, risk: dict, geofence: dict | None, route: dict | None) -> str:
    """Deterministic conversational narrative used when Sarvam LLM is unavailable."""
    intent = intent or {}
    weather = weather or {}
    ocean = ocean or {}
    risk = risk or {}

    if intent.get("is_coastal") is False:
        return intent.get("non_coastal_message") or "The requested location does not appear to be a coastal area."

    # Narrow single-topic query handling
    narrow_topic = intent.get("narrow_topic")
    if narrow_topic:
        short_ans = _narrow_fallback_narrative(narrow_topic, intent, weather, ocean, risk, geofence)
        if short_ans:
            return short_ans

    location_name = (intent.get("location") or {}).get("name", "your location")
    risk_status = risk.get("status", "UNKNOWN")

    status_label_map = {
        "SAFE": "favourable",
        "CAUTION": "caution",
        "UNSAFE": "unfavourable",
    }
    status_display = status_label_map.get(risk_status, "unavailable" if risk_status == "UNKNOWN" else risk_status.lower())

    safe_line = {
        "SAFE": "Conditions are currently within favourable operating thresholds.",
        "CAUTION": "Proceed only with caution and check official local advisories.",
        "UNSAFE": "Do not take a small fishing boat out under these conditions.",
    }.get(risk_status, "Status could not be determined; verify conditions with official advisories before going to sea.")

    sections = []

    # 1. Assessment & Status
    if weather.get("status") == "ok":
        forecast_valid_for = weather.get("forecast_valid_for", "unknown forecast time")
    else:
        forecast_valid_for = "unknown forecast time"

    advice = safe_line.strip()
    advice_clean = advice[0].lower() + advice[1:] if advice and advice[0].isupper() else advice
    assessment_sentence = (
        f"For {location_name} (forecast for {forecast_valid_for}), the marine assessment is {status_display}: {advice_clean}"
    )
    if not assessment_sentence.endswith("."):
        assessment_sentence += "."
    sections.append(assessment_sentence)

    # 2. Weather conditions
    satellite_part = ""
    mosdac = ocean.get("mosdac", {})
    if mosdac.get("status") == "parsed":
        sat_items = []
        if mosdac.get("sea_surface_temperature_c") is not None:
            sat_items.append(f"sea surface temperature is {mosdac['sea_surface_temperature_c']} degC")
        if mosdac.get("chlorophyll_mg_m3") is not None:
            sat_items.append(f"chlorophyll is {mosdac['chlorophyll_mg_m3']} mg/m3")
        if sat_items:
            satellite_part = f" Satellite observations from MOSDAC show {' and '.join(sat_items)}."

    if weather.get("status") == "ok":
        weather_sentence = (
            f"Current sea conditions indicate a wave height of {_fmt(weather.get('wave_height_m'), 'm')}, "
            f"wind speeds of {_fmt(weather.get('wind_speed_kmh'), 'km/h')}, and a swell period of "
            f"{_fmt(weather.get('swell_period_s'), 's')}.{satellite_part}"
        )
    else:
        weather_sentence = f"Live marine weather data is currently unavailable for this location.{satellite_part}"
    sections.append(weather_sentence)

    # 3. Geofence
    if geofence and geofence.get("status") == "ok":
        zone_name = geofence.get("zone_name", "the restricted zone")
        if geofence.get("inside_restricted_zone"):
            sections.append(f"Warning: your location is inside the {zone_name}, where fishing is restricted.")
        else:
            nearest_km = geofence.get("nearest_boundary_km")
            boundary_str = f"about {nearest_km} km away" if nearest_km is not None else "nearby"
            sections.append(
                f"You are currently outside the restricted zone ({zone_name}), with the nearest boundary {boundary_str}."
            )

    # 4. Route
    if route and route.get("status") == "ok":
        route_id = route.get("recommended_route_id", "standard route")
        max_wave = route.get("max_expected_wave")
        wave_str = f"with a maximum expected wave of {max_wave} m" if max_wave is not None else "under standard precautions"
        sections.append(f"The recommended navigational route is {route_id}, {wave_str}.")

    # 5. Scores
    score_parts = []
    if risk.get("safety_score") is not None:
        score_parts.append(f"safety score is {risk['safety_score']}/100")
    if risk.get("fishing_opportunity_score") is not None:
        score_parts.append(f"fishing opportunity score is {risk['fishing_opportunity_score']}/100")
    if score_parts:
        sections.append(f"Overall, your {' and your '.join(score_parts)}.")

    # 6. PFZ Advisory
    pfz = ocean.get("pfz_advisory", {})
    if pfz.get("data_kind") == "LIVE OFFICIAL INCOIS ADVISORY":
        point = pfz.get("nearest_pfz", {})
        dir_coast = point.get("direction_from_coast")
        dir_text = f" to the {dir_coast}" if dir_coast else ""
        coastal_ref = point.get("coastal_reference", "the coast")
        lat = point.get("latitude")
        lon = point.get("longitude")
        coords_str = f" ({lat}, {lon})" if lat is not None and lon is not None else ""
        sections.append(
            f"According to the official INCOIS {pfz.get('sector')} advisory (valid until {pfz.get('valid_until')}), "
            f"the nearest potential fishing zone is about {pfz.get('distance_from_user_km')} km away{dir_text} "
            f"near {coastal_ref}{coords_str}."
        )
    elif pfz.get("data_kind") == "DEMO FIXTURE - NOT LIVE DATA":
        sections.append("Potential fishing zone guidance is currently relying on demo fallback data rather than live advisory feeds.")
    else:
        sections.append("Potential fishing zone advisories are currently unavailable for this location.")

    # 7. Risk Basis (fixing double-period bug)
    raw_reasons = risk.get("reasons") or []
    cleaned_reasons = [r.strip().rstrip(".") for r in raw_reasons if r and r.strip()]
    if cleaned_reasons:
        reasons_text = ". ".join(cleaned_reasons) + "."
        sections.append(f"This risk assessment is based on the following: {reasons_text}")

    # 8. Data Source & Retrieval
    if weather.get("status") == "ok":
        source = weather.get("source", "marine weather service")
        retrieved_at = weather.get("retrieved_at", "recently")
        sections.append(f"Weather data was sourced from {source} (retrieved {retrieved_at}).")
    else:
        sections.append("Marine weather source information is currently unavailable.")

    return " ".join(sections)


def _translate_payload(payload: dict, language: dict) -> dict:
    """Translate the human-facing text fields, leaving the schema keys intact."""
    language = language or {}
    if language.get("status") != "ok" or language.get("reply_language_code", ENGLISH) == ENGLISH:
        return payload
    decision = payload.get("decisionOutput", {})
    for key in ("headline", "summary", "narrative"):
        if isinstance(decision.get(key), str) and decision[key]:
            decision[key] = translate_final_response(decision[key], language)
    return payload


def agent_7_response(
    intent: dict,
    weather: dict,
    ocean: dict,
    risk: dict,
    geofence: dict | None = None,
    route: dict | None = None,
) -> dict:
    language = intent.get("language", {})

    if intent.get("clarifying_question"):
        payload = build_orca_payload(intent, {}, {}, {}, geofence, route, narrative=None)
        payload["decisionOutput"]["status"] = "unavailable"
        payload["decisionOutput"]["headline"] = intent["clarifying_question"]
        payload["decisionOutput"]["narrative"] = intent["clarifying_question"]
        return _translate_payload(payload, language)

    if intent.get("is_coastal") is False:
        msg = intent.get("non_coastal_message") or "The requested location does not appear to be a coastal area."
        payload = build_orca_payload(intent, {}, {}, {}, geofence, route, narrative=msg)
        payload["decisionOutput"]["status"] = "unavailable"
        payload["decisionOutput"]["headline"] = msg
        payload["decisionOutput"]["summary"] = msg
        payload["decisionOutput"]["narrative"] = msg
        if "explainability" in payload and isinstance(payload["explainability"], dict):
            payload["explainability"]["summary"] = msg
        return _translate_payload(payload, language)

    narrative = _sarvam_response({
        "intent": intent,
        "weather": weather,
        "ocean": ocean,
        "risk": risk,
        "geofence": geofence or {},
        "route": route or {},
    }) or _fallback_narrative(intent, weather or {}, ocean or {}, risk or {}, geofence, route)

    payload = build_orca_payload(intent, weather, ocean, risk, geofence, route, narrative=narrative)
    if "decisionOutput" in payload and isinstance(payload["decisionOutput"], dict):
        payload["decisionOutput"]["narrative"] = narrative
    return _translate_payload(payload, language)
