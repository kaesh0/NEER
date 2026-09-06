"""NEER pipeline runner + session persistence.

One query -> the full 7-agent turn, with the same failure isolation and
conversation-memory wiring as the CLI loop. Both main.py (terminal) and
api.py (FastAPI) call run_pipeline(); no agent logic lives anywhere else.
"""
from __future__ import annotations

import datetime
import json
import re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from agents.agent_1_intent import agent_1_intent
from agents.agent_2_weather import agent_2_weather
from agents.agent_3_ocean import agent_3_ocean
from agents.agent_4_geofence import agent_4_geofence
from agents.agent_5_route import agent_5_route
from agents.agent_6_risk import agent_6_risk
from agents.agent_7_response import agent_7_response

CONVERSATIONS_DIR = Path("conversations")


def _new_session_dir() -> Path:
    """One folder per session; each chat turn becomes a file inside it."""
    session_id = datetime.datetime.now().strftime("session_%Y%m%d_%H%M%S")
    session_dir = CONVERSATIONS_DIR / session_id
    session_dir.mkdir(parents=True, exist_ok=True)
    return session_dir


def _slugify(text: str, max_words: int = 6) -> str:
    words = re.sub(r"[^a-zA-Z0-9\s]", " ", text).lower().split()[:max_words]
    return "-".join(words) or "turn"


def _save_turn(session_dir: Path, seq: int, turn_trace: dict) -> Path:
    """Save one chat turn and keep a per-session index for quick history browsing."""
    turn_file = session_dir / f"{seq:03d}_{_slugify(turn_trace['query'])}.json"
    with open(turn_file, "w", encoding="utf-8") as f:
        json.dump(turn_trace, f, ensure_ascii=False, indent=2)
    index_file = session_dir / "index.json"
    try:
        index = json.loads(index_file.read_text(encoding="utf-8")) if index_file.exists() else []
    except (json.JSONDecodeError, OSError):
        index = []
    index.append({"file": turn_file.name, "timestamp": turn_trace["timestamp"], "query": turn_trace["query"]})
    index_file.write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")
    return turn_file


def _safe_agent(label: str, func, *args) -> dict:
    """Agent isolation: one agent's crash degrades that agent's output for the
    turn instead of propagating through the ThreadPoolExecutor."""
    try:
        return func(*args)
    except Exception as exc:  # deliberate last-resort containment
        return {"agent": label, "status": "unavailable", "reason": f"{type(exc).__name__}: {exc}"}


def _narrative_of(final_output, intent: dict) -> str:
    """The single user-facing line: clarifying question, narrative, or headline."""
    if intent.get("clarifying_question"):
        return intent["clarifying_question"]
    if not isinstance(final_output, dict):
        return ""
    explain = final_output.get("explainability") or {}
    decision = final_output.get("decisionOutput") or {}
    return explain.get("summary") or decision.get("headline") or ""


def _carry_over_location(intent: dict, session_history: list[dict]) -> dict:
    """Follow-up turns ("and tomorrow?", "aur kal subah?") name no location.

    When intent comes back needing clarification but the conversation already
    established one, inherit it — that IS the conversational flow the product
    promises. Explicit new locations never hit this path (no clarification).
    """
    if not (intent.get("clarifying_question") and session_history):
        return intent
    last_location = next(
        (entry.get("location") for entry in reversed(session_history) if entry.get("location")),
        None,
    )
    if last_location:
        intent = dict(intent)
        intent["location"] = last_location
        intent["clarifying_question"] = None
        intent["location_confidence"] = 0.7
        intent["location_source"] = "carried_from_conversation"
    return intent


def run_pipeline(query: str, session_history: list[dict] | None = None, fast: bool = False) -> dict:
    """Run the full 7-agent turn for one query and return the turn trace.

    `session_history` (list of {"user", "assistant", "location"?}) gives the
    narrative agent conversational context; new turns are appended in place.
    """
    session_history = session_history if session_history is not None else []
    turn_trace = {"timestamp": datetime.datetime.now().isoformat(), "query": query, "agents": {}}

    intent = _safe_agent("intent", agent_1_intent, query, None, not fast)
    intent = _carry_over_location(intent, session_history)
    turn_trace["agents"]["intent"] = intent

    if intent.get("status") == "unavailable" or "location" not in intent or "clarifying_question" not in intent:
        # Intent agent failed to produce its contract — degrade this turn
        # instead of feeding a malformed dict to downstream agents.
        final_output = {
            "status": "unavailable",
            "reason": "Intent extraction failed for this query; please retry.",
            "detail": intent.get("reason"),
        }
    else:
        if intent["clarifying_question"]:
            final_output = _safe_agent("response", agent_7_response, intent, {}, {}, {}, None, None, session_history)
        else:
            # Agents 2, 3, 4 are independent — run concurrently. Agent 5 (route)
            # needs Agent 3's nearest-PFZ destination, so it chains after ocean.
            with ThreadPoolExecutor(max_workers=4) as pool:
                weather_future = pool.submit(_safe_agent, "weather", agent_2_weather, intent)
                ocean_future = pool.submit(_safe_agent, "ocean_advisory", agent_3_ocean, intent)
                geofence_future = pool.submit(_safe_agent, "geofence", agent_4_geofence, intent)
                route_future = pool.submit(
                    lambda: _safe_agent("route", agent_5_route, intent, ocean_future.result())
                )
                weather = weather_future.result()
                ocean = ocean_future.result()
                geofence = geofence_future.result()
                route = route_future.result()

            for payload in (weather, ocean, geofence, route):
                turn_trace["agents"][payload.get("agent", "unknown")] = payload

            # Agent 6: Risk
            risk = _safe_agent("risk", agent_6_risk, weather, ocean, intent["vessel_type"], geofence)
            turn_trace["agents"]["risk"] = risk

            # Agent 7: Response (ORCA persona JSON) — with conversation memory
            final_output = _safe_agent(
                "response", agent_7_response, intent, weather, ocean, risk, geofence, route, session_history, fast
            )

    turn_trace["final_output"] = final_output
    narrative = _narrative_of(final_output, intent)
    if narrative:
        entry = {"user": query, "assistant": narrative[:400]}
        location = (intent or {}).get("location")
        if isinstance(location, dict) and location.get("latitude") is not None:
            entry["location"] = location
        session_history.append(entry)
        if len(session_history) > 5:
            session_history.pop(0)
    return turn_trace
