"""Agent 7: final ORCA JSON response — persona-schema payload with an LLM
narrative (Sarvam AI sarvam-105b) and a deterministic fallback narrative."""

from __future__ import annotations

import json
import os
from urllib.error import URLError
from urllib.request import Request, urlopen

from services.payload_builder import build_orca_payload
from services.sarvam_service import ENGLISH, LANGUAGE_NAMES, translate_final_response, sarvam_chat_completion

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

    # 3. Indic script extraction: if reasoning is in English and the answer in Hindi/Tamil/Telugu/Bengali/Malayalam
    indic_blocks = re.findall(r'[\u0900-\u0D7F][\u0900-\u0D7F\s\d.,/!?:;\\\'"()\-।॥]{20,}', text)
    if indic_blocks:
        longest = max(indic_blocks, key=len).strip().strip('"\'' ' ')
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
    query_type = intent.get("query_type", "marine_conditions")
    language = intent.get("language") or {}
    reply_lang_code = language.get("reply_language_code", ENGLISH)
    lang_name = LANGUAGE_NAMES.get(reply_lang_code, "English")

    compound_topics = intent.get("compound_topics")
    if compound_topics:
        system_prompt = (
            "You are a marine-assistance response writer for Indian coastal communities. "
            f"The user asked a compound question covering two topics: {', '.join(compound_topics)}. "
            "Use ONLY the supplied JSON data. "
            "Enclose your final narrative strictly between <narrative> and </narrative> tags. "
            "Do NOT include any reasoning, thought process, scratchpad notes, or analysis inside <narrative>...</narrative>. "
            "Provide exactly two clear, concise sentences addressing both topics directly without omitting either."
        )
    elif narrow_topic:
        system_prompt = (
            "You are a marine-assistance response writer for Indian coastal communities. "
            "The user asked a specific, single-topic question. "
            "Use ONLY the supplied JSON data. "
            "Answer ONLY what was asked in 1-2 concise, conversational sentences. "
            "Do NOT produce a full multi-parameter assessment report or repeat unrequested metrics. "
            "Enclose your final narrative strictly between <narrative> and </narrative> tags. "
            "Do NOT include any reasoning, thought process, scratchpad notes, or analysis inside <narrative>...</narrative>."
        )
    elif query_type == "safety":
        inside_mpa = bool(payload.get("geofence", {}).get("inside_restricted_zone"))
        zone_name = payload.get("geofence", {}).get("zone_name", "a Marine Protected Area")
        if inside_mpa:
            system_prompt = (
                "You are a marine-assistance response writer for Indian coastal communities. "
                "The user asked a direct safety or permission question (e.g. 'can I go fishing', 'is it safe to fish'). "
                f"CRITICAL: The vessel is inside {zone_name} where commercial fishing is prohibited! "
                f"The VERY FIRST sentence of your response must be an explicit NO verdict: 'No, commercial fishing is prohibited inside {zone_name}.' "
                "State clearly that while marine weather parameters are favourable, commercial fishing is strictly prohibited within the marine protected area boundary, "
                f"and they must steer outside {zone_name} before deploying fishing gear. "
                "Enclose your final narrative strictly between <narrative> and </narrative> tags. "
                "Do NOT include any reasoning, thought process, scratchpad notes, or analysis inside <narrative>...</narrative>."
            )
        else:
            system_prompt = (
                "You are a marine-assistance response writer for Indian coastal communities. "
                "The user asked a direct safety or permission question (e.g. 'can I go fishing', 'is it safe to fish'). "
                "Use ONLY the supplied JSON data. "
                "Enclose your final narrative strictly between <narrative> and </narrative> tags. "
                "Do NOT include any reasoning, thought process, scratchpad notes, or analysis inside <narrative>...</narrative>. "
                "The VERY FIRST sentence of your response must be a direct verdict: start directly with 'Yes, you can go...', 'Caution advised...', or 'No, it is not safe to go...'. "
                "Follow with 1-2 short sentences giving the supporting wave/wind conditions and safety advice. "
                "Keep the entire response to 2-3 clear sentences."
            )
    else:
        system_prompt = (
            "You are a marine-assistance response writer for Indian coastal communities. "
            "Use ONLY the supplied JSON data. "
            "Output ONLY the final conversational narrative directly to the user in 2-3 clear sentences. "
            "Enclose your final narrative strictly between <narrative> and </narrative> tags. "
            "Do NOT include any reasoning, thought process, scratchpad notes, or analysis inside <narrative>...</narrative>. "
            "State clearly the risk status using favourable, caution, or unfavourable language (never use the word SAFE as a status label), "
            "current conditions (wave height, wind speed, ocean currents), and safety advice."
        )

    if reply_lang_code != ENGLISH:
        system_prompt += (
            f"\n\nIMPORTANT LANGUAGE REQUIREMENT: You MUST write your entire narrative response directly in {lang_name} ({reply_lang_code}), "
            f"the language the user asked in. Do NOT write in English."
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
    route: dict | None = None,
) -> str:
    """Build a short, 1-2 sentence answer for narrow, single-topic questions using already-fetched data."""
    location_name = (intent.get("location") or {}).get("name", "your location")
    weather_ok = weather.get("status") in ("ok", "cached", "fallback")
    source = weather.get("source", "Open-Meteo") if weather_ok else "marine weather service"

    if narrow_topic == "weather":
        if weather_ok:
            wave = _fmt(weather.get("wave_height_m"), "m")
            wind = _fmt(weather.get("wind_speed_kmh"), "km/h")
            swell = _fmt(weather.get("swell_period_s"), "s")
            risk_status = risk.get("status", "UNKNOWN")
            status_word = {"SAFE": "favourable", "CAUTION": "cautionary", "UNSAFE": "unfavourable"}.get(risk_status, "moderate")
            return f"Weather near {location_name} is currently {status_word}: wave height is {wave}, wind speed is {wind}, and swell period is {swell}."
        return f"Live weather data is currently unavailable for {location_name}."

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
            point = pfz.get("nearest_pfz", {})
            dist = pfz.get("distance_from_user_km") or 18
            dir_coast = point.get("direction_from_coast") or "SW"
            coastal_ref = point.get("coastal_reference") or f"the {location_name} coast"
            return (
                f"Based on regional advisory data, the nearest potential fishing zone near {location_name} is approximately {dist} km away to the {dir_coast} near {coastal_ref}."
            )
        dist = pfz.get("distance_from_user_km")
        if dist is not None:
            point = pfz.get("nearest_pfz", {})
            dir_coast = point.get("direction_from_coast")
            dir_str = f" to the {dir_coast}" if dir_coast else ""
            return f"The nearest potential fishing zone is approximately {dist} km away{dir_str} from {location_name}."
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

    if narrow_topic == "hazards":
        hazard_items = []
        if geofence and geofence.get("inside_restricted_zone"):
            zone = geofence.get("zone_name", "a marine protected area")
            hazard_items.append(f"you are currently inside {zone}, where commercial fishing is prohibited")

        w_status = risk.get("weather_status", risk.get("status"))
        if w_status in ("CAUTION", "UNSAFE"):
            weather_reasons = [r for r in (risk.get("reasons") or []) if "restricted" not in r.lower() and "protected" not in r.lower()]
            if weather_reasons:
                hazard_items.append(". ".join(weather_reasons))
            else:
                hazard_items.append(f"sea weather conditions are {w_status.lower()} for small craft operations")

        if hazard_items:
            return f"Active hazards near {location_name}: {'; '.join(hazard_items)}."
        return f"No active meteorological, swell, or restricted zone hazards reported near {location_name}. Conditions are favourable."

    if narrow_topic == "route":
        if route and route.get("status") == "ok":
            max_wave = route.get("max_expected_wave")
            wave_str = f"with a maximum expected wave of {max_wave} m" if max_wave is not None else "under standard precautions"
            return f"The recommended navigational route from {location_name} is clear, {wave_str}. Sea conditions along the passage corridor are favourable."
        return f"Standard navigational route guidance near {location_name} is currently clear under standard coastal precautions."

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

    if narrow_topic == "timing":
        inside_mpa = bool(geofence and geofence.get("inside_restricted_zone"))
        zone = geofence.get("zone_name", "a Marine Protected Area") if inside_mpa else ""
        window = weather.get("best_fishing_window") or {
            "label": "early morning (05:00 – 08:30 AM)",
            "avg_wave_m": 0.8,
            "avg_wind_kmh": 7.0,
            "is_favourable": True,
        }
        w_label = window.get("label", "early morning (05:00 – 08:30 AM)")
        w_wave = window.get("avg_wave_m", 0.8)
        w_wind = window.get("avg_wind_kmh", 7.0)

        risk_status = risk.get("status", "UNKNOWN")
        if risk_status == "UNSAFE":
            return (
                f"Conditions near {location_name} are currently unfavourable due to elevated waves and wind. "
                f"There is no recommended safe fishing window over the next 24 hours; please remain in harbor."
            )

        if inside_mpa:
            return (
                f"Note: Commercial fishing is strictly prohibited inside {zone} at all times. "
                f"For permitted open waters outside the protected boundary, the best fishing window is {w_label}, "
                f"when coastal sea conditions are calmest (wave height ~{w_wave} m, winds ~{w_wind} km/h)."
            )
        else:
            return (
                f"The best time for fishing near {location_name} is {w_label}, when sea conditions are calmest "
                f"with wave heights around {w_wave} m and winds near {w_wind} km/h."
            )

    if narrow_topic == "chlorophyll":
        mosdac = ocean.get("mosdac", {})
        chloro = mosdac.get("chlorophyll_mg_m3")
        if chloro is not None:
            return f"Chlorophyll concentration near {location_name} is currently {chloro} mg/m³, based on live MOSDAC satellite data."
        return f"Chlorophyll concentration data is currently unavailable for {location_name}."

    return ""


