"""NEER / ORCA FastAPI HTTP wrapper.

A thin HTTP layer over the existing terminal pipeline: POST /api/query runs
exactly the same single-turn agent sequence as main.py's CLI loop (defined
once in pipeline.run_pipeline()) and persists the turn with the same
session-folder / per-turn-JSON pattern, then returns the ORCA payload.

No agent, service, or payload_builder logic lives here or is modified.

Run (from this project root):  uvicorn api:app --port 8000
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from pipeline import CONVERSATIONS_DIR, _new_session_dir, _save_turn, run_pipeline
from services.utils import load_env

# Agents read their credentials/URLs from the environment at call time —
# same startup step main.py performs before its loop.
load_env()

app = FastAPI(title="NEER / ORCA Marine Intelligence API")

# The Node backend (http://localhost:3001) calls this service; the browser
# never talks to this port directly, but CORS is enabled for it as requested.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    text: str
    session_id: Optional[str] = None
    location: Optional[str] = None
    persona: Optional[str] = None


def _resolve_session(session_id: Optional[str]):
    """Map a session_id to (conversations folder, next turn sequence number).

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


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/query")
def handle_api_query(request: QueryRequest):
    text = (request.text or "").strip()
    if not text:
        return JSONResponse(status_code=400, content={"detail": "text must not be empty"})

    session_dir, session_id, seq = _resolve_session(request.session_id)

    # Run the exact same agent sequence the terminal runs for one turn, then
    # persist it with the shared _save_turn helper (unchanged from main.py).
    turn_trace = run_pipeline(
        text,
        context_location=request.location,
        context_persona=request.persona,
        session_id=session_id,
    )
    _save_turn(session_dir, seq, turn_trace)

    return {"session_id": session_id, "final_output": turn_trace["final_output"]}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "8000")))
