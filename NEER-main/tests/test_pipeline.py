"""Pytest suite for the NEER pipeline — fully offline, all external APIs mocked."""
import json
from datetime import datetime, timedelta, timezone

import pytest

from agents.agent_1_intent import DEFAULT_VESSEL, _regex_extract_intent
from agents.agent_2_weather import _hourly_value
from agents.agent_5_route import agent_5_route
from agents.agent_6_risk import agent_6_risk
from services.payload_builder import _time_window, build_orca_payload
from services.mosdac_parser import _valid_number
from services.utils import forecast_index, requested_forecast_time


@pytest.fixture
def dummy_intent():
    return {
        "original_query": "kya fishing safe hai?",
        "query_type": "safety",
        "persona": "fisherman",
        "time_window": "tomorrow",
        "vessel_type": "small fishing boat",
        "location": {"name": "Kochi, Kerala", "latitude": 9.93988, "longitude": 76.26022},
        "language": {"status": "disabled"},
    }


@pytest.fixture
def dummy_ocean():
    return {
        "status": "live",
        "mosdac": {"status": "parsed", "sea_surface_temperature_c": 28.5, "chlorophyll_mg_m3": 0.35},
        "pfz_advisory": {
            "data_kind": "LIVE OFFICIAL INCOIS ADVISORY",
            "sector": "KERALA",
            "valid_until": "5 SEP 2026",
            "nearest_pfz": {
                "coastal_reference": "Kochi",
                "direction_from_coast": "W",
                "bearing_degrees": 270,
                "distance_from_coast_km": 15,
                "depth_m": "30-40",
                "latitude": 9.95,
                "longitude": 76.10,
            },
            "distance_from_user_km": 15.0,
        },
    }


@pytest.fixture
def demo_ocean(dummy_ocean):
    """Same ocean payload but with the demo fixture instead of a live advisory."""
    ocean = json.loads(json.dumps(dummy_ocean))
    ocean["pfz_advisory"]["data_kind"] = "DEMO FIXTURE - NOT LIVE DATA"
    return ocean


GEOFENCE_INSIDE = {
    "inside_restricted_zone": True,
    "zone_name": "Vembanad Marine Protected Area",
    "zone_coordinates": [[76.20, 9.90], [76.30, 9.90], [76.30, 10.00], [76.20, 10.00], [76.20, 9.90]],
}
GEOFENCE_OUTSIDE = {"inside_restricted_zone": False, "zone_name": None, "zone_coordinates": [], "status": "ok"}

WEATHER_SAFE = {
    "status": "ok", "forecast_valid_for": "2026-09-05T06:00",
    "wave_height_m": 1.2, "wind_speed_kmh": 20.0, "swell_height_m": 0.8, "swell_period_s": 8.0,
    "current_speed_kmh": 1.5, "current_direction_degrees": 240, "sea_surface_temperature_c": 28.5,
}
WEATHER_MODERATE = {
    "status": "ok", "forecast_valid_for": "2026-09-05T06:00",
    "wave_height_m": 2.1, "wind_speed_kmh": 35.0, "swell_height_m": 1.4, "swell_period_s": 9.0,
    "current_speed_kmh": 2.0, "current_direction_degrees": 250, "sea_surface_temperature_c": 28.0,
}
WEATHER_SEVERE = {
    "status": "ok", "forecast_valid_for": "2026-09-05T06:00",
    "wave_height_m": 3.2, "wind_speed_kmh": 48.0, "swell_height_m": 2.5, "swell_period_s": 10.0,
    "current_speed_kmh": 3.5, "current_direction_degrees": 270, "sea_surface_temperature_c": 27.5,
}


# ── Agent 6: risk engine ────────────────────────────────────────────────────

def test_safe_outside_is_favourable(dummy_intent, dummy_ocean):
    r = agent_6_risk(WEATHER_SAFE, dummy_ocean, "small fishing boat", GEOFENCE_OUTSIDE)
    p = build_orca_payload(dummy_intent, WEATHER_SAFE, dummy_ocean, r, GEOFENCE_OUTSIDE, None, "Safe")
    assert r["status"] == "SAFE" and p["decisionOutput"]["status"] == "favourable"