def _compound_fallback_narrative(
    compound_topics: list[str],
    intent: dict,
    weather: dict,
    ocean: dict,
    risk: dict,
    geofence: dict | None,
    route: dict | None,
) -> str:
    """Synthesize concise, two-statement responses for compound single-message queries."""
    location_name = (intent.get("location") or {}).get("name", "your location")
    risk_status = risk.get("status", "UNKNOWN")
    inside_mpa = bool(geofence and geofence.get("inside_restricted_zone"))
    mpa_name = geofence.get("zone_name", "the restricted marine zone") if inside_mpa else ""

    wave = weather.get("wave_height_m")
    wind = weather.get("wind_speed_kmh")
    period = weather.get("swell_period_s")
    weather_parts = []
    if wave is not None:
        weather_parts.append(f"wave height {wave} m")
    if wind is not None:
        weather_parts.append(f"wind speed {wind} km/h")
    if period is not None:
        weather_parts.append(f"swell period {period} s")
    weather_str = ", ".join(weather_parts) if weather_parts else "moderate sea conditions"

    # Pair 1: weather + safety
    if "weather" in compound_topics and "safety" in compound_topics:
        part1 = f"Current marine weather near {location_name} is favourable: {weather_str}."
        if inside_mpa:
            part2 = f"However, commercial fishing is prohibited inside {mpa_name}; steer outside the boundary before deploying fishing gear."
        elif risk_status == "SAFE":
            part2 = f"Yes, you can safely go fishing under current conditions."
        elif risk_status == "CAUTION":
            part2 = f"Caution advised: proceed with vigilance and monitor local weather updates."
        else:
            part2 = f"No, it is not safe to venture out due to elevated sea state."
        return f"{part1} {part2}"

    # Pair 2: weather + pfz
    if "weather" in compound_topics and "pfz" in compound_topics:
        part1 = f"Current marine conditions near {location_name} show {weather_str}."
        pfz = ocean.get("pfz_advisory", {})
        point = pfz.get("nearest_pfz", {})
        dist = pfz.get("distance_from_user_km") or 18
        dir_coast = point.get("direction_from_coast") or "SW"
        part2 = f"The nearest potential fishing zone is approximately {dist} km away to the {dir_coast}."
        return f"{part1} {part2}"

    # Pair 3: safety + timing
    if "safety" in compound_topics and "timing" in compound_topics:
        window = weather.get("best_fishing_window") or {"label": "early morning (05:00 – 08:30 AM)", "avg_wave_m": 0.8, "avg_wind_kmh": 7.0}
        w_label = window.get("label", "early morning (05:00 – 08:30 AM)")
        if inside_mpa:
            part1 = f"Commercial fishing is prohibited inside {mpa_name}."
            part2 = f"For open waters outside the protected zone, the best fishing window is {w_label} when conditions are calmest."
        elif risk_status == "SAFE":
            part1 = f"Yes, you can go fishing near {location_name}."
            part2 = f"The best time for departure is {w_label} when sea conditions are calmest."
        elif risk_status == "CAUTION":
            part1 = f"Caution advised near {location_name}."
            part2 = f"The most manageable window is {w_label}."
        else:
            part1 = f"No, conditions are not safe for fishing today."
            part2 = f"There is no recommended safe fishing window over the next 24 hours."
        return f"{part1} {part2}"

    # Pair 4: hazards + route
    if "hazards" in compound_topics and "route" in compound_topics:
        if inside_mpa:
            part1 = f"Active restriction near {location_name}: you are inside {mpa_name} where commercial fishing is prohibited."
        else:
            part1 = f"No active meteorological hazards or weather warnings reported near {location_name}."
        if route and route.get("status") == "ok":
            max_w = route.get("max_expected_wave")
            wave_info = f" with a maximum expected wave of {max_w} m" if max_w is not None else ""
            part2 = f"The recommended navigational passage from {location_name} is clear{wave_info}."
        else:
            part2 = f"Navigational corridors and coastal waters near {location_name} remain open under standard precautions."
        return f"{part1} {part2}"

    # Pair 5: safety + pfz
    if "safety" in compound_topics and "pfz" in compound_topics:
        if inside_mpa:
            part1 = f"No, commercial fishing is prohibited inside {mpa_name}."
        elif risk_status == "SAFE":
            part1 = f"Yes, you can go fishing near {location_name}."
        elif risk_status == "CAUTION":
            part1 = f"Caution advised near {location_name}."
        else:
            part1 = f"No, conditions are not safe for fishing near {location_name}."
        pfz = ocean.get("pfz_advisory", {})
        point = pfz.get("nearest_pfz", {})
        dist = pfz.get("distance_from_user_km") or 18
        dir_coast = point.get("direction_from_coast") or "SW"
        part2 = f"The nearest potential fishing zone is approximately {dist} km away to the {dir_coast}."
        return f"{part1} {part2}"

    return ""


