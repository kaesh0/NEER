"""Agent 7: final ORCA JSON response — persona-schema payload with an LLM
narrative (Sarvam AI sarvam-105b) and a deterministic fallback narrative."""

from __future__ import annotations

import json
import re
from concurrent.futures import ThreadPoolExecutor

from services.payload_builder import build_orca_payload
from services.sarvam_service import ENGLISH, translate_final_response, sarvam_chat_completion


def _clean_sarvam_narrative(
    text: str,
    user_question: str | None = None,
    source_prompt: str | None = None,
    source_strings: list[str] | None = None,
) -> str | None:
    if not text:
        return None

    def _norm(value: str) -> str:
        # Strip EVERYTHING except letters/digits/spaces — the model re-quotes
        # and re-punctuates prompt text, so literal punctuation would miss.
        return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9\s]+", " ", (value or "").lower())).strip()

    norm_question = _norm(user_question)
    norm_prompt = _norm(source_prompt)
    # Raw data lines (risk reasons, PFZ strings) that the model may parrot
    # verbatim instead of writing a narrative.
    norm_sources = [_norm(s) for s in (source_strings or []) if s and len(_norm(s)) >= 25]

    # Reasoning models echo the system prompt inside reasoning_content; if that
    # echo survives extraction it renders as instructions to the fisherman.
    _PROMPT_ECHO_MARKERS = (
        "user_question", "question_category", "risk_status", "restricted_zone",
        "recent_conversation", "key_reasons", "json data", "output only",
        "<narrative", "</narrative", "system prompt",
    )

    def is_clean(candidate: str) -> bool:
        if not candidate or len(candidate.strip()) < 20:
            return False
        stripped = candidate.strip().strip("\"' ")
        if not stripped:
            return False
        lower = stripped.lower()
        poison_words = [
            "the user wants", "i must use only", "let me extract", "the instructions say",
            "the instruction says", "prompt says", "wait, the", "so i need to",
            "let me check", "check constraints", "key constraints",
            "evaluating against", "that's 3 sentences", "that's 2 sentences",
            "my draft:", "let me draft:", "sentence 1:", "i need to mention"
        ]
        if any(pw in lower for pw in poison_words):
            return False
        if any(marker in lower for marker in _PROMPT_ECHO_MARKERS):
            return False
        norm_candidate = _norm(stripped)
        # The model restating the user's question (in whole or part) is an echo,
        # not an answer.
        if norm_question and norm_question in norm_candidate:
            return False
        # Any candidate that is a literal fragment of the system prompt IS the
        # prompt leaking — catch every rule-echo variant without whack-a-mole.
        if norm_prompt and len(norm_candidate) >= 25 and norm_candidate in norm_prompt:
            return False
        # Same for raw pipeline data lines parroted back as the "answer".
        if any(norm_candidate == s or (len(norm_candidate) >= 25 and norm_candidate in s) for s in norm_sources):
            return False
        # Bare continuation fragments ("and what about tomorrow morning?")
        # answer nothing on their own.
        if re.match(r"^(and|but|or|so|also|what about|aur)\b", lower):
            return False
        # Structural guards: a conversational answer is 1-3 plain sentences.
        # Reasoning fragments look like bullet lists, field mappings, truncated
        # thoughts, or snake_case JSON field references — reject them all.
        if not stripped[0].isalnum():
            return False
        if stripped[-1] not in ".!।":
            return False
        if re.search(r"(?m)^\s*[-*•]\s", stripped):
            return False
        if "->" in stripped:
            return False
        if re.search(r"\b[a-z]+(?:_[a-z]+)+\b", stripped):
            return False
        if len(re.findall(r"(?:^|\s)\d\.\s+\S", stripped)) >= 2:
            return False
        if stripped.count("\n") >= 3:
            return False
        return True

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
    devanagari_blocks = re.findall(r'[\u0900-\u097F][\u0900-\u097F\s\d.,/!?:;\'"()\-।॥]{20,}', text)
    if devanagari_blocks:
        longest = max(devanagari_blocks, key=len).strip().strip('"\' ')
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
            cand = sub_parts[0].strip().strip('"\' \n')
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
        head = parts[0].strip().strip("\"' \n")
        m_sent = re.findall(r".*?[.!।](?:\s|$)", head, re.DOTALL)
        cand = "".join(m_sent).strip().strip("\"' ") if m_sent else head
        if is_clean(cand):
            return cand

    # 6. If entire text is already clean and not excessively long (< 120 words)
    words = text.split()
    if len(words) < 120 and is_clean(text):
        return text.strip(' "”\'')

    # Dirty text with unparseable reasoning fails gracefully to fallback narrative
    return None