def test_safe_inside_zone_becomes_caution(dummy_intent, dummy_ocean):
    r = agent_6_risk(WEATHER_SAFE, dummy_ocean, "small fishing boat", GEOFENCE_INSIDE)
    p = build_orca_payload(dummy_intent, WEATHER_SAFE, dummy_ocean, r, GEOFENCE_INSIDE, None, "Caution zone")
    assert r["status"] == "CAUTION" and p["decisionOutput"]["status"] == "caution"
    assert p["decisionOutput"]["headline"] == (
        "Weather is safe, but you are inside Vembanad Marine Protected Area. Exit before fishing."
    )
    # No physical high_wave hazard when weather is safe — regulatory advisory only.
    assert [h["type"] for h in p["marineSituation"]["hazards"]] == ["restricted_zone"]


def test_moderate_inside_zone_is_compound_caution(dummy_intent, dummy_ocean):
    r = agent_6_risk(WEATHER_MODERATE, dummy_ocean, "small fishing boat", GEOFENCE_INSIDE)
    p = build_orca_payload(dummy_intent, WEATHER_MODERATE, dummy_ocean, r, GEOFENCE_INSIDE, None, "Compound")
    assert r["status"] == "CAUTION" and p["decisionOutput"]["status"] == "caution"
    assert "Moderate sea conditions AND you are inside" in p["decisionOutput"]["headline"]
    kinds = [(h["type"], h["severity"]) for h in p["marineSituation"]["hazards"]]
    assert ("restricted_zone", "advisory") in kinds and ("high_wave", "watch") in kinds


def test_moderate_alone_is_watch(dummy_intent, dummy_ocean):
    r = agent_6_risk(WEATHER_MODERATE, dummy_ocean, "small fishing boat", GEOFENCE_OUTSIDE)
    p = build_orca_payload(dummy_intent, WEATHER_MODERATE, dummy_ocean, r, GEOFENCE_OUTSIDE, None, "Moderate")
    assert r["status"] == "CAUTION" and p["decisionOutput"]["status"] == "caution"
    assert any(h["severity"] == "watch" for h in p["marineSituation"]["hazards"])


def test_severe_alone_is_unsafe(dummy_intent, dummy_ocean):
    r = agent_6_risk(WEATHER_SEVERE, dummy_ocean, "small fishing boat", GEOFENCE_OUTSIDE)
    p = build_orca_payload(dummy_intent, WEATHER_SEVERE, dummy_ocean, r, GEOFENCE_OUTSIDE, None, "Severe")
    assert r["status"] == "UNSAFE" and p["decisionOutput"]["status"] == "unfavourable"
    assert any(h["severity"] == "warning" for h in p["marineSituation"]["hazards"])


def test_severe_inside_zone_is_danger(dummy_intent, dummy_ocean):
    r = agent_6_risk(WEATHER_SEVERE, dummy_ocean, "small fishing boat", GEOFENCE_INSIDE)
    p = build_orca_payload(dummy_intent, WEATHER_SEVERE, dummy_ocean, r, GEOFENCE_INSIDE, None, "Severe+Zone")
    assert r["status"] == "UNSAFE" and p["decisionOutput"]["status"] == "unfavourable"
    assert "DANGER" in p["decisionOutput"]["headline"]
    kinds = [(h["type"], h["severity"]) for h in p["marineSituation"]["hazards"]]
    assert ("restricted_zone", "advisory") in kinds and ("high_wave", "warning") in kinds


def test_hazard_polygon_is_closed_ring(dummy_intent, dummy_ocean):
    r = agent_6_risk(WEATHER_SAFE, dummy_ocean, "small fishing boat", GEOFENCE_INSIDE)
    p = build_orca_payload(dummy_intent, WEATHER_SAFE, dummy_ocean, r, GEOFENCE_INSIDE, None, "Ring")
    ring = next(h for h in p["marineSituation"]["hazards"] if h["type"] == "restricted_zone")
    coords = ring["geometry"]["coordinates"]
    assert len(coords) == 1 and len(coords[0]) == 5 and coords[0][0] == coords[0][-1]