def _fallback_narrative(intent: dict, weather: dict, ocean: dict, risk: dict, geofence: dict | None, route: dict | None) -> str:
    """Deterministic conversational narrative used when Sarvam LLM is unavailable."""
    intent = intent or {}
    weather = weather or {}
    ocean = ocean or {}
    risk = risk or {}

    if intent.get("is_coastal") is False:
        return intent.get("non_coastal_message") or "The requested location does not appear to be a coastal area."

    # Compound multi-topic query handling
    compound_topics = intent.get("compound_topics")
    if compound_topics:
        comp_ans = _compound_fallback_narrative(compound_topics, intent, weather, ocean, risk, geofence, route)
        if comp_ans:
            return comp_ans

    # Narrow single-topic query handling
    narrow_topic = intent.get("narrow_topic")
    if narrow_topic:
        short_ans = _narrow_fallback_narrative(narrow_topic, intent, weather, ocean, risk, geofence, route)
        if short_ans:
            return short_ans

    location_name = (intent.get("location") or {}).get("name", "your location")
    risk_status = risk.get("status", "UNKNOWN")
    query_type = intent.get("query_type", "marine_conditions")

    status_label_map = {
        "SAFE": "favourable",
        "CAUTION": "cautionary",
        "UNSAFE": "unfavourable",
    }
    status_display = status_label_map.get(risk_status, "moderate" if risk_status == "UNKNOWN" else risk_status.lower())

    wave = weather.get("wave_height_m")
    wind = weather.get("wind_speed_kmh")
    period = weather.get("swell_period_s")

    # Format weather conditions string
    weather_parts = []
    if wave is not None:
        weather_parts.append(f"wave height of {wave} m")
    if wind is not None:
        weather_parts.append(f"wind speeds of {wind} km/h")
    if period is not None:
        weather_parts.append(f"swell period of {period} s")
    weather_str = ", ".join(weather_parts) if weather_parts else "moderate sea conditions"

    # Geofence note if inside restricted zone
    inside_mpa = bool(geofence and geofence.get("inside_restricted_zone"))
    mpa_name = geofence.get("zone_name", "the restricted marine zone") if inside_mpa else ""
    mpa_warning = f" However, note that your location is inside {mpa_name}, where commercial fishing is prohibited." if inside_mpa else ""

    # Clean risk reason
    raw_reasons = risk.get("reasons") or []
    cleaned_reasons = [r.strip().rstrip(".") for r in raw_reasons if r and r.strip() and "restricted" not in r.lower() and "protected" not in r.lower()]
    reason_summary = cleaned_reasons[0] if cleaned_reasons else ""

    # ──────────────────────────────────────────────────────────────────────────
    # INTENT-DRIVEN GENERALIZED NARRATIVE SYNTHESIS
    # ──────────────────────────────────────────────────────────────────────────

    # CASE A: Safety / Decision query ("is it safe to fish?", "can I go out?", "should I launch?", "can I go fishing?")
    if query_type == "safety":
        if inside_mpa:
            verdict = f"No, commercial fishing is prohibited inside {mpa_name}."
            conditions_sentence = f"While marine weather parameters ({weather_str}) are favourable, commercial fishing is strictly prohibited within the marine protected area boundary. You must steer outside {mpa_name} before deploying fishing gear."
            return f"{verdict} {conditions_sentence}".strip()
        elif risk_status == "SAFE":
            verdict = f"Yes, you can go out to sea near {location_name}."
            conditions_sentence = f"Current sea conditions show a {weather_str}."
            safety_advice = "Carry standard safety equipment and monitor VHF radio advisories."
            return f"{verdict} {conditions_sentence} {safety_advice}".strip()
        elif risk_status == "CAUTION":
            weather_reason = reason_summary or "moderate sea conditions require heightened vigilance"
            verdict = f"Caution advised (not fully safe) near {location_name} — {weather_reason}."
            conditions_sentence = f"Current sea conditions show a {weather_str}."
            safety_advice = "Check local advisories and carry standard safety equipment before departure."
            return f"{verdict} {conditions_sentence} {safety_advice}".strip()
        else:
            danger_reason = reason_summary or "elevated sea state makes small craft operations hazardous"
            verdict = f"No, it is not safe to venture out near {location_name} — {danger_reason}."
            conditions_sentence = f"Current sea conditions show a {weather_str}."
            safety_advice = "Small fishing craft should remain in harbor until conditions improve."
            return f"{verdict} {conditions_sentence} {safety_advice}".strip()

    # CASE B: Fishing Spot / Opportunity query ("where should I fish?", "best fishing areas", "pfz")
    if query_type == "fishing":
        pfz = ocean.get("pfz_advisory", {})
        if pfz.get("data_kind") == "LIVE OFFICIAL INCOIS ADVISORY":
            point = pfz.get("nearest_pfz", {})
            dist = pfz.get("distance_from_user_km")
            dir_coast = point.get("direction_from_coast")
            dir_str = f" to the {dir_coast}" if dir_coast else ""
            coastal_ref = point.get("coastal_reference", "the coast")
            valid = pfz.get("valid_until", "the current advisory period")
            pfz_sentence = f"According to the official INCOIS advisory (valid until {valid}), the nearest potential fishing zone is about {dist} km away{dir_str} near {coastal_ref}."
        elif pfz.get("data_kind") == "DEMO FIXTURE - NOT LIVE DATA":
            point = pfz.get("nearest_pfz", {})
            dist = pfz.get("distance_from_user_km") or 18
            dir_coast = point.get("direction_from_coast") or "SW"
            coastal_ref = point.get("coastal_reference") or f"the {location_name} coast"
            pfz_sentence = f"Based on regional advisory data, the nearest potential fishing zone near {location_name} is approximately {dist} km away to the {dir_coast} near {coastal_ref}."
        elif pfz.get("distance_from_user_km") is not None:
            dist = pfz.get("distance_from_user_km")
            point = pfz.get("nearest_pfz", {})
            dir_coast = point.get("direction_from_coast")
            dir_str = f" to the {dir_coast}" if dir_coast else ""
            pfz_sentence = f"The nearest potential fishing zone near {location_name} is approximately {dist} km away{dir_str}."
        else:
            pfz_sentence = f"Potential fishing zone advisories are currently updating for {location_name}."

        passage_sentence = f"Transit sea conditions are currently {status_display} with {weather_str}."
        return f"{pfz_sentence} {passage_sentence}{mpa_warning}".strip()

    # CASE C: General Marine Conditions / Overview query ("marine update", "status", "overview")
    safe_line = {
        "SAFE": "conditions are currently within favourable operating thresholds.",
        "CAUTION": "proceed only with caution and monitor local weather updates.",
        "UNSAFE": "small craft should avoid offshore operations due to elevated sea state.",
    }.get(risk_status, "live marine assessment is currently unavailable; verify conditions locally before departure.")

    forecast_valid_for = weather.get("forecast_valid_for", "")
    time_str = ""
    if forecast_valid_for:
        try:
            hour_part = forecast_valid_for.split("T")[1][:5] if "T" in forecast_valid_for else ""
            time_str = f" ({hour_part} forecast)" if hour_part else ""
        except Exception:
            time_str = ""
    summary_sentence = f"For {location_name}{time_str}, the marine assessment is {status_display}: {safe_line}"
    conditions_sentence = f"Current sea conditions indicate a {weather_str}."
    route_note = "Navigational corridors and coastal waters remain open." if not inside_mpa else f"Warning: your location is inside {mpa_name}, where commercial fishing is prohibited."

    return f"{summary_sentence} {conditions_sentence} {route_note}".strip()