def _focus_payload(
    intent: dict, weather: dict, ocean: dict, risk: dict,
    geofence: dict | None, route: dict | None, history: list | None,
) -> dict:
    """Slim, question-focused view of pipeline data for the narrative LLM.

    The full ORCA payload ships in the response JSON; feeding all of it to the
    LLM is what produced data-dump answers. The narrative must answer THE
    question, so it only sees what is relevant to the query type. Safety
    fields (risk status, restricted zone) are never trimmed.
    """
    query_type = intent.get("query_type", "marine_conditions")
    risk_status = risk.get("status")
    view: dict = {
        "user_question": intent.get("original_query"),
        "location": (intent.get("location") or {}).get("name", "your location"),
        "question_category": query_type,
        "risk_status": risk_status,
        # Only carry the actual concerns — for SAFE weather the reasons are the
        # "all parameters within limits" line, which the model just parrots back.
        "key_reasons": (risk.get("reasons") or [])[:3] if risk_status in ("CAUTION", "UNSAFE") else [],
    }
    if weather.get("status") == "ok":
        conditions = {
            key: weather.get(key)
            for key in ("wave_height_m", "wind_speed_kmh", "swell_period_s")
            if weather.get(key) is not None
        }
        if conditions:
            view["conditions"] = conditions
    if geofence and geofence.get("inside_restricted_zone"):
        view["restricted_zone"] = geofence.get("zone_name", "a protected area")
    pfz = (ocean or {}).get("pfz_advisory", {}) or {}
    if query_type == "fishing" and pfz.get("data_kind") == "LIVE OFFICIAL INCOIS ADVISORY":
        nearest = pfz.get("nearest_pfz") or {}
        view["nearest_fishing_zone"] = {
            "distance_km": pfz.get("distance_from_user_km"),
            "direction": nearest.get("direction_from_coast"),
            "reference": nearest.get("coastal_reference"),
        }
    if query_type == "safety" and isinstance(route, dict) and route.get("status") == "ok":
        view["safest_route"] = route.get("recommended_route_id")
    if history:
        view["recent_conversation"] = history[-3:]
    return view


_NARRATIVE_SYSTEM_PROMPT = """\
You are NEER, a warm marine assistant for Indian coastal fishermen and authorities.

Answer the user's question using ONLY the supplied JSON data.
Write 2-4 short conversational sentences, like advice to a friend before a fishing trip.

Rules:
- FIRST answer what the user actually asked (user_question / question_category).
- Mention ONLY the numbers that matter for that question — never dump all data.
- Safety overrides brevity: if risk_status is CAUTION or UNSAFE, or a
  restricted_zone is present, say it clearly and simply.
- Everyday words only: "waves", "wind", "sea" — no raw field names, timestamps,
  coordinates, scores, or source names unless the user explicitly asked for them.
- Do not add disclaimers beyond what the data shows.
Output ONLY the final narrative strictly between <narrative> and </narrative> tags,
with no reasoning, notes, or analysis inside.
"""


def _sarvam_response(view: dict) -> str | None:
    messages = [
        {"role": "system", "content": _NARRATIVE_SYSTEM_PROMPT},
        {"role": "user", "content": json.dumps(view, ensure_ascii=False)},
    ]
    raw = sarvam_chat_completion(messages, temperature=0.3, max_tokens=512)
    if not raw:
        return None
    return _clean_sarvam_narrative(
        raw,
        user_question=view.get("user_question"),
        source_prompt=_NARRATIVE_SYSTEM_PROMPT,
        source_strings=view.get("key_reasons") or [],
    )


