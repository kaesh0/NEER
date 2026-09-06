"""Agent 6: deterministic marine safety engine.

Thresholds below are modeled on IMD/INCOIS-style marine warning categories — no
official IMD/INCOIS source document is cited for the exact numbers, so treat
them as internal operating thresholds, not published figures.

Modeled marine warning categories (wave height):
1. Significant Wave Height (Douglas Sea Scale style):
   - 0.0 - 1.25 m: Calm to Slight (Safe for all vessels)
   - 1.25 - 2.5 m: Moderate (Safe for mechanized boats; Caution for small boats when > 1.8m)
   - 2.5 - 4.0 m: Rough (small fishing craft should not venture out)
   - > 4.0 m: Very Rough / High (Unsafe for all fishing vessels)

2. Wind Speed (IMD-style Fishermen Warning categories):
   - < 30 km/h (< 16 knots): Normal operational breeze (Safe)
   - 30 - 42 km/h (16-23 knots, Beaufort 5-6): Moderate to strong breeze (Caution)
   - > 42 km/h (> 23 knots, squally weather): UNSAFE for small craft
   - > 52 km/h (> 28 knots, Near gale): Unsafe for trawlers as well

3. Swell Dynamics (INCOIS-style Ocean State categories):
   - Normal Indian coastal swell periods: 5 - 12 seconds (completely normal, not penalized).
   - High swell surge (Kallakkadal): swell_height > 2.0 m AND swell_period > 14 s (dangerous run-up).
   - Steep breaking waves: wave_height > 2.0 m AND wave_period < 4.0 s (capsizing hazard).
"""

from __future__ import annotations

DEFAULT_VESSEL = "small fishing boat"

# Vessel-specific operating thresholds (wave_safe_m, wave_caution_m, wind_safe_kmh, wind_caution_kmh)
VESSEL_THRESHOLDS = {
    "small fishing boat": {
        "wave_safe": 1.8,
        "wave_caution": 2.5,
        "wind_safe": 30.0,
        "wind_caution": 42.0,
    },
    "medium trawler": {
        "wave_safe": 2.5,
        "wave_caution": 3.5,
        "wind_safe": 40.0,
        "wind_caution": 52.0,
    },
    "large cargo vessel": {
        "wave_safe": 3.5,
        "wave_caution": 5.0,
        "wind_safe": 55.0,
        "wind_caution": 75.0,
    },
}


