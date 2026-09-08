"""NEER / ORCA shared single-turn pipeline orchestration.

The per-turn agent sequence that used to live inline in main()'s while loop
now lives here in run_pipeline(), so the terminal CLI (main.py) and the HTTP
API (api.py) call exactly the same code — there is only one place the
pipeline order is defined.

Agent pipeline (execution order):
  1 Intent -> 2 Weather, 3 Ocean, 4 Geofence, 5 Route (2-5 in parallel)
  -> 6 Risk -> 7 Response (ORCA persona JSON)

Session persistence helpers (session folder + per-turn JSON files) also moved
here from main.py unchanged, because the HTTP API needs the same logging
pattern as the terminal.
"""
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
    """One folder per chat session; each chat turn becomes a file inside it."""
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


def run_pipeline(
    query: str,
    context_location: str | None = None,
    context_persona: str | None = None,
    session_id: str | None = None,
) -> dict:
    """Run the complete agent sequence for a single user query (one turn).

    This is exactly the turn logic previously inline in main()'s while loop.
    Returns the same turn trace main() used to build — {timestamp, query,
    agents: {intent, weather, ocean, geofence, route, risk}, final_output} —
    so callers can print it stage by stage or persist it with _save_turn().
    """
    # If no context_location is provided, check if previous turn in this session resolved a location
    if not context_location and session_id:
        session_dir = CONVERSATIONS_DIR / Path(session_id).name
        if session_dir.exists():
            turns = sorted(session_dir.glob("[0-9][0-9][0-9]_*.json"))
            if turns:
                try:
                    last_turn = json.loads(turns[-1].read_text(encoding="utf-8"))
                    prev_loc = (last_turn.get("agents", {}).get("intent", {}).get("location") or {}).get("name")
                    if prev_loc:
                        context_location = prev_loc
                except Exception:
                    pass

    turn_trace = {"timestamp": datetime.datetime.now().isoformat(), "query": query, "agents": {}}

    # Agent 1: Intent
    intent = agent_1_intent(query, fallback_location=context_location, fallback_persona=context_persona)
    turn_trace["agents"]["intent"] = intent

    if intent.get("clarifying_question") or not intent.get("is_coastal", True):
        final_output = agent_7_response(intent, {}, {}, {})
    else:
        # Agents 2, 3, 4 are independent — run concurrently. Agent 5 (route)
        # needs Agent 3's nearest-PFZ destination, so it chains after ocean.
        with ThreadPoolExecutor(max_workers=4) as pool:
            weather_future = pool.submit(agent_2_weather, intent)
            ocean_future = pool.submit(agent_3_ocean, intent)
            geofence_future = pool.submit(agent_4_geofence, intent)
            route_future = pool.submit(lambda: agent_5_route(intent, ocean_future.result()))
            weather = weather_future.result()
            ocean = ocean_future.result()
            geofence = geofence_future.result()
            route = route_future.result()

        turn_trace["agents"]["weather"] = weather
        turn_trace["agents"]["ocean"] = ocean
        turn_trace["agents"]["geofence"] = geofence
        turn_trace["agents"]["route"] = route

        # Agent 6: Risk
        risk = agent_6_risk(weather, ocean, intent["vessel_type"], geofence)
        turn_trace["agents"]["risk"] = risk

        # Agent 7: Response (ORCA persona JSON)
        final_output = agent_7_response(intent, weather, ocean, risk, geofence, route)

    turn_trace["final_output"] = final_output
    return turn_trace