def test_hazard_features_match_legend(dummy_intent, dummy_ocean):
    r = agent_6_risk(WEATHER_SAFE, dummy_ocean, "small fishing boat", GEOFENCE_INSIDE)
    p = build_orca_payload(dummy_intent, WEATHER_SAFE, dummy_ocean, r, GEOFENCE_INSIDE, None, "Legend")
    legend_keys = {item["key"] for item in p["map"]["legend"]}
    for layer in p["map"]["layers"]:
        if layer["id"] == "hazard-zones":
            for f in layer["features"]:
                assert f["properties"]["status"] in legend_keys


def test_hazards_availability_honest(dummy_intent, dummy_ocean):
    r = agent_6_risk(WEATHER_SAFE, dummy_ocean, "small fishing boat", GEOFENCE_OUTSIDE)
    p = build_orca_payload(dummy_intent, WEATHER_SAFE, dummy_ocean, r, GEOFENCE_OUTSIDE, None, "Avail")
    assert p["marineSituation"]["dataAvailability"]["hazards"] == "unavailable"
    r2 = agent_6_risk(WEATHER_SEVERE, dummy_ocean, "small fishing boat", GEOFENCE_OUTSIDE)
    p2 = build_orca_payload(dummy_intent, WEATHER_SEVERE, dummy_ocean, r2, GEOFENCE_OUTSIDE, None, "Avail2")
    assert p2["marineSituation"]["dataAvailability"]["hazards"] == "live"


# ── Agent 5: route safety ───────────────────────────────────────────────────

def test_route_skips_demo_fixture_destination(dummy_intent, demo_ocean):
    """Regression (#4): demo-fixture coordinates must never become a route."""
    assert agent_5_route(dummy_intent, demo_ocean)["status"] == "skipped"


def test_route_skips_without_ocean(dummy_intent):
    assert agent_5_route(dummy_intent, None)["status"] == "skipped"


def test_route_scores_from_user_location(dummy_intent, dummy_ocean, monkeypatch):
    import importlib
    route_mod = importlib.import_module("agents.agent_5_route")  # module, not the shadowed function

    async def fake_wave(session, lat, lon, requested_time):
        return 1.0
    monkeypatch.setattr(route_mod, "_fetch_waypoint_wave", fake_wave)
    route = agent_5_route(dummy_intent, dummy_ocean)
    assert route["status"] == "ok"
    lon, lat = route["waypoints"][0]
    assert abs(lon - 76.26022) < 0.001 and abs(lat - 9.93988) < 0.001
    assert route["scored_for_hour"].endswith("T06:00")  # tomorrow window


def test_route_recommendation_blocked_for_cached_pfz(dummy_intent, demo_ocean):
    """Defense in depth: even an 'ok' route must not surface as an action
    recommendation when it would have been built from demo-fixture data."""
    r = agent_6_risk(WEATHER_SAFE, demo_ocean, "small fishing boat", GEOFENCE_OUTSIDE)
    route = {"status": "ok", "recommended_route_id": "direct_pfz", "max_expected_wave": 1.0,
             "waypoints": [[76.2, 9.9]]}
    p = build_orca_payload(dummy_intent, WEATHER_SAFE, demo_ocean, r, GEOFENCE_OUTSIDE, route, "n")
    assert all("recommended route" not in action.lower() for action in p["decisionOutput"]["recommendedActions"])
    assert p["marineSituation"]["dataAvailability"]["pfz"] == "cached"


# ── Agent 2: weather safety helpers ─────────────────────────────────────────

def test_hourly_value_missing_variable_is_none_not_indexerror():
    assert _hourly_value({"ocean_current_velocity": [None]}, "ocean_current_velocity", 5) is None
    assert _hourly_value({}, "wave_height", 3) is None
    assert _hourly_value({"wave_height": [1.0, 2.0]}, "wave_height", 1) == 2.0
    assert _hourly_value({"wave_height": []}, "wave_height", 0) is None


