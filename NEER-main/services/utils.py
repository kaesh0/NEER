"""Shared helpers for the terminal MVP."""

from __future__ import annotations

import json
import os
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen


def load_env(path: str = ".env") -> None:
    """Small dependency-free .env loader; existing shell variables win."""
    env_file = Path(path)
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def get_json(url: str, params: dict | None = None, headers: dict | None = None) -> dict:
    query = f"?{urlencode(params)}" if params else ""
    request = Request(url + query, headers=headers or {"User-Agent": "NEER-MVP/0.1"})
    with urlopen(request, timeout=12) as response:  # nosec B310 - trusted config endpoint
        return json.loads(response.read().decode("utf-8"))


def print_agent_output(agent: str, payload: dict) -> None:
    print(f"\n{'=' * 18} {agent} {'=' * 18}")
    print(json.dumps(payload, ensure_ascii=False, indent=2))
