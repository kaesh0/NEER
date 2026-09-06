"""Agent 2: retrieve live marine weather from Open-Meteo."""

from __future__ import annotations

import json
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from urllib.error import URLError

from services.utils import forecast_index, get_json, requested_forecast_time


IST = timezone(timedelta(hours=5, minutes=30))


def _hourly_value(hourly: dict, key: str, index: int):
    """Safe hourly-array read: a missing or short variable is None, never IndexError.

    Open-Meteo omits variables per location/model plan, so `get(..., [None])[i]`
    is not safe — the default list has length 1 and any later index raises.
    """
    values = hourly.get(key) or []
    return values[index] if 0 <= index < len(values) else None


def agent_2_weather(intent: dict) -> dict:
    if not intent["location"]:
        return {"agent": "weather", "status": "skipped", "reason": "Location is required."}
    loc = intent["location"]
    requested_time = requested_forecast_time(intent.get("time_window", ""))
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
        if not marine_hourly.get("time") or not wind_hourly.get("time"):
            raise ValueError("Forecast response contained no hourly time axis.")
        marine_i = forecast_index(marine_hourly["time"], requested_time)
        wind_i = forecast_index(wind_hourly["time"], requested_time)

        # Convert ocean_current_velocity from m/s to km/h if available
        raw_velocity = _hourly_value(marine_hourly, "ocean_current_velocity", marine_i)
        current_speed_kmh = round(raw_velocity * 3.6, 1) if raw_velocity is not None else None
        current_dir = _hourly_value(marine_hourly, "ocean_current_direction", marine_i)
        sst_c = _hourly_value(marine_hourly, "sea_surface_temperature", marine_i)

        return {
            "agent": "weather",
            "status": "ok",
            "location": loc,
            "forecast_valid_for": marine_hourly["time"][marine_i],
            "wave_height_m": _hourly_value(marine_hourly, "wave_height", marine_i),
            "wave_period_s": _hourly_value(marine_hourly, "wave_period", marine_i),
            "swell_height_m": _hourly_value(marine_hourly, "swell_wave_height", marine_i),
            "swell_period_s": _hourly_value(marine_hourly, "swell_wave_period", marine_i),
            "wind_speed_kmh": _hourly_value(wind_hourly, "wind_speed_10m", wind_i),
            "wind_direction_degrees": _hourly_value(wind_hourly, "wind_direction_10m", wind_i),
            "current_speed_kmh": current_speed_kmh,
            "current_direction_degrees": current_dir,
            "sea_surface_temperature_c": sst_c,
            "source": "Open-Meteo Marine API + Open-Meteo Forecast API",
            "retrieved_at": retrieved_at,
        }
    except (URLError, TimeoutError, KeyError, IndexError, ValueError, json.JSONDecodeError) as exc:
        return {"agent": "weather", "status": "unavailable", "reason": str(exc), "source": "Open-Meteo"}
