"""NEER / ORCA FastAPI HTTP wrapper.

A thin HTTP layer over the shared pipeline: POST /api/query runs exactly the
same single-turn agent sequence as main.py's CLI loop (pipeline.run_pipeline),
persists the turn with the same session-folder pattern, and returns the ORCA
payload. Conversation memory is rebuilt from the session's saved turns, so
multi-turn context survives across HTTP calls the same way it does in the CLI.

Run (from this project root):  python -m uvicorn api:app --port 8000
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from pipeline import CONVERSATIONS_DIR, _new_session_dir, _save_turn, _narrative_of, run_pipeline
from services.utils import load_env

# Agents read their credentials/URLs from the environment at call time —
# same startup step main.py performs before its loop.
load_env()

app = FastAPI(title="NEER / ORCA Marine Intelligence API")

# The Node backend (http://localhost:3001) calls this service; the browser
# talks only to the Node backend. Both loopback spellings are allowed so the
# demo works either way.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://127.0.0.1:3001"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    text: str
    session_id: Optional[str] = None
    fast: bool = False


def _resolve_session(session_id: Optional[str]):
    """Map a session_id to (conversations folder, session id, next turn number).

    Missing session_id -> a fresh session folder using the same
    session_%Y%m%d_%H%M%S naming as the terminal. A provided session_id is
    taken as the folder name (basename only, so a client cannot escape the
    conversations dir), and the next turn number continues from the files
    already saved in that folder.
    """
    if session_id:
        session_dir = CONVERSATIONS_DIR / Path(session_id).name
        session_dir.mkdir(parents=True, exist_ok=True)
    else:
        session_dir = _new_session_dir()
    next_seq = len(list(session_dir.glob("[0-9][0-9][0-9]_*.json"))) + 1
    return session_dir, session_dir.name, next_seq


def _rebuild_history(session_dir: Path, limit: int = 5) -> list[dict]:
    """Load the last saved turns into the pipeline's history shape (narrative
    text + resolved location), so follow-up questions sent over HTTP keep both
    their conversational context and location carry-over."""
    history: list[dict] = []
    turn_files = sorted(session_dir.glob("[0-9][0-9][0-9]_*.json"))
    for path in turn_files[-limit:]:
        try:
            trace = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        query = (trace.get("query") or "").strip()
        final_output = trace.get("final_output")
        if not query or not isinstance(final_output, dict):
            continue
        intent = trace.get("agents", {}).get("intent") or {}
        answer = _narrative_of(final_output, intent if isinstance(intent, dict) else {})
        if answer:
            entry = {"user": query, "assistant": answer[:400]}
            location = intent.get("location") if isinstance(intent, dict) else None
            if isinstance(location, dict) and location.get("latitude") is not None:
                entry["location"] = location
            history.append(entry)
    return history


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/query")
def handle_api_query(request: QueryRequest):
    text = (request.text or "").strip()
    if not text:
        return JSONResponse(status_code=400, content={"detail": "text must not be empty"})

    session_dir, session_id, seq = _resolve_session(request.session_id)
    history = _rebuild_history(session_dir)

    # Run the exact same agent sequence the terminal runs for one turn, then
    # persist it with the shared _save_turn helper.
    turn_trace = run_pipeline(text, history, fast=request.fast)
    saved = _save_turn(session_dir, seq, turn_trace)

    return {
        "session_id": session_id,
        "final_output": turn_trace.get("final_output"),
        "saved": saved.name,
    }