# ── Agent 1: regex fallback word boundaries ─────────────────────────────────

def test_kolkata_is_not_tomorrow():
    """Regression (#6): 'kal' inside 'kolkata' must not flip the time window."""
    text = "kya aaj shaam kolkata port ke paas jaana safe hai"
    assert _regex_extract_intent(text)["time_window"] == "today"


def test_workshop_is_not_a_ship():
    """Regression (#7): 'ship' inside 'workshop' must not set large cargo vessel."""
    text = "how is the sea for the fishing workshop in chennai"
    assert _regex_extract_intent(text)["vessel_type"] == DEFAULT_VESSEL


def test_real_ship_still_detected():
    assert _regex_extract_intent("cargo ship weather tomorrow")["vessel_type"] == "large cargo vessel"


def test_kal_as_word_still_tomorrow():
    assert _regex_extract_intent("kya kal subah kochi ke paas ja sakte hain")["time_window"] == "tomorrow"


# ── Forecast time helpers ───────────────────────────────────────────────────

def test_requested_time_tomorrow_pins_06():
    assert requested_forecast_time("tomorrow").endswith("T06:00")


def test_requested_time_today_is_current_hour():
    ist_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    assert requested_forecast_time("today") == (
        f"{ist_now.date().isoformat()}T{ist_now.hour:02d}:00"
    )


def test_forecast_index():
    times = ["2026-09-05T00:00", "2026-09-05T01:00", "2026-09-05T02:00"]
    assert forecast_index(times, "2026-09-05T01:00") == 1
    assert forecast_index(times, "2026-09-06T06:00") == 0  # beyond horizon → fallback


# ── Time window honesty ─────────────────────────────────────────────────────

def test_today_window_covers_now():
    """Regression (#12): an evening 'today' query must not get a past window.

    Time-zone-safe: before 06:00 IST the window legitimately starts at 06:00.
    """
    window = _time_window("today")
    ist_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    start = datetime.fromisoformat(window["start"])
    end = datetime.fromisoformat(window["end"])
    if ist_now.hour >= 6:
        assert start <= ist_now + timedelta(minutes=1)
    else:
        assert start.hour == 6
    assert end.hour == 23 and end.minute == 59
    assert start < end


# ── Narrative provenance ────────────────────────────────────────────────────

def test_narrative_source_recorded(dummy_intent, dummy_ocean, monkeypatch):
    import importlib
    a7 = importlib.import_module("agents.agent_7_response")  # module, not the shadowed function
    monkeypatch.setattr(a7, "_sarvam_response", lambda payload: None)
    r = agent_6_risk(WEATHER_SAFE, dummy_ocean, "small fishing boat", GEOFENCE_OUTSIDE)
    payload = a7.agent_7_response(dummy_intent, WEATHER_SAFE, dummy_ocean, r, GEOFENCE_OUTSIDE, None)
    assert payload["explainability"]["narrativeSource"] == "deterministic-fallback"


def test_narrative_source_sarvam(dummy_intent, dummy_ocean, monkeypatch):
    import importlib
    a7 = importlib.import_module("agents.agent_7_response")
    monkeypatch.setattr(a7, "_sarvam_response", lambda payload: "Conditions look fine today, stay alert.")
    r = agent_6_risk(WEATHER_SAFE, dummy_ocean, "small fishing boat", GEOFENCE_OUTSIDE)
    payload = a7.agent_7_response(dummy_intent, WEATHER_SAFE, dummy_ocean, r, GEOFENCE_OUTSIDE, None)
    assert payload["explainability"]["narrativeSource"] == "sarvam"


# ── Conversational focus (issue #18) ────────────────────────────────────────

def test_focus_payload_is_question_scoped(dummy_intent, dummy_ocean):
    """Safety questions must not see PFZ data — that's what caused data dumps."""
    import importlib
    a7 = importlib.import_module("agents.agent_7_response")
    view = a7._focus_payload(dummy_intent, WEATHER_SAFE, dummy_ocean, {}, None, None, None)
    assert "nearest_fishing_zone" not in view
    assert view["question_category"] == "safety"
    assert set(view["conditions"]) <= {"wave_height_m", "wind_speed_kmh", "swell_period_s"}
    assert "original_query" not in json.dumps(view["conditions"])


