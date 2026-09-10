#!/bin/bash
# Convenience wrapper that always uses the project venv's python, so nobody
# has to remember (or get right by hand) that `python3.11` won't work — it
# can't import fastapi/uvicorn, which are only installed in .venv/, and it
# fails silently at import time with no useful error.
export PYTHONUNBUFFERED=1
cd "$(dirname "$0")"
.venv/bin/python -u -m uvicorn api:app --host 127.0.0.1 --port 8000 --reload
