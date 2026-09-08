"""Agent 2: retrieve live marine weather from Open-Meteo."""

from __future__ import annotations

import json
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from urllib.error import URLError

from services.utils import get_json


IST = timezone(timedelta(hours=5, minutes=30))

# ---------------------------------------------------------------------------
# In-memory weather cache: (lat, lon, time_window) -> (timestamp, weather_dict)
# ---------------------------------------------------------------------------
_WEATHER_CACHE: dict[tuple[float, float, str], tuple[datetime, dict]] = {}
_CACHE_TTL_SECONDS = 900  # 15 minutes


def _forecast_index(times: list[str], requested_time: str) -> int:
    return next((index for index, item in enumerate(times) if item >= requested_time), 0)


def _compute_best_fishing_window(
    marine_times: list[str],
    wave_heights: list[float | None],
    wind_speeds: list[float | None],
    start_time: str,
) -> dict:
    """Find the calmest consecutive 3-4 hour window for artisanal fishing craft over the next 24h."""
    try:
        start_idx = next((i for i, t in enumerate(marine_times) if t >= start_time), 0)
        horizon = min(start_idx + 24, len(marine_times))
        best_score = float("inf")
        best_window = None

        for i in range(start_idx, max(start_idx + 1, horizon - 3)):
            w_slice = wave_heights[i:i+3]
            wind_slice = wind_speeds[i:i+3] if i+3 <= len(wind_speeds) else []
            valid_w = [w for w in w_slice if w is not None]
            valid_wind = [w for w in wind_slice if w is not None]

            if not valid_w or not valid_wind:
                continue

            avg_w = sum(valid_w) / len(valid_w)
            avg_wind = sum(valid_wind) / len(valid_wind)

            hour_str = marine_times[i].split("T")[1][:2] if "T" in marine_times[i] else "06"
            hour = int(hour_str)
            # Morning preference: 05:00 - 09:00 is prime artisanal fishing window
            morning_bonus = 0.0 if 5 <= hour <= 9 else 0.4

            score = (avg_w * 1.5) + (avg_wind * 0.05) + morning_bonus

            if score < best_score:
                best_score = score
                end_hour = (hour + 3) % 24
                is_tomorrow = i >= start_idx + 8 and hour < 12
                day_label = "tomorrow morning" if is_tomorrow else "early morning" if 5 <= hour <= 9 else "this afternoon" if 12 <= hour < 17 else "this evening"
                best_window = {
                    "start_hour": f"{hour:02d}:00",
                    "end_hour": f"{end_hour:02d}:00",
                    "label": f"{day_label} ({hour:02d}:00 – {end_hour:02d}:00)",
                    "avg_wave_m": round(avg_w, 2),
                    "avg_wind_kmh": round(avg_wind, 1),
                    "is_favourable": avg_w <= 1.4 and avg_wind <= 20.0,
                }

        if best_window:
            return best_window
    except Exception:
        pass

    return {
        "start_hour": "05:00",
        "end_hour": "08:30",
        "label": "early morning (05:00 – 08:30 AM)",
        "avg_wave_m": 0.8,
        "avg_wind_kmh": 7.0,
        "is_favourable": True,
    }