def test_focus_payload_includes_pfz_only_for_fishing(dummy_intent, dummy_ocean):
    import importlib
    a7 = importlib.import_module("agents.agent_7_response")
    fishing_intent = dict(dummy_intent, query_type="fishing")
    view = a7._focus_payload(fishing_intent, WEATHER_SAFE, dummy_ocean, {}, None, None, None)
    assert view["nearest_fishing_zone"]["distance_km"] == 15.0


def test_focus_payload_keeps_restricted_zone(dummy_intent, dummy_ocean):
    import importlib
    a7 = importlib.import_module("agents.agent_7_response")
    view = a7._focus_payload(dummy_intent, WEATHER_SAFE, dummy_ocean, {}, GEOFENCE_INSIDE, None, None)
    assert view["restricted_zone"] == "Vembanad Marine Protected Area"


def test_history_threaded_into_llm_view(dummy_intent, dummy_ocean, monkeypatch):
    import importlib
    a7 = importlib.import_module("agents.agent_7_response")
    captured = {}
    def fake_sarvam(view):
        captured.update(view)
        return "Looks fine."
    monkeypatch.setattr(a7, "_sarvam_response", fake_sarvam)
    history = [{"user": "any hazards near kochi", "assistant": "One advisory active."}]
    a7.agent_7_response(dummy_intent, WEATHER_SAFE, dummy_ocean, {}, None, None, history)
    assert captured["recent_conversation"] == history
    assert captured["user_question"] == dummy_intent["original_query"]


def test_fallback_safety_answer_excludes_pfz(dummy_intent, dummy_ocean, monkeypatch):
    """'kya safe hai' answer should not wander into fishing-zone advice."""
    import importlib
    a7 = importlib.import_module("agents.agent_7_response")
    monkeypatch.setattr(a7, "_sarvam_response", lambda view: None)
    r = agent_6_risk(WEATHER_SAFE, dummy_ocean, "small fishing boat", GEOFENCE_OUTSIDE)
    payload = a7.agent_7_response(dummy_intent, WEATHER_SAFE, dummy_ocean, r, GEOFENCE_OUTSIDE, None)
    summary = payload["explainability"]["summary"]
    assert "fishing zone" not in summary.lower()
    assert "safe" in summary.lower()


def test_fallback_fishing_answer_includes_pfz(dummy_intent, dummy_ocean, monkeypatch):
    import importlib
    a7 = importlib.import_module("agents.agent_7_response")
    monkeypatch.setattr(a7, "_sarvam_response", lambda view: None)
    fishing_intent = dict(dummy_intent, query_type="fishing")
    r = agent_6_risk(WEATHER_SAFE, dummy_ocean, "small fishing boat", GEOFENCE_OUTSIDE)
    payload = a7.agent_7_response(fishing_intent, WEATHER_SAFE, dummy_ocean, r, GEOFENCE_OUTSIDE, None)
    assert "fishing zone" in payload["explainability"]["summary"].lower()


def test_fallback_keeps_restricted_zone_warning(dummy_intent, dummy_ocean, monkeypatch):
    """Safety warnings are never trimmed from the conversational answer."""
    import importlib
    a7 = importlib.import_module("agents.agent_7_response")
    monkeypatch.setattr(a7, "_sarvam_response", lambda view: None)
    r = agent_6_risk(WEATHER_SAFE, dummy_ocean, "small fishing boat", GEOFENCE_INSIDE)
    payload = a7.agent_7_response(dummy_intent, WEATHER_SAFE, dummy_ocean, r, GEOFENCE_INSIDE, None)
    summary = payload["explainability"]["summary"]
    assert "restricted" in summary.lower() or "inside" in summary.lower()