def agent_6_risk(weather: dict, ocean: dict, vessel_type: str = DEFAULT_VESSEL, geofence: dict | None = None) -> dict:
    if weather.get("status") != "ok":
        return {
            "agent": "risk",
            "status": "UNKNOWN",
            "safety_score": None,
            "fishing_opportunity_score": None,
            "reasons": ["Live weather data is unavailable; cannot make a reliable safety assessment."],
            "vessel_type": vessel_type,
            "engine": "deterministic Python rules (IMD/INCOIS)",
        }

    wave = weather.get("wave_height_m")
    wind = weather.get("wind_speed_kmh")
    period = weather.get("swell_period_s")
    swell_h = weather.get("swell_height_m")

    if wave is None:
        return {
            "agent": "risk",
            "status": "UNKNOWN",
            "safety_score": None,
            "fishing_opportunity_score": None,
            "reasons": ["Marine wave data unavailable for this coordinate."],
            "vessel_type": vessel_type,
            "engine": "deterministic Python rules (IMD/INCOIS)",
        }

    wind = wind or 0.0
    period = period or 7.0
    limits = VESSEL_THRESHOLDS.get(vessel_type, VESSEL_THRESHOLDS[DEFAULT_VESSEL])

    # ── 1. Calculate Continuous Safety Score (0-100) ────────────────────────
    # Smooth deduction above safe operational limits
    wave_penalty = max(0.0, (wave - (limits["wave_safe"] * 0.7)) * (40.0 / limits["wave_safe"]))
    wind_penalty = max(0.0, (wind - (limits["wind_safe"] * 0.65)) * (35.0 / limits["wind_safe"]))

    # Swell surge / wave steepness penalty (applied only when extreme)
    dynamic_penalty = 0.0
    if swell_h and swell_h > 2.0 and period > 14.0:
        dynamic_penalty += 30.0  # Kallakkadal / long-period swell surge
    elif wave > 2.0 and period < 4.0:
        dynamic_penalty += 25.0  # Steep choppy waves

    safety_score = max(0.0, min(100.0, 100.0 - (wave_penalty + wind_penalty + dynamic_penalty)))

    # ── 2. Determine Categorical Safety Status (IMD / INCOIS Rules) ─────────
    reasons = []

    # Hard threshold triggers based on modeled IMD/INCOIS-style warning levels
    is_unsafe = False
    is_caution = False

    if wave > limits["wave_caution"]:
        is_unsafe = True
        reasons.append(f"Significant wave height ({wave:.2f}m) exceeds the rough-sea threshold ({limits['wave_caution']}m) for {vessel_type}.")
    elif wave > limits["wave_safe"]:
        is_caution = True
        reasons.append(f"Wave height ({wave:.2f}m) is in moderate/cautionary range ({limits['wave_safe']}-{limits['wave_caution']}m).")

    if wind > limits["wind_caution"]:
        is_unsafe = True
        reasons.append(f"Wind speed ({wind:.1f} km/h) exceeds IMD squally weather warning threshold ({limits['wind_caution']} km/h).")
    elif wind > limits["wind_safe"]:
        is_caution = True
        reasons.append(f"Wind speed ({wind:.1f} km/h) is in moderate cautionary range ({limits['wind_safe']}-{limits['wind_caution']} km/h).")

    if swell_h and swell_h > 2.0 and period > 14.0:
        is_unsafe = True
        reasons.append(f"High long-period swell surge detected (swell {swell_h:.1f}m, period {period:.1f}s — Kallakkadal risk).")
    elif wave > 2.0 and period < 4.0:
        is_caution = True
        reasons.append(f"Steep wave conditions detected (wave {wave:.1f}m with short period {period:.1f}s).")

    if is_unsafe or safety_score < 45.0:
        status = "UNSAFE"
        if not reasons:
            reasons.append("Safety index critically low due to combined sea and wind factors.")
    elif is_caution or safety_score < 72.0:
        status = "CAUTION"
        if not reasons:
            reasons.append("Conditions are moderate; small vessels should exercise caution and monitor local advisories.")
    else:
        status = "SAFE"
        reasons.append(f"All marine parameters (wave {wave:.2f}m, wind {wind:.1f} km/h) are within favourable operating limits for {vessel_type}.")

    weather_status = status

    # Geofence check: being inside a restricted / protected area overrides pure weather safety
    if geofence and geofence.get("inside_restricted_zone"):
        zone_name = geofence.get("zone_name", "restricted marine zone")
        reasons.insert(0, f"Location is inside {zone_name}; commercial fishing is prohibited inside the boundary.")
        if status == "SAFE":
            status = "CAUTION"
            safety_score = min(safety_score, 68.0)
        elif status == "UNSAFE":
            # Compound risk: Severe weather + illegal fishing zone -> safety score drops further
            safety_score = max(0.0, safety_score - 15.0)

    # ── 3. Calculate Fishing Opportunity Score ──────────────────────────────
    pfz = ocean.get("pfz_advisory", {})
    pfz_dist = pfz.get("distance_from_user_km")
    has_pfz = pfz.get("data_kind") in ("LIVE OFFICIAL INCOIS ADVISORY", "DEMO FIXTURE - NOT LIVE DATA")

    if status == "UNSAFE":
        fishing_score = 0
    elif has_pfz and pfz_dist is not None:
        # Distance penalty if PFZ is beyond typical economic run (> 15 km)
        dist_penalty = max(0.0, (pfz_dist - 15.0) * 0.8)
        fishing_score = max(10.0, min(100.0, safety_score - dist_penalty))
    else:
        # If sea is safe but no specific PFZ is mapped nearby, baseline fishing score based on safety
        fishing_score = max(20.0, round(safety_score * 0.7, 1))

    return {
        "agent": "risk",
        "status": status,
        "weather_status": weather_status,
        "safety_score": round(safety_score, 1),
        "fishing_opportunity_score": round(fishing_score, 1),
        "vessel_type": vessel_type,
        "rules_checked": {
            "wave_height_m": wave,
            "wind_speed_kmh": wind,
            "swell_period_s": period,
            "swell_height_m": swell_h,
        },
        "reasons": reasons,
        "engine": "deterministic Python rules (IMD/INCOIS)",
    }