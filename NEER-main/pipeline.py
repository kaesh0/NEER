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


_SESSION_STATES: dict[str, dict] = {}


def get_session_state(session_id: str | None) -> dict:
    """Retrieve or reconstruct the conversation context for a session."""
    if not session_id:
        return {
            "last_location": None,
            "last_persona": None,
            "last_vessel_type": None,
            "last_query_type": None,
            "last_narrow_topic": None,
            "recent_turns": [],
        }

    if session_id in _SESSION_STATES:
        return _SESSION_STATES[session_id]

    session_dir = CONVERSATIONS_DIR / Path(session_id).name
    state_file = session_dir / "conversation_state.json"
    if state_file.exists():
        try:
            state = json.loads(state_file.read_text(encoding="utf-8"))
            _SESSION_STATES[session_id] = state
            return state
        except Exception:
            pass

    state = {
        "last_location": None,
        "last_persona": None,
        "last_vessel_type": None,
        "last_query_type": None,
        "last_narrow_topic": None,
        "recent_turns": [],
    }

    if session_dir.exists():
        turns = sorted(session_dir.glob("[0-9][0-9][0-9]_*.json"))
        recent = []
        for tf in turns[-2:]:
            try:
                turn_data = json.loads(tf.read_text(encoding="utf-8"))
                t_intent = turn_data.get("agents", {}).get("intent", {})
                if t_intent.get("location"):
                    state["last_location"] = t_intent["location"]
                if t_intent.get("persona"):
                    state["last_persona"] = t_intent["persona"]
                if t_intent.get("vessel_type"):
                    state["last_vessel_type"] = t_intent["vessel_type"]
                state["last_query_type"] = t_intent.get("query_type")
                state["last_narrow_topic"] = t_intent.get("narrow_topic")

                q = turn_data.get("query", "")
                narrative = (turn_data.get("final_output", {}).get("decisionOutput", {}) or {}).get("narrative", "")
                recent.append({"query": q, "narrative": narrative})
            except Exception:
                pass
        state["recent_turns"] = recent

    _SESSION_STATES[session_id] = state
    return state


def update_session_state(
    session_id: str,
    intent: dict,
    query: str,
    narrative: str,
) -> dict:
    """Update and persist conversation state after a turn."""
    state = get_session_state(session_id)

    if intent.get("location"):
        state["last_location"] = intent["location"]
    if intent.get("persona"):
        state["last_persona"] = intent["persona"]
    if intent.get("vessel_type"):
        state["last_vessel_type"] = intent["vessel_type"]
    state["last_query_type"] = intent.get("query_type")
    state["last_narrow_topic"] = intent.get("narrow_topic")

    recent = state.get("recent_turns", [])
    recent.append({"query": query, "narrative": narrative})
    state["recent_turns"] = recent[-2:]

    _SESSION_STATES[session_id] = state

    try:
        session_dir = CONVERSATIONS_DIR / Path(session_id).name
        session_dir.mkdir(parents=True, exist_ok=True)
        state_file = session_dir / "conversation_state.json"
        state_file.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        pass

    return state


def run_pipeline(
    query: str,
    context_location: str | None = None,
    context_persona: str | None = None,
    session_id: str | None = None,
    conversation_context: dict | None = None,
) -> dict:
    """Run the complete agent sequence for a single user query (one turn).

    This is exactly the turn logic previously inline in main()'s while loop.
    Returns the same turn trace main() used to build — {timestamp, query,
    agents: {intent, weather, ocean, geofence, route, risk}, final_output} —
    so callers can print it stage by stage or persist it with _save_turn().
    """
    if conversation_context is None and session_id:
        conversation_context = get_session_state(session_id)

    turn_trace = {"timestamp": datetime.datetime.now().isoformat(), "query": query, "agents": {}}

    # Agent 1: Intent
    intent = agent_1_intent(
        query,
        fallback_location=context_location,
        fallback_persona=context_persona,
        conversation_context=conversation_context,
    )
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

    if session_id:
        narrative = (final_output.get("decisionOutput", {}) or {}).get("narrative", "")
        update_session_state(session_id, intent, query, narrative)

    return turn_trace