def test_reasoning_echo_falls_back_to_deterministic(dummy_intent, dummy_ocean, monkeypatch):
    """Regression (live leak 2026-09-06): sarvam reasoning_content echoing the
    system prompt must never reach the user — the cleaner must reject it and
    the deterministic fallback must take over."""
    import importlib
    a7 = importlib.import_module("agents.agent_7_response")
    echo = (
        "The user asked about hazards. Let me verify the data.\n\n"
        "- recent_conversation: irrelevant\n\nRules:\n"
        "1. FIRST answer what the user actually asked (user_question / question_category).\n"
        "2. Mention ONLY the numbers that matter for that question — never dump all data.\n"
        "4. Everyday words only:"
    )
    monkeypatch.setattr(a7, "sarvam_chat_completion", lambda messages, **kwargs: echo)
    r = agent_6_risk(WEATHER_SAFE, dummy_ocean, "small fishing boat", GEOFENCE_OUTSIDE)
    payload = a7.agent_7_response(dummy_intent, WEATHER_SAFE, dummy_ocean, r, GEOFENCE_OUTSIDE, None)
    assert payload["explainability"]["narrativeSource"] == "deterministic-fallback"
    summary = payload["explainability"]["summary"]
    assert "user_question" not in summary and "Rules:" not in summary
    assert "safe" in summary.lower()


# ── get_json retry behaviour ────────────────────────────────────────────────

def test_get_json_retries_transient_5xx(monkeypatch):
    import io
    from urllib.error import HTTPError
    import services.utils as utils

    calls = {"n": 0}

    class FakeResp:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def read(self):
            return b'{"ok": true}'

    def fake_urlopen(request, timeout):
        calls["n"] += 1
        if calls["n"] < 3:
            raise HTTPError(request.full_url, 500, "boom", None, io.BytesIO(b""))
        return FakeResp()

    monkeypatch.setattr(utils, "urlopen", fake_urlopen)
    monkeypatch.setattr(utils.time, "sleep", lambda s: None)
    assert utils.get_json("https://example.test/api") == {"ok": True}
    assert calls["n"] == 3


def test_get_json_does_not_retry_client_errors(monkeypatch):
    import io
    from urllib.error import HTTPError
    import services.utils as utils

    calls = {"n": 0}

    def fake_urlopen(request, timeout):
        calls["n"] += 1
        raise HTTPError(request.full_url, 404, "nope", None, io.BytesIO(b""))

    monkeypatch.setattr(utils, "urlopen", fake_urlopen)
    monkeypatch.setattr(utils.time, "sleep", lambda s: None)
    with pytest.raises(HTTPError):
        utils.get_json("https://example.test/api")
    assert calls["n"] == 1


# ── MOSDAC sentinel handling ────────────────────────────────────────────────

def test_valid_number_sentinels():
    assert _valid_number(-999000000.0, -999000000.0) is None
    assert _valid_number(float("nan")) is None
    assert _valid_number(float("inf")) is None
    assert _valid_number(0.0) == 0.0
    assert _valid_number(28.5) == 28.5


# ── Integration-era regressions (neer-demo-integration) ─────────────────────

def test_cleaner_rejects_user_question_echo():
    """Regression (live e2e): quoted user question must not become the answer."""
    from agents.agent_7_response import _clean_sarvam_narrative
    raw = 'The user asks "and what about tomorrow morning?" so I should answer it.'
    assert _clean_sarvam_narrative(raw, user_question="and what about tomorrow morning?") is None


def test_cleaner_rejects_continuation_fragments():
    from agents.agent_7_response import _clean_sarvam_narrative
    assert _clean_sarvam_narrative("and what about tomorrow morning?") is None
    assert _clean_sarvam_narrative("The sea state looks acceptable near the coast today.") is not None


def test_cleaner_rejects_question_ending_and_snake_case():
    from agents.agent_7_response import _clean_sarvam_narrative
    assert _clean_sarvam_narrative("Should you go out near the coast in these conditions?") is None
    assert _clean_sarvam_narrative("Wave data says wave_height_m is fine near the coast today.") is None