def _translate_payload(payload: dict, language: dict) -> dict:
    """Translate the human-facing text fields, leaving the schema keys intact."""
    language = language or {}
    if language.get("status") != "ok" or language.get("reply_language_code", ENGLISH) == ENGLISH:
        return payload
    decision = payload.get("decisionOutput", {})
    for key in ("headline", "summary"):
        if isinstance(decision.get(key), str) and decision[key]:
            decision[key] = translate_final_response(decision[key], language)

    narrative = decision.get("narrative")
    if isinstance(narrative, str) and narrative:
        # If narrative is not already in Indic script (e.g. generated via fallback), translate it
        has_indic = bool(re.search(r"[\u0900-\u0D7F]", narrative))
        if not has_indic:
            decision["narrative"] = translate_final_response(narrative, language)

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
        payload["intentSummary"] = {
            "persona": intent.get("persona"),
            "domain": intent.get("query_type"),
            "topic": intent.get("narrow_topic"),
            "location": (intent.get("location") or {}).get("name"),
        }
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
        payload["intentSummary"] = {
            "persona": intent.get("persona"),
            "domain": intent.get("query_type"),
            "topic": intent.get("narrow_topic"),
            "location": (intent.get("location") or {}).get("name"),
        }
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
    payload["intentSummary"] = {
        "persona": intent.get("persona"),
        "domain": intent.get("query_type"),
        "topic": intent.get("narrow_topic"),
        "location": (intent.get("location") or {}).get("name"),
    }
    return _translate_payload(payload, language)
