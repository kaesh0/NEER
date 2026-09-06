"""Shared helpers for the terminal MVP."""

from __future__ import annotations

import json
import os
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

IST = timezone(timedelta(hours=5, minutes=30))


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


def get_json(url: str, params: dict | None = None, headers: dict | None = None, retries: int = 2) -> dict:
    """GET JSON with bounded retries on transient failures (network, 429, 5xx).

    Client errors (4xx other than 429) raise immediately — retrying a
    malformed request would just burn the latency budget.
    """
    query = f"?{urlencode(params)}" if params else ""
    request = Request(url + query, headers=headers or {"User-Agent": "NEER-MVP/0.1"})
    last_exc: Exception = TimeoutError("request never completed")
    for attempt in range(retries + 1):
        try:
            with urlopen(request, timeout=12) as response:  # nosec B310 - trusted config endpoint
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            last_exc = exc
            if exc.code != 429 and exc.code < 500:
                raise
        except (URLError, TimeoutError, json.JSONDecodeError) as exc:
            last_exc = exc
        if attempt < retries:
            time.sleep(0.5 * (2 ** attempt))
    raise last_exc


def requested_forecast_time(time_window: str) -> str:
    """Forecast hour (Open-Meteo hourly axis format) the query targets.

    Same-day queries pin the current hour — an earlier fixed hour could
    already be past and would return a stale morning forecast. Tomorrow
    pins 06:00 IST. Everything else resolves to the current hour.
    """
    ist_now = datetime.now(IST)
    day = ist_now.date() + timedelta(days=1 if time_window == "tomorrow" else 0)
    if time_window == "tomorrow":
        return f"{day.isoformat()}T06:00"
    return f"{day.isoformat()}T{ist_now.hour:02d}:00"


def forecast_index(times: list[str], requested_time: str) -> int:
    """First index whose hour is at/after the requested time; 0 fallback."""
    return next((index for index, item in enumerate(times) if item >= requested_time), 0)


def print_agent_output(agent: str, payload: dict) -> None:
    print(f"\n{'=' * 18} {agent} {'=' * 18}")
    print(json.dumps(payload, ensure_ascii=False, indent=2))
