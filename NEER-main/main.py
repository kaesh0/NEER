"""NEER / ORCA terminal MVP orchestrator.

The turn itself lives in pipeline.run_pipeline() — this file is only the
chat loop: it reads queries, prints the conversational answer, and shows
full agent payloads only when NEER_VERBOSE=1. Everything is persisted to
conversations/<session_id>/ either way.
"""
import json
import os
import sys

from pipeline import _narrative_of, _new_session_dir, _save_turn, run_pipeline
from services.utils import load_env, print_agent_output

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


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
    # NEER_VERBOSE=1 restores the full per-agent JSON dumps for debugging.
    verbose = os.environ.get("NEER_VERBOSE") == "1"
    session_dir = _new_session_dir()
    print(f"NEER MVP - Marine intelligence terminal prototype (type 'exit' to quit)")
    print(f"Session log: {session_dir}")

    seq = 0
    # Bounded per-session memory so follow-up questions keep context.
    session_history: list[dict] = []
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
        try:
            if not verbose:
                print("NEER is working on it…")
            turn_trace = run_pipeline(query, session_history)
            intent = turn_trace["agents"].get("intent") or {}
            final_output = turn_trace.get("final_output")

            if verbose:
                for label, payload in turn_trace["agents"].items():
                    print_agent_output(f"Agent: {label}", payload)
                print(json.dumps(final_output, ensure_ascii=False, indent=2))

            saved = _save_turn(session_dir, seq, turn_trace)

            # Terminal is a chat: show only the conversational answer.
            answer = _narrative_of(final_output, intent)
            if not answer and isinstance(final_output, dict):
                answer = f"(assessment unavailable: {final_output.get('reason', 'unknown error')})"
            print(f"\nNEER: {answer}")

            if not verbose and isinstance(final_output, dict):
                decision = final_output.get("decisionOutput") or {}
                risk = turn_trace["agents"].get("risk") or {}
                extras = [decision.get("status") or risk.get("status") or "unknown"]
                if risk.get("safety_score") is not None:
                    extras.append(f"safety {risk['safety_score']}/100")
                extras.append(f"saved {saved.name}")
                print(f"   [{' · '.join(str(e) for e in extras)}]")
        except Exception as exc:  # belt-and-braces: the session survives anything
            print(f"\n[error] Turn failed, session continuing: {type(exc).__name__}: {exc}")


if __name__ == "__main__":
    main()
