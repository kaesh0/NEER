"""Pytest suite for the Sarvam narrative cleaner (agent 7) — no network."""
import pytest

from agents.agent_7_response import _clean_sarvam_narrative


SCRATCHPAD_SAMPLE = """The user wants me to respond as a marine-assistance response writer for Indian coastal communities. I must use ONLY the supplied JSON data. Output must be ONLY the final conversational narrative directly to the user in 2-4 clear sentences. Must be enclosed strictly between <narrative> and </narrative> tags. No reasoning, thought process, scratchpad notes, or analysis inside the tags. I need to state clearly the risk status, current conditions (wave height, wind speed, ocean currents), and safety advice.

Let me extract the data:
- Intent: fishing safety query for Visakhapatnam tomorrow morning for small fishing boat.
- Location: Visakhapatnam, Andhra Pradesh
- Weather status: OK
- Wave height: 1.18 m
- Risk status: SAFE

Let me draft:

"कल सुबह विशखापत्तनम के पास छोटी नाव से मछली पकड़ने जाना पूरी तरह सुरक्षित है। जलस्तर 1.18 मीटर, हवा की गति 3.5 किमी/घंटा और लहरें 4.7 किमी/घंटा की गति से आ रही हैं, जो सभी सुरक्षित सीमा के भीतर हैं। आपको सावधानी से आगे बढ़ना चाहिए और निकलने से पहले स्थानीय मौसम अपडेट भी देख लेना चाहिए।"

Wait, the prompt says "state clearly the risk status, current conditions (wave height, wind speed, ocean currents), and safety advice."""


def test_extracts_hindi_narrative_from_scratchpad():
    result = _clean_sarvam_narrative(SCRATCHPAD_SAMPLE)
    assert result is not None
    assert "user wants" not in result
    assert "विशखापत्तनम" in result


def test_tagged_narrative_extracted():
    text = 'Some preamble <narrative>Sea is calm near Kochi today, safe for small boats.</narrative> trailing'
    assert _clean_sarvam_narrative(text) == "Sea is calm near Kochi today, safe for small boats."


def test_clean_text_passthrough():
    text = "Waves are 1.2 m and winds are light; conditions are safe for a morning trip."
    assert _clean_sarvam_narrative(text) == text


def test_too_short_returns_none():
    assert _clean_sarvam_narrative("ok") is None


def test_empty_returns_none():
    assert _clean_sarvam_narrative("") is None
    assert _clean_sarvam_narrative(None) is None


def test_pure_scratchpad_returns_none():
    text = "Let me check the constraints. The instructions say to use only the supplied JSON data. " * 3
    assert _clean_sarvam_narrative(text) is None


# Exact leak from a live session (2026-09-06): sarvam-105b returned only
# reasoning_content, which echoed the system prompt — and the old cleaner
# passed it as a "clean narrative".
REASONING_PROMPT_ECHO = (
    "The user asked about hazards near Kochi. Let me verify the data.\n\n"
    "- recent_conversation: irrelevant\n\n"
    "Rules:\n"
    "1. FIRST answer what the user actually asked (user_question / question_category).\n"
    "2. Mention ONLY the numbers that matter for that question — never dump all data.\n"
    "3. Safety overrides brevity: if risk_status is CAUTION or UNSAFE, say it clearly.\n"
    "4. Everyday words only:"
)


def test_cleaner_rejects_system_prompt_echo():
    assert _clean_sarvam_narrative(REASONING_PROMPT_ECHO) is None


def test_cleaner_rejects_rule_list_fragments():
    text = "Rules:\n1. FIRST answer the question.\n2. Mention only relevant numbers. Everything else is noise here."
    assert _clean_sarvam_narrative(text) is None


def test_cleaner_rejects_repunctuated_rule_fragment():
    """Regression (live UI e2e #2): the model swaps quote styles when echoing
    rules — normalization must be punctuation-blind."""
    from agents.agent_7_response import _clean_sarvam_narrative, _NARRATIVE_SYSTEM_PROMPT
    leak = "Everyday words only: 'waves', 'wind', 'sea' — no raw field names, timestamps, coordinates, scores, or source names unless the user explicitly asked for them."
    assert _clean_sarvam_narrative(
        leak, user_question="is it safe near kochi?", source_prompt=_NARRATIVE_SYSTEM_PROMPT
    ) is None