def _fallback_narrative(intent: dict, weather: dict, ocean: dict, risk: dict, geofence: dict | None, route: dict | None) -> str:
    """Deterministic, question-focused narrative used when Sarvam is unavailable.

    Mirrors the LLM rules: answer the question first, keep only relevant
    numbers, never drop a safety-critical warning. The complete data set still
    lives in the ORCA payload around this narrative.
    """
    location_name = (intent.get("location") or {}).get("name", "your location")
    query_type = intent.get("query_type", "marine_conditions")
    status = risk.get("status", "UNKNOWN")

    lead = {
        "SAFE": f"Yes — conditions at {location_name} look safe right now.",
        "CAUTION": f"Be careful — sea conditions at {location_name} are moderate right now.",
        "UNSAFE": f"No — do not take a boat out near {location_name} right now.",
        "UNKNOWN": f"I could not verify live conditions at {location_name} just now.",
    }.get(status, f"I could not fully assess conditions at {location_name} just now.")
    parts = [lead]

    reasons = risk.get("reasons") or []
    if status in ("CAUTION", "UNSAFE"):
        # Only surface genuine warning reasons: skip the geofence line (the
        # dedicated warning below covers it) and the all-clear line agent 6
        # adds for SAFE weather — "main concern: everything is fine" reads
        # like a contradiction.
        concern = next(
            (
                r for r in reasons
                if "restricted" not in r.lower()
                and "inside" not in r.lower()
                and "within safe operational limits" not in r.lower()
            ),
            None,
        )
        if concern:
            parts.append(f"Main concern: {concern}")

    if geofence and geofence.get("inside_restricted_zone"):
        parts.append(
            f"Warning: you are inside the {geofence.get('zone_name', 'restricted zone')} — "
            "fishing is restricted there."
        )

    if weather.get("status") == "ok":
        wave, wind = weather.get("wave_height_m"), weather.get("wind_speed_kmh")
        if wave is not None and wind is not None:
            parts.append(f"Waves are around {wave} m with winds near {wind} km/h.")

    pfz = (ocean or {}).get("pfz_advisory", {}) or {}
    if query_type == "fishing" and pfz.get("data_kind") == "LIVE OFFICIAL INCOIS ADVISORY":
        direction = (pfz.get("nearest_pfz") or {}).get("direction_from_coast") or "near"
        parts.append(
            f"Nearest fishing zone is about {pfz.get('distance_from_user_km')} km {direction} of {location_name}."
        )

    advice = {
        "SAFE": "Still carry safety gear and tell someone ashore before you leave.",
        "CAUTION": "Check the latest official advisory before you decide.",
        "UNSAFE": "Wait for the sea to calm down before planning your trip.",
        "UNKNOWN": "Please verify with official advisories before going to sea.",
    }.get(status)
    if advice:
        parts.append(advice)
    return " ".join(parts)


def _translate_payload(payload: dict, language: dict) -> dict:
    """Translate the human-facing text fields, leaving the schema keys intact.

    The three fields are independent translations, so they run concurrently
    instead of paying three round-trip latencies back to back.
    """
    language = language or {}
    if language.get("status") != "ok" or language.get("reply_language_code", ENGLISH) == ENGLISH:
        return payload
    decision = payload.get("decisionOutput", {})
    fields = [
        key for key in ("headline", "summary", "narrative")
        if isinstance(decision.get(key), str) and decision[key]
    ]
    if not fields:
        return payload
    with ThreadPoolExecutor(max_workers=len(fields)) as pool:
        translated = list(pool.map(
            lambda key: translate_final_response(decision[key], language), fields
        ))
    for key, value in zip(fields, translated):
        decision[key] = value
    return payload


def agent_7_response(
    intent: dict,
    weather: dict,
    ocean: dict,
    risk: dict,
    geofence: dict | None = None,
    route: dict | None = None,
    history: list | None = None,
    fast: bool = False,
) -> dict:
    language = intent.get("language", {})

    if intent.get("clarifying_question"):
        payload = build_orca_payload(intent, {}, {}, {}, geofence, route, narrative=None)
        payload["decisionOutput"]["status"] = "unavailable"
        payload["decisionOutput"]["headline"] = intent["clarifying_question"]
        payload["decisionOutput"]["narrative"] = intent["clarifying_question"]
        # Downstream readers (terminal, Node chat, dashboards) prefer
        # explainability.summary — it must carry the question, not the generic
        # "ORCA marked conditions as unavailable..." default narrative.
        if payload.get("explainability"):
            payload["explainability"]["summary"] = intent["clarifying_question"]
        return _translate_payload(payload, language)

    # Fast mode (dashboards) skips the narrative LLM — the deterministic
    # narrative is instant and the dashboards read the structured JSON anyway.
    sarvam_narrative = (
        _sarvam_response(
            _focus_payload(intent, weather or {}, ocean or {}, risk or {}, geofence, route, history)
        )
        if not fast
        else None
    )
    narrative = sarvam_narrative or _fallback_narrative(
        intent, weather or {}, ocean or {}, risk or {}, geofence, route
    )

    payload = build_orca_payload(intent, weather, ocean, risk, geofence, route, narrative=narrative)
    if payload.get("explainability"):
        payload["explainability"]["narrativeSource"] = "sarvam" if sarvam_narrative else "deterministic-fallback"
    return _translate_payload(payload, language)
