"""Sarvam text-language layer used before Agent 1 and after Agent 5."""

from __future__ import annotations

import os


ENGLISH = "en-IN"


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


_HINDI_MARKERS = {
    "kya", "kyu", "hoga", "hogi", "hoge", "hai", "hain", "paas", "pass", "kal", "aaj", "kl",
    "subah", "shaam", "dopahar", "raat", "ke", "ki", "ka", "ko", "se", "me", "mein",
    "nahi", "machli", "machhli", "surakshit", "theek", "jaana", "krna", "karna", "baare"
}


def _heuristic_language(query: str) -> str:
    tokens = {w.lower() for w in query.split()}
    if tokens & _HINDI_MARKERS:
        return "hi-IN"
    return ENGLISH


def prepare_for_agent_1(query: str) -> tuple[str, dict]:
    """Detect typed language and translate non-English text into English for Agent 1.

    Latency guard: a pure-ASCII query whose heuristic says English skips the
    paid identify_language call entirely — Hinglish (also ASCII) still contains
    Hindi marker tokens, so the heuristic routes it to the API path.
    """
    import time
    detected_fallback = _heuristic_language(query)
    is_ascii = all(ord(ch) < 128 for ch in query)
    if is_ascii and detected_fallback == ENGLISH:
        return query, {
            "status": "ok",
            "input_language_code": ENGLISH,
            "reply_language_code": ENGLISH,
            "note": "Detected via local heuristic (no API call).",
        }

    client = _client()
    if not client:
        return query, {"status": "disabled", "input_language_code": detected_fallback, "reply_language_code": detected_fallback, "note": "Set SARVAM_API_KEY to enable typed-language translation."}

    last_exc = None
    for attempt in range(2):
        try:
            detection = client.text.identify_language(input=query)
            source_language = _get_value(detection, "language_code") or detected_fallback
            metadata = {"status": "ok", "input_language_code": source_language, "reply_language_code": source_language}
            if source_language == ENGLISH:
                return query, metadata
            translation = client.text.translate(
                input=query,
                source_language_code=source_language,
                target_language_code=ENGLISH,
                model=os.getenv("SARVAM_TRANSLATION_MODEL", "mayura:v1"),
                mode=os.getenv("SARVAM_INPUT_TRANSLATION_MODE", "modern-colloquial"),
            )
            return _get_value(translation, "translated_text", query) or query, metadata
        except Exception as exc:
            last_exc = exc
            time.sleep(0.5)

    return query, {"status": "unavailable", "input_language_code": detected_fallback, "reply_language_code": detected_fallback, "note": f"Sarvam input translation unavailable: {last_exc}"}


# Translation cache: identical (text, target, mode) triples recur within a
# session (headlines/summaries repeat across turns); never pay twice for them.
_TRANSLATION_CACHE: dict[tuple[str, str, str], str] = {}


def translate_final_response(text: str, language: dict) -> str:
    """Return Agent 5's text in the user's originally detected language."""
    target_language = language.get("reply_language_code", ENGLISH)
    if not text or target_language == ENGLISH:
        return text
    mode = os.getenv("SARVAM_OUTPUT_TRANSLATION_MODE", "formal")
    cache_key = (text, target_language, mode)
    cached = _TRANSLATION_CACHE.get(cache_key)
    if cached is not None:
        return cached
    client = _client()
    if not client:
        return text
    try:
        translation = client.text.translate(
            input=text,
            source_language_code=ENGLISH,
            target_language_code=target_language,
            model=os.getenv("SARVAM_TRANSLATION_MODEL", "mayura:v1"),
            mode=mode,
        )
        result = _get_value(translation, "translated_text", text) or text
        _TRANSLATION_CACHE[cache_key] = result
        return result
    except Exception:
        return text


SARVAM_CHAT_URL = "https://api.sarvam.ai/v1/chat/completions"


def sarvam_chat_completion(
    messages: list[dict],
    model: str | None = None,
    temperature: float = 0.1,
    max_tokens: int = 2048,
    timeout: int = 35,
) -> str | None:
    """Chat completion using Sarvam AI's LLM (sarvam-105b)."""
    import json
    from urllib.request import Request, urlopen

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
                # If finish_reason was length and content is None, fallback to reasoning_content
                reasoning = msg.get("reasoning_content")
                if reasoning:
                    return reasoning.strip()
    except Exception:
        return None
    return None