def test_clarify_summary_carries_question(dummy_intent, monkeypatch):
    """Regression: clarify turns must not leak the generic ORCA default summary."""
    import importlib
    a7 = importlib.import_module("agents.agent_7_response")
    clarify_intent = dict(dummy_intent, clarifying_question="Which location should I check?")
    payload = a7.agent_7_response(clarify_intent, {}, {}, {}, None, None)
    assert payload["explainability"]["summary"] == "Which location should I check?"
    assert payload["decisionOutput"]["narrative"] == "Which location should I check?"


def test_followup_carries_previous_location(dummy_intent, monkeypatch):
    """Regression: 'and tomorrow?' after a Kochi turn must stay on Kochi."""
    import importlib
    pipeline = importlib.import_module("pipeline")

    calls = {"n": 0}
    def fake_intent(query, history=None, use_llm=True):
        calls["n"] += 1
        if calls["n"] == 1:
            return {"agent": "intent", "location": dummy_intent["location"], "clarifying_question": None,
                    "vessel_type": "small fishing boat", "query_type": "safety", "time_window": "today",
                    "language": {"status": "disabled"}}
        return {"agent": "intent", "location": None, "clarifying_question": "Which location?",
                "vessel_type": "small fishing boat", "query_type": "safety", "time_window": "tomorrow",
                "language": {"status": "disabled"}}
    monkeypatch.setattr(pipeline, "agent_1_intent", fake_intent)
    monkeypatch.setattr(pipeline, "agent_2_weather", lambda intent: {"status": "unavailable", "agent": "weather"})
    monkeypatch.setattr(pipeline, "agent_3_ocean", lambda intent: {"status": "unavailable", "agent": "ocean_advisory"})
    monkeypatch.setattr(pipeline, "agent_4_geofence", lambda intent: {"status": "skipped", "agent": "geofence"})

    history = []
    pipeline.run_pipeline("is it safe near kochi?", history)
    second = pipeline.run_pipeline("and what about tomorrow morning?", history)
    second_intent = second["agents"]["intent"]
    assert second_intent["clarifying_question"] is None
    assert second_intent["location"]["name"] == "Kochi, Kerala"
    assert second_intent["location_source"] == "carried_from_conversation"


def test_cleaner_rejects_system_prompt_rule_fragment():
    """Regression (live UI e2e): a quoted rule fragment from the system prompt
    must never pass as the narrative — even without list/snake_case markers."""
    from agents.agent_7_response import _clean_sarvam_narrative, _NARRATIVE_SYSTEM_PROMPT
    leak = "no raw field names, timestamps, coordinates, scores, or source names unless the user explicitly asked for them."
    assert _clean_sarvam_narrative(
        f'Let me check. "{leak}" That covers the rules.',
        user_question="is it safe near kochi?",
        source_prompt=_NARRATIVE_SYSTEM_PROMPT,
    ) is None


def test_cleaner_still_accepts_real_narrative():
    from agents.agent_7_response import _clean_sarvam_narrative, _NARRATIVE_SYSTEM_PROMPT
    good = "Sea conditions near Kochi are moderate right now, so carry safety gear before you leave."
    assert _clean_sarvam_narrative(good, user_question="is it safe near kochi?", source_prompt=_NARRATIVE_SYSTEM_PROMPT) == good


def test_cleaner_rejects_parroted_reason_line(dummy_intent):
    """Regression (live UI e2e #3): the model echoing a raw risk reason back
    must not count as a narrative."""
    from agents.agent_7_response import _clean_sarvam_narrative, _NARRATIVE_SYSTEM_PROMPT
    reason = "All marine parameters (wave 1.12m, wind 9.1 km/h) are within safe operational limits for small fishing boat."
    assert _clean_sarvam_narrative(
        reason,
        user_question="and tomorrow?",
        source_prompt=_NARRATIVE_SYSTEM_PROMPT,
        source_strings=[reason],
    ) is None


def test_focus_view_drops_reasons_for_safe(dummy_intent):
    import importlib
    a7 = importlib.import_module("agents.agent_7_response")
    view = a7._focus_payload(
        dummy_intent, {"status": "ok"}, {}, {"status": "SAFE", "reasons": ["All marine parameters fine."]},
        None, None, None,
    )
    assert view["key_reasons"] == []
