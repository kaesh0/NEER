"""Agent 5: Route Safety Scoring (Async).

Builds candidate routes from the user's own location toward the nearest INCOIS
PFZ point and scores every waypoint with live Open-Meteo marine wave data at
the requested forecast hour. Routes are only built from LIVE INCOIS advisories:
the demo fixture (fixed Kerala coordinates) must never become a navigation
destination, and without a resolvable destination the agent reports "skipped".
"""
from __future__ import annotations
import asyncio
import math
import os
from concurrent.futures import ThreadPoolExecutor

import aiohttp

from services.utils import forecast_index, requested_forecast_time

# Waypoint fractions along each candidate line (0 = user, 1 = destination).
_START_FRACTIONS = (0.0, 0.33, 0.66, 1.0)
_ROUTE_B_OFFSET_DEGREES = 12.0  # alternate route diverges from the direct line
_PENALTY_WAVE = 99.9
_WAYPOINT_TIMEOUT_SECONDS = 10


def _rotate_destination(lat1: float, lon1: float, lat2: float, lon2: float, delta_degrees: float) -> tuple[float, float]:
    """Rotate the destination around the start point (flat approximation is
    fine for the MVP's short coastal distances)."""
    rad = math.radians(delta_degrees)
    dy, dx = lat2 - lat1, lon2 - lon1
    return lat1 + dy * math.cos(rad) - dx * math.sin(rad), lon1 + dy * math.sin(rad) + dx * math.cos(rad)


def _candidate_routes(intent: dict, ocean: dict | None) -> list[dict]:
    location = intent.get("location") or {}
    lat1, lon1 = location.get("latitude"), location.get("longitude")
    if lat1 is None or lon1 is None:
        return []
    advisory = (ocean or {}).get("pfz_advisory", {}) or {}
    # Only LIVE advisories may drive routing. The demo fixture sits at fixed
    # Kerala coordinates; routing a Vizag user toward it would be dangerous
    # nonsense, and is the exact failure the "never invent data" rule forbids.
    if advisory.get("data_kind") != "LIVE OFFICIAL INCOIS ADVISORY":
        return []
    point = advisory.get("nearest_pfz") or {}
    lat2, lon2 = point.get("latitude"), point.get("longitude")
    if lat2 is None or lon2 is None:
        return []
    lat2b, lon2b = _rotate_destination(lat1, lon1, lat2, lon2, _ROUTE_B_OFFSET_DEGREES)
    route_a = [(lat1 + (lat2 - lat1) * f, lon1 + (lon2 - lon1) * f) for f in _START_FRACTIONS]
    route_b = [(lat1 + (lat2b - lat1) * f, lon1 + (lon2b - lon1) * f) for f in _START_FRACTIONS]
    return [
        {"id": "direct_pfz", "waypoints": route_a},
        {"id": "offset_pfz", "waypoints": route_b},
    ]


async def _fetch_waypoint_wave(session, lat, lon, requested_time):
    base_url = os.getenv("OPEN_METEO_MARINE_URL", "https://marine-api.open-meteo.com/v1/marine")
    url = (
        f"{base_url}?latitude={lat}&longitude={lon}"
        f"&hourly=wave_height&timezone=Asia/Kolkata"
    )
    try:
        async with session.get(url) as response:
            data = await response.json()
            hourly = data.get("hourly") or {}
            times = hourly.get("time") or []
            waves = hourly.get("wave_height") or []
            if not times or not waves:
                return _PENALTY_WAVE
            index = forecast_index(times, requested_time)
            return waves[index] if 0 <= index < len(waves) else _PENALTY_WAVE
    except Exception:
        return _PENALTY_WAVE  # Penalize failed requests


async def _score_routes_async(routes: list[dict], requested_time: str) -> dict:
    timeout = aiohttp.ClientTimeout(total=_WAYPOINT_TIMEOUT_SECONDS)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        tasks = []
        for route in routes:
            for lat, lon in route["waypoints"]:
                tasks.append(_fetch_waypoint_wave(session, lat, lon, requested_time))
        results = await asyncio.gather(*tasks)

        scored_routes = []
        idx = 0
        for route in routes:
            max_wave = 0.0
            for _ in route["waypoints"]:
                value = results[idx]
                idx += 1
                # Missing wave data (inland waypoint) is penalized exactly like a
                # failed request, so a dead route can never "win" with max 0.0.
                max_wave = max(max_wave, value if value is not None else _PENALTY_WAVE)
            scored_routes.append({"id": route["id"], "max_wave_height": round(max_wave, 2), "waypoints": route["waypoints"]})

        return min(scored_routes, key=lambda x: x["max_wave_height"])


def _run_coroutine(coro):
    """asyncio.run() raises RuntimeError if a loop is already running in this
    thread (nested calls, embedding runtimes). In that case, run the coroutine
    on a fresh event loop inside an isolated worker thread instead."""
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)
    with ThreadPoolExecutor(max_workers=1) as pool:
        return pool.submit(asyncio.run, coro).result()


def agent_5_route(intent: dict, ocean: dict | None = None) -> dict:
    if intent.get("query_type") != "safety":
        return {"agent": "route", "status": "skipped", "reason": "Not a routing query."}

    routes = _candidate_routes(intent, ocean)
    if not routes:
        return {
            "agent": "route",
            "status": "skipped",
            "reason": "Routing needs a user location and a nearest-PFZ destination from a live advisory; neither was resolvable.",
        }

    requested_time = requested_forecast_time(intent.get("time_window", ""))
    best = _run_coroutine(_score_routes_async(routes, requested_time))
    return {
        "agent": "route",
        "status": "ok",
        "scored_for_hour": requested_time,
        "recommended_route_id": best["id"],
        "max_expected_wave": best["max_wave_height"],
        "waypoints": [[round(lon, 5), round(lat, 5)] for lat, lon in best["waypoints"]],
    }
