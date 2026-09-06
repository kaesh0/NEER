"""Agent 2: retrieve live marine weather from Open-Meteo."""

from __future__ import annotations

import json
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from urllib.error import URLError

from services.utils import get_json


IST = timezone(timedelta(hours=5, minutes=30))


def _forecast_index(times: list[str], requested_time: str) -> int:
    return next((index for index, item in enumerate(times) if item >= requested_time), 0)


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

        return {
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
            "source": "Open-Meteo Marine API + Open-Meteo Forecast API",
            "retrieved_at": retrieved_at,
        }
    except (URLError, TimeoutError, KeyError, ValueError, json.JSONDecodeError) as exc:
        return {"agent": "weather", "status": "unavailable", "reason": str(exc), "source": "Open-Meteo"}