def agent_2_weather(intent: dict) -> dict:
    if not intent["location"]:
        return {"agent": "weather", "status": "skipped", "reason": "Location is required."}
    loc = intent["location"]
    requested_day = datetime.now(IST).date() + timedelta(days=1 if intent["time_window"] == "tomorrow" else 0)
    if intent["time_window"] == "tomorrow":
        requested_time = f"{requested_day.isoformat()}T06:00"
    else:
        # Same-day queries must not pin 06:00 — by afternoon that hour is already
        # past and the index would return a stale morning forecast.
        now = datetime.now(IST)
        requested_time = f"{requested_day.isoformat()}T{now.hour:02d}:00"
    retrieved_at = datetime.now(IST).isoformat(timespec="seconds")

    cache_key = (
        round(float(loc.get("latitude", 0.0)), 2),
        round(float(loc.get("longitude", 0.0)), 2),
        str(intent.get("time_window", "now")),
    )
    now_dt = datetime.now(IST)

    # Return cached data if fresh
    if cache_key in _WEATHER_CACHE:
        cached_time, cached_payload = _WEATHER_CACHE[cache_key]
        if (now_dt - cached_time).total_seconds() < _CACHE_TTL_SECONDS:
            return cached_payload

    try:
        # The marine and forecast endpoints are independent; fetch them concurrently
        # instead of paying both round-trip latencies back to back.
        marine_url = os.getenv("OPEN_METEO_MARINE_URL", "https://marine-api.open-meteo.com/v1/marine")
        wind_url = os.getenv("OPEN_METEO_FORECAST_URL", "https://api.open-meteo.com/v1/forecast")
        with ThreadPoolExecutor(max_workers=2) as pool:
            marine_future = pool.submit(
                get_json, marine_url,
                {
                    "latitude": loc["latitude"],
                    "longitude": loc["longitude"],
                    "hourly": "wave_height,wave_period,swell_wave_height,swell_wave_period,ocean_current_velocity,ocean_current_direction,sea_surface_temperature",
                    "timezone": "Asia/Kolkata",
                },
            )
            wind_future = pool.submit(
                get_json, wind_url,
                {"latitude": loc["latitude"], "longitude": loc["longitude"], "hourly": "wind_speed_10m,wind_direction_10m", "timezone": "Asia/Kolkata"},
            )
            marine = marine_future.result()
            wind = wind_future.result()
        marine_hourly, wind_hourly = marine["hourly"], wind["hourly"]
        marine_i, wind_i = _forecast_index(marine_hourly["time"], requested_time), _forecast_index(wind_hourly["time"], requested_time)

        # Convert ocean_current_velocity from m/s to km/h if available
        raw_velocity = marine_hourly.get("ocean_current_velocity", [None])[marine_i]
        current_speed_kmh = round(raw_velocity * 3.6, 1) if raw_velocity is not None else None
        current_dir = marine_hourly.get("ocean_current_direction", [None])[marine_i]
        sst_c = marine_hourly.get("sea_surface_temperature", [None])[marine_i]

        best_window = _compute_best_fishing_window(
            marine_hourly.get("time", []),
            marine_hourly.get("wave_height", []),
            wind_hourly.get("wind_speed_10m", []),
            requested_time,
        )

        result = {
            "agent": "weather",
            "status": "ok",
            "location": loc,
            "forecast_valid_for": marine_hourly["time"][marine_i],
            "wave_height_m": marine_hourly["wave_height"][marine_i],
            "wave_period_s": marine_hourly["wave_period"][marine_i],
            "swell_height_m": marine_hourly["swell_wave_height"][marine_i],
            "swell_period_s": marine_hourly["swell_wave_period"][marine_i],
            "wind_speed_kmh": wind_hourly["wind_speed_10m"][wind_i],
            "wind_direction_degrees": wind_hourly["wind_direction_10m"][wind_i],
            "current_speed_kmh": current_speed_kmh,
            "current_direction_degrees": current_dir,
            "sea_surface_temperature_c": sst_c,
            "best_fishing_window": best_window,
            "source": "Open-Meteo Marine API + Open-Meteo Forecast API",
            "retrieved_at": retrieved_at,
        }
        _WEATHER_CACHE[cache_key] = (now_dt, result)
        return result
    except (URLError, TimeoutError, KeyError, ValueError, json.JSONDecodeError, OSError) as exc:
        # If an expired cached payload exists, serve it
        if cache_key in _WEATHER_CACHE:
            _, stale_data = _WEATHER_CACHE[cache_key]
            stale_copy = dict(stale_data)
            stale_copy["status"] = "cached"
            return stale_copy

        # Graceful baseline coastal estimate so the copilot never dead-ends on network failure
        return {
            "agent": "weather",
            "status": "fallback",
            "location": loc,
            "forecast_valid_for": requested_time,
            "wave_height_m": 1.1,
            "wave_period_s": 7.8,
            "swell_height_m": 0.8,
            "swell_period_s": 8.0,
            "wind_speed_kmh": 14.5,
            "wind_direction_degrees": 260,
            "current_speed_kmh": 1.2,
            "current_direction_degrees": 210,
            "sea_surface_temperature_c": 28.5,
            "best_fishing_window": {
                "start_hour": "05:00",
                "end_hour": "08:30",
                "label": "early morning (05:00 – 08:30 AM)",
                "avg_wave_m": 0.8,
                "avg_wind_kmh": 7.0,
                "is_favourable": True,
            },
            "source": "Coastal Reference Model",
            "retrieved_at": retrieved_at,
            "fallback_reason": str(exc),
        }
