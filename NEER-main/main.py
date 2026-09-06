"""NEER / ORCA terminal MVP orchestrator.

Agent pipeline (execution order):
  1 Intent -> 2 Weather, 3 Ocean, 4 Geofence, 5 Route (2-5 in parallel)
  -> 6 Risk -> 7 Response (ORCA persona JSON)

The per-turn sequence is defined once in pipeline.run_pipeline(); this CLI
drives it interactively and saves each turn under conversations/<session_id>/,
the same way api.py drives it over HTTP.
"""
import json
import sys

from pipeline import _new_session_dir, _save_turn, run_pipeline
from services.utils import load_env, print_agent_output

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Agent output replay order — matches the order main() used to print each stage.
AGENT_HEADERS = [
    ("intent", "Agent 1: Intent"),
    ("weather", "Agent 2: Weather"),
    ("ocean", "Agent 3: Ocean/Fishing"),
    ("geofence", "Agent 4: Geofence"),
    ("route", "Agent 5: Route Safety"),
    ("risk", "Agent 6: Risk"),
]


def _configure_terminal_encoding() -> None:
    for stream in (sys.stdin, sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            try:
                stream.reconfigure(encoding="utf-8")
            except (OSError, ValueError):
                pass


def main() -> None:
    _configure_terminal_encoding()
    load_env()
    session_dir = _new_session_dir()
    print(f"NEER MVP - Marine intelligence terminal prototype (type 'exit' to quit)")
    print(f"Session log: {session_dir}")

    seq = 0
    while True:
        try:
            query = input("\nUser: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nBye.")
            return

        if query.lower() in {"exit", "quit"}:
            print("Bye.")
            return
        if not query:
            continue

        seq += 1
        turn_trace = run_pipeline(query)

        for key, header in AGENT_HEADERS:
            if key in turn_trace["agents"]:
                print_agent_output(header, turn_trace["agents"][key])

        print("\n================== Agent 7: Final Response (ORCA JSON) ==================")
        print(json.dumps(turn_trace["final_output"], ensure_ascii=False, indent=2))
        saved = _save_turn(session_dir, seq, turn_trace)
        print(f"\nSaved: {saved}")


if __name__ == "__main__":
    main()
