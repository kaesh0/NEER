"""Builds the persona-specific ORCA JSON response payload (schema v1.0).

Two output shapes, chosen by intent persona:
- fisherman -> point / trip-assessment payload   (fisherman_kochi.json contract)
- authority -> regional risk-assessment payload  (authority_ernakulam.json contract)

Every field is derived from real pipeline output; anything the pipeline could not
fetch is reported as "unavailable" rather than invented.
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone


IST = timezone(timedelta(hours=5, minutes=30))

VESSEL_TYPE_CODES = {
    "small fishing boat": "small_fishing_boat",
    "medium trawler": "medium_trawler",
    "large cargo vessel": "large_cargo_vessel",
}
STATUS_TO_DECISION = {"SAFE": "favourable", "CAUTION": "caution", "UNSAFE": "unfavourable", "UNKNOWN": "unavailable"}
STATUS_TO_PRIORITY = {"SAFE": "low", "CAUTION": "medium", "UNSAFE": "high", "UNKNOWN": "unavailable"}
STATUS_TO_SEVERITY = {"SAFE": "info", "CAUTION": "caution", "UNSAFE": "warning", "UNKNOWN": "unavailable"}
HEADLINES = {
    "SAFE": "Conditions look favourable for your trip.",
    "CAUTION": "Caution advised — review conditions before departure.",
    "UNSAFE": "Do not venture out in these conditions.",
    "UNKNOWN": "Assessment unavailable — live data could not be fetched.",
}

LEGEND = [
    {"key": "favourable", "label": "Favourable"},
    {"key": "caution", "label": "Caution"},
    {"key": "unfavourable", "label": "Unfavourable"},
    {"key": "unavailable", "label": "Data unavailable"},
]


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (text or "location").lower()).strip("-") or "location"


def _now_iso() -> str:
    return datetime.now(IST).isoformat(timespec="seconds")


def _time_window(time_window: str) -> dict:
    now = datetime.now(IST)
    if time_window == "tomorrow":
        base, label = now + timedelta(days=1), "Tomorrow (daytime)"
    elif time_window == "today":
        base, label = now, "Today (daytime)"
    else:
        return {
            "label": "Next available forecast window",
            "start": now.isoformat(timespec="seconds"),
            "end": (now + timedelta(hours=24)).isoformat(timespec="seconds"),
            "timezone": "Asia/Kolkata",
        }
    start = base.replace(hour=6, minute=0, second=0, microsecond=0)
    end = base.replace(hour=18, minute=0, second=0, microsecond=0)
    return {"label": label, "start": start.isoformat(timespec="seconds"), "end": end.isoformat(timespec="seconds"), "timezone": "Asia/Kolkata"}


def _condition(value, unit: str, forecast_for, reason: str, source: str) -> dict:
    if value is None:
        return {"value": None, "unit": unit, "status": "unavailable", "reason": reason, "sourceRef": source}
    return {"value": value, "unit": unit, "status": "available", "forecastFor": forecast_for, "sourceRef": source}


def _conditions(weather: dict, ocean: dict) -> dict:
    ok = weather.get("status") == "ok"
    valid_for = weather.get("forecast_valid_for") if ok else None
    forecast_for = f"{valid_for}:00+05:30" if valid_for else None
    # Weather call succeeded but the coordinate sits outside the marine grid
    # (e.g. inland): report the missing value honestly, not as a dead source.
    marine_no_value = "No value returned for this coordinate (marine grid covers coastal waters only)." if ok else "Marine forecast was unavailable for this analysis."
    mosdac = ocean.get("mosdac", {})
    mosdac_sst = mosdac.get("sea_surface_temperature_c") if mosdac.get("status") == "parsed" else None
    if mosdac_sst is not None:
        sst = mosdac_sst
        sst_source = "mosdac"
    elif ok and weather.get("sea_surface_temperature_c") is not None:
        sst = weather.get("sea_surface_temperature_c")
        sst_source = "open-meteo-marine"
    else:
        sst = None
        sst_source = "open-meteo-marine"

    def cond(value, unit, source="open-meteo-marine"):
        return _condition(value if ok else None, unit, forecast_for, marine_no_value, source)

    return {
        "waveHeight": cond(weather.get("wave_height_m"), "m"),
        "wavePeriod": cond(weather.get("wave_period_s"), "s"),
        "windSpeed": cond(weather.get("wind_speed_kmh"), "km/h"),
        "windDirection": cond(weather.get("wind_direction_degrees"), "degrees"),
        "swellHeight": cond(weather.get("swell_height_m"), "m"),
        "swellPeriod": cond(weather.get("swell_period_s"), "s"),
        "currentSpeed": cond(weather.get("current_speed_kmh"), "km/h"),
        "currentDirection": cond(weather.get("current_direction_degrees"), "degrees"),
        "seaSurfaceTemperature": _condition(sst, "°C", forecast_for, marine_no_value, sst_source),
    }


def _pfz(ocean: dict) -> tuple[dict, dict | None]:
    """Returns (fishingZones block, first zone or None)."""
    pfz = ocean.get("pfz_advisory", {})
    kind = pfz.get("data_kind", "")
    if kind == "LIVE OFFICIAL INCOIS ADVISORY":
        block_status = "live"
    elif kind == "DEMO FIXTURE - NOT LIVE DATA":
        block_status = "cached"
    else:
        return {"status": "unavailable", "reason": "No INCOIS PFZ advisory could be fetched for this location.", "zones": []}, None
    advisory_date = (ocean.get("retrieved_at") or _now_iso())[:10]
    valid_from = f"{advisory_date}T06:00:00+05:30"
    raw_valid_until = pfz.get("valid_until")
    try:
        # INCOIS publishes '4 SEP 2026'; normalize it to an ISO timestamp.
        parsed = datetime.strptime(raw_valid_until, "%d %b %Y")
        valid_until = parsed.replace(hour=23, minute=59, tzinfo=IST).isoformat(timespec="seconds")
    except (TypeError, ValueError):
        valid_until = raw_valid_until  # fixture strings stay as-is
    point = pfz.get("nearest_pfz", {})
    zone = {
        "id": f"{_slug(point.get('coastal_reference', 'pfz'))}-001",
        "geometry": {"type": "Point", "coordinates": [point.get("longitude"), point.get("latitude")]},
        "distanceKm": pfz.get("distance_from_user_km"),
        "direction": point.get("direction_from_coast"),
        "bearingDegrees": point.get("bearing_degrees"),
        "depthMeters": point.get("depth_m"),
        "sourceRef": "incois-pfz",
    }
    block = {
        "status": block_status,
        "advisoryDate": advisory_date,
        "validFrom": valid_from,
        "validUntil": valid_until,
        "sourceRef": "incois-pfz",
        "zones": [zone],
    }
    return block, zone


def _hazards(risk: dict, geofence: dict, window: dict) -> list:
    hazards = []
    # 1. Regulatory / Geofence Hazard (advisory level: distinct from physical life-safety storm warnings)
    if geofence and geofence.get("inside_restricted_zone"):
        zone_coords = geofence.get("zone_coordinates", [])
        hazards.append({
            "id": "restricted-zone",
            "type": "restricted_zone",
            "severity": "advisory",
            "title": f"Inside {geofence.get('zone_name', 'Marine Protected Area')}",
            "message": "Commercial fishing is restricted in this zone; move outside the boundary before operations.",
            "geometry": {"type": "Polygon", "coordinates": [zone_coords] if zone_coords else []},
            "validFrom": window["start"],
            "validUntil": window["end"],
            "sourceRef": "neer-geofence",
        })

    # 2. Physical Marine Weather Hazards (watch for moderate sea, warning for severe rough sea)
    w_status = risk.get("weather_status", risk.get("status"))
    if w_status in ("CAUTION", "UNSAFE"):
        severity = "warning" if w_status == "UNSAFE" else "watch"
        weather_reasons = [r for r in (risk.get("reasons") or []) if "restricted" not in r.lower() and "protected" not in r.lower()]
        hazards.append({
            "id": "marine-conditions-watch" if w_status == "CAUTION" else "unsafe-conditions",
            "type": "high_wave",
            "severity": severity,
            "title": "Unfavourable marine conditions" if w_status == "UNSAFE" else "Moderate sea conditions expected",
            "message": " ".join(weather_reasons) or ("Unfavourable marine conditions" if w_status == "UNSAFE" else "Moderate sea conditions expected"),
            "geometry": {"type": "Polygon", "coordinates": []},
            "validFrom": window["start"],
            "validUntil": window["end"],
            "sourceRef": "neer-risk-engine",
        })
    return hazards


def _availability(weather: dict, ocean: dict) -> dict:
    mosdac = ocean.get("mosdac", {})
    ok = weather.get("status") == "ok"
    # "ok" status alone is not enough: inland coordinates return a 200 with
    # null waves, which must not be reported as fully live weather data.
    waves_present = ok and weather.get("wave_height_m") is not None
    weather_status = "live" if waves_present else ("partial" if ok else "unavailable")
    kind = ocean.get("pfz_advisory", {}).get("data_kind", "")
    pfz_status = {"LIVE OFFICIAL INCOIS ADVISORY": "live", "DEMO FIXTURE - NOT LIVE DATA": "cached"}.get(kind, "unavailable")
    currents_status = "live" if ok and weather.get("current_speed_kmh") is not None else "unavailable"
    sst_live = (mosdac.get("status") == "parsed" and mosdac.get("sea_surface_temperature_c") is not None) or (ok and weather.get("sea_surface_temperature_c") is not None)
    sst_status = "live" if sst_live else "unavailable"
    statuses = [weather_status, pfz_status, sst_status, currents_status]
    overall = "unavailable" if all(s == "unavailable" for s in statuses) else ("full" if all(s == "live" for s in statuses) else "partial")
    return {
        "overallStatus": overall,
        "weather": weather_status,
        "pfz": pfz_status,
        "hazards": "live",
        "currents": currents_status,
        "sst": sst_status,
    }


def _source_refs(weather: dict, ocean: dict, window: dict) -> list:
    availability = _availability(weather, ocean)
    refs = [{
        "id": "open-meteo-marine",
        "name": "Open-Meteo Marine",
        "dataset": "Marine Forecast",
        "url": "https://marine-api.open-meteo.com",
        "status": availability["weather"],
        "observedAt": None,
        "issuedAt": None,
        "fetchedAt": weather.get("retrieved_at") or _now_iso(),
        "validFrom": window["start"],
        "validUntil": window["end"],
    }]
    if availability["pfz"] != "unavailable":
        refs.append({
            "id": "incois-pfz",
            "name": "INCOIS Potential Fishing Zone Advisory",
            "dataset": "PFZ Advisory",
            "url": ocean.get("pfz_advisory", {}).get("source_url") or "https://incois.gov.in/MarineFisheries/PfzAdvisory",
            "status": availability["pfz"],
            "observedAt": None,
            "issuedAt": None,
            "fetchedAt": ocean.get("retrieved_at") or _now_iso(),
            "validFrom": window["start"],
            "validUntil": window["end"],
        })
    # Every sourceRef used in conditions/layers must resolve here, including
    # mosdac and the geofence engine, so no dangling references remain.
    mosdac = ocean.get("mosdac", {})
    has_sst = mosdac.get("status") == "parsed" and mosdac.get("sea_surface_temperature_c") is not None
    has_chla = mosdac.get("status") == "parsed" and mosdac.get("chlorophyll_mg_m3") is not None
    if has_sst and has_chla:
        mosdac_status = "live"
    elif has_sst or has_chla:
        mosdac_status = "partial"
    else:
        mosdac_status = "unavailable"

    refs.append({
        "id": "mosdac",
        "name": "MOSDAC Satellite",
        "dataset": "SST / Chlorophyll",
        "url": "https://www.mosdac.gov.in",
        "status": mosdac_status,
        "observedAt": None,
        "issuedAt": None,
        "fetchedAt": ocean.get("retrieved_at") or _now_iso(),
        "validFrom": window["start"],
        "validUntil": window["end"],
    })
    refs.append({
        "id": "neer-risk-engine",
        "name": "NEER Deterministic Risk Engine",
        "dataset": "Safety Assessment",
        "url": None,
        "status": "live",
        "observedAt": None,
        "issuedAt": None,
        "fetchedAt": _now_iso(),
        "validFrom": window["start"],
        "validUntil": window["end"],
    })
    refs.append({
        "id": "neer-geofence",
        "name": "NEER Geofence (Demo MPA polygon)",
        "dataset": "Restricted Zone Check",
        "url": None,
        "status": "live",
        "observedAt": None,
        "issuedAt": None,
        "fetchedAt": _now_iso(),
        "validFrom": window["start"],
        "validUntil": window["end"],
    })
    return refs


def _meta(intent: dict) -> dict:
    lang = intent.get("language", {}) or {}
    code = (lang.get("reply_language_code") or "en-IN").split("-")[0]
    uid = datetime.now(IST).strftime("%Y%m%d%H%M%S")
    return {
        "schemaVersion": "1.0",
        "responseId": f"response-{uid}",
        "analysisId": f"analysis-{uid}",
        "generatedAt": _now_iso(),
        "language": {"requested": code, "response": code},
    }


def _decision_type(query_type: str) -> str:
    return {"safety": "trip_assessment", "fishing": "fishing_opportunity"}.get(query_type, "conditions_check")


def _explainability(risk: dict, zones_status: str, availability: dict, summary: str, persona: str, source_ids: list) -> dict:
    steps = [
        {"id": "context", "label": "Confirmed location and time", "status": "complete"},
        {"id": "conditions", "label": "Checked forecast marine conditions", "status": "complete" if availability["weather"] == "live" else ("partial" if availability["weather"] == "partial" else "unavailable")},
        {"id": "pfz", "label": "Checked latest PFZ advisory", "status": "complete" if zones_status != "unavailable" else "unavailable"},
        {"id": "assessment", "label": "Applied deterministic risk rules", "status": "complete"},
    ]
    if persona == "authority":
        steps.append({"id": "ranking", "label": "Ranked areas by combined risk factors", "status": "complete"})
    findings = [
        {
            "id": f"rule-{index}",
            "title": "Risk rule triggered",
            "observation": reason,
            "impact": "Contributed to the final assessment.",
            "dataRef": "agent_6_risk.rules_checked",
            "ruleRef": "deterministic-risk-rule",
            "sourceRefs": ["neer-risk-engine"],
        }
        for index, reason in enumerate(risk.get("reasons") or [])
    ]
    limitations = [{"type": "official_advisory", "message": "This is a decision-support assessment; follow current official INCOIS, IMD, and port-authority advisories."}]
    if availability["pfz"] == "cached":
        limitations.append({"type": "cached_data", "message": "PFZ information uses the demo fixture, not a live advisory."})
    if availability["pfz"] == "unavailable":
        limitations.append({"type": "missing_data", "message": "No PFZ advisory was available for this location."})
    if availability["weather"] == "unavailable":
        limitations.append({"type": "missing_data", "message": "Live weather data was unavailable; no safety decision could be made."})
    if availability["sst"] == "unavailable":
        limitations.append({"type": "missing_data", "message": "Sea surface temperature data was unavailable for this analysis."})
    return {"summary": summary, "analysisSteps": steps, "findings": findings, "limitations": limitations, "sourceRefs": source_ids}


def _fisherman_payload(meta: dict, intent: dict, weather: dict, ocean: dict, risk: dict, geofence: dict, route: dict, narrative) -> dict:
    location = intent.get("location") or {}
    lat, lon = location.get("latitude"), location.get("longitude")
    coordinates = [lon, lat] if lat is not None and lon is not None else []
    window = _time_window(intent.get("time_window", ""))
    conditions = _conditions(weather, ocean)
    zones_block, first_zone = _pfz(ocean)
    hazards = _hazards(risk, geofence, window)
    hazard_ids = [hazard["id"] for hazard in hazards]
    availability = _availability(weather, ocean)
    decision_status = STATUS_TO_DECISION.get(risk.get("status"), "unavailable")
    # A trip inside a restricted marine zone can NEVER be favourable for fishing!
    if geofence and geofence.get("inside_restricted_zone"):
        if decision_status == "favourable":
            decision_status = "caution"
    decision_type = _decision_type(intent.get("query_type", ""))
    location_name = location.get("name", "your location")

    geometry = {"type": "Point", "coordinates": coordinates, "label": location_name, "source": "user_query"}
    vessel_context = {"type": VESSEL_TYPE_CODES.get(intent.get("vessel_type"), "small_fishing_boat"), "beamWidthMeters": None, "lengthMeters": None}
    # Schema: context.geometry carries no "source" and context.vesselContext
    # carries no "lengthMeters" — those exist only on the request block.
    context_geometry = {"type": "Point", "coordinates": coordinates, "label": location_name}
    context_vessel = {"type": vessel_context["type"], "beamWidthMeters": None}
    source_refs = _source_refs(weather, ocean, window)

    if first_zone and risk.get("status") in ("SAFE", "CAUTION"):
        direction = first_zone.get("direction") or "near"
        pfz_recommendation = {
            "status": "available",
            "headline": f"Nearest PFZ is about {first_zone.get('distanceKm')} km {direction} of {location_name}.".replace("  ", " "),
            "zoneId": first_zone["id"],
            "distanceKm": first_zone.get("distanceKm"),
            "direction": first_zone.get("direction"),
            "validUntil": zones_block.get("validUntil"),
        }
    elif first_zone and risk.get("status") == "UNSAFE":
        pfz_recommendation = {"status": "unavailable", "reason": "No PFZ recommendation while conditions are unfavourable."}
    elif first_zone:
        pfz_recommendation = {"status": "unavailable", "reason": "No PFZ recommendation while the safety assessment is unavailable."}
    else:
        pfz_recommendation = {"status": "unavailable", "reason": "No PFZ advisory available for this location."}

    # Route and PFZ recommendations only make sense when the risk engine could
    # actually make a call; UNKNOWN/UNSAFE trips must not get routing advice.
    route_recommendation = None
    if route and route.get("status") == "ok" and risk.get("status") in ("SAFE", "CAUTION"):
        route_recommendation = {
            "status": "available",
            "routeId": route.get("recommended_route_id"),
            "maxExpectedWaveMeters": route.get("max_expected_wave"),
            "waypoints": route.get("waypoints", []),
        }

    actions = []
    if decision_status == "favourable":
        actions.append("Conditions are favourable within conservative thresholds; still carry safety gear and inform shore contact.")
    elif decision_status == "unavailable":
        actions.append("Assessment unavailable — retry once live marine data reaches this location, and follow official advisories meanwhile.")
    else:
        actions.append("Check the latest official INCOIS/IMD advisory before departure.")
    if decision_status == "unfavourable":
        actions.append("Consider postponing the trip until conditions improve.")
    if geofence and geofence.get("inside_restricted_zone"):
        actions.append(f"Exit {geofence.get('zone_name', 'the restricted zone')} before fishing operations.")
    if route_recommendation:
        actions.append(f"Prefer recommended route {route_recommendation['routeId']} (max expected wave {route_recommendation['maxExpectedWaveMeters']} m).")

    caveats = []
    if availability["weather"] == "unavailable":
        caveats.append("Live weather data was unavailable for this analysis.")
    if availability["pfz"] == "cached":
        caveats.append("PFZ information reflects the demo fixture, not a live feed.")
    if availability["sst"] == "unavailable":
        caveats.append("Sea surface temperature and current data were unavailable for this analysis.")

    # Determine headline and reasons respecting geofence restriction
    if geofence and geofence.get("inside_restricted_zone"):
        zone = geofence.get("zone_name", "restricted marine zone")
        w_status = risk.get("weather_status", risk.get("status"))
        if w_status == "SAFE":
            headline = f"Weather conditions are favourable, but you are inside {zone}. Exit before fishing."
        elif w_status == "CAUTION":
            headline = f"Caution advised: Moderate sea conditions AND you are inside {zone}. Exit zone before fishing."
        elif w_status == "UNSAFE":
            headline = f"DANGER: Severe weather conditions AND vessel is inside {zone}. Do not venture out."
        else:
            headline = f"Caution advised: Vessel is inside {zone}. Exit zone before fishing."
    else:
        headline = HEADLINES.get(risk.get("status"), HEADLINES["UNKNOWN"])

    reasons = list(risk.get("reasons") or [])
    if geofence and geofence.get("inside_restricted_zone") and not any("restricted" in r.lower() or "protected" in r.lower() for r in reasons):
        reasons.insert(0, f"Location is inside {geofence.get('zone_name', 'a restricted zone')}; commercial fishing is prohibited inside the boundary.")

    decision_output = {
        "persona": "fisherman",
        "decisionType": decision_type,
        "status": decision_status,
        "headline": headline,
        "summary": f"Assessment for {location_name} ({window['label'].lower()}): {decision_status}.",
        "reasons": reasons,
        "recommendedActions": actions,
        "caveats": caveats,
        "evidenceRefs": ["marineSituation.conditions.waveHeight", "marineSituation.conditions.windSpeed"],
        "pfzRecommendation": pfz_recommendation,
    }

    hazard_features = []
    for h in hazards:
        coords = h.get("geometry", {}).get("coordinates")
        if coords:
            hazard_features.append({
                "id": h["id"],
                "geometry": h["geometry"],
                "properties": {
                    "label": h["title"],
                    "severity": h["severity"],
                    "type": h["type"],
                    "status": "unfavourable" if h["severity"] == "warning" else "caution",
                },
            })

    map_block = {
        "status": "available" if coordinates else "unavailable",
        "viewport": {"center": coordinates or None, "zoom": 10, "bounds": None},
        "layers": [
            {
                "id": "selected-location",
                "category": "selected_location",
                "label": "Your Location",
                "geometryType": "Point",
                "visibility": "default",
                "dataStatus": "live",
                "sourceRefs": [],
                "features": [{"id": "user-location", "geometry": {"type": "Point", "coordinates": coordinates}, "properties": {"label": location_name, "status": "available"}}],
            },
            {
                "id": "potential-fishing-zones",
                "category": "pfz",
                "label": "Potential Fishing Zones",
                "geometryType": "Point",
                "visibility": "default",
                "dataStatus": zones_block["status"],
                "sourceRefs": ["incois-pfz"] if zones_block["status"] != "unavailable" else [],
                "features": [
                    {
                        "id": zone["id"],
                        "geometry": zone["geometry"],
                        "properties": {"label": "Potential Fishing Zone", "status": "available", "distanceKm": zone["distanceKm"], "direction": zone["direction"], "detailsRef": f"marineSituation.fishingZones.zones.{zone['id']}"},
                    }
                    for zone in zones_block["zones"]
                ],
            },
            {
                "id": "hazard-zones",
                "category": "hazard",
                "label": "Hazard Advisories",
                "geometryType": "Polygon",
                "visibility": "default",
                "dataStatus": "live",
                "sourceRefs": ["neer-risk-engine", "neer-geofence"],
                "features": hazard_features,
            },
        ],
        "legend": LEGEND,
    }

    return {
        "meta": meta,
        "request": {
            "originalQuery": intent.get("original_query"),
            "persona": "fisherman",
            "scope": "point",
            "intent": decision_type,
            "geometry": geometry,
            "timeWindow": window,
            "vesselContext": vessel_context,
        },
        "marineSituation": {
            "analysisId": meta["analysisId"],
            "generatedAt": meta["generatedAt"],
            "context": {"persona": "fisherman", "scope": "point", "geometry": context_geometry, "timeWindow": window, "vesselContext": context_vessel},
            "conditions": conditions,
            "fishingZones": zones_block,
            "hazards": hazards,
            "spatialAnalysis": {"scope": "point", "pointSummary": {"label": location_name, "coordinates": coordinates}},
            "dataAvailability": availability,
            "sourceReferences": source_refs,
        },
        "decisionOutput": decision_output,
        "map": map_block,
        "provenance": {
            "overallStatus": availability["overallStatus"],
            "summary": f"Weather is {availability['weather']}; PFZ is {availability['pfz']}; SST is {availability['sst']}.",
            "availability": {key: availability[key] for key in ("weather", "pfz", "hazards", "sst", "currents")},
            "sources": [ref["id"] for ref in source_refs],
        },
        "explainability": _explainability(
            risk,
            zones_block["status"],
            availability,
            # The LLM narrative lives here (schema allows a free-text summary),
            # keeping decisionOutput strictly to the required fields.
            narrative or f"ORCA marked conditions as {decision_status} based on deterministic risk rules and available live data.",
            "fisherman",
            [ref["id"] for ref in source_refs],
        ),
        "alertWorkflow": None,
    }


def _authority_payload(meta: dict, intent: dict, weather: dict, ocean: dict, risk: dict, geofence: dict, route: dict, narrative) -> dict:
    location = intent.get("location") or {}
    lat, lon = location.get("latitude"), location.get("longitude")
    coordinates = [lon, lat] if lat is not None and lon is not None else []
    window = _time_window(intent.get("time_window", ""))
    conditions = _conditions(weather, ocean)
    zones_block, _first_zone = _pfz(ocean)
    hazards = _hazards(risk, geofence, window)
    hazard_ids = [hazard["id"] for hazard in hazards]
    availability = _availability(weather, ocean)
    decision_status = STATUS_TO_DECISION.get(risk.get("status"), "unavailable")
    decision_type = "regional_risk_assessment"
    base_name = location.get("name", "Monitored coast")
    # Clean region label: if base_name already contains coast, don't duplicate it
    if base_name.startswith("Coordinates"):
        region_label = "Monitored coast"
    elif "coast" in base_name.lower():
        region_label = base_name
    else:
        region_label = f"{base_name} coast"

    region_id = _slug(location.get("name", "region"))
    source_refs = _source_refs(weather, ocean, window)
    geometry = {"type": "Polygon", "coordinates": [], "label": region_label, "source": "manual_selection"}
    region_conditions = {"waveHeight": conditions["waveHeight"], "windSpeed": conditions["windSpeed"]}
    region = {
        "id": region_id,
        "label": region_label,
        "geometry": {"type": "Polygon", "coordinates": []},
        "conditions": region_conditions,
        "hazardIds": hazard_ids,
    }

    priority = STATUS_TO_PRIORITY.get(risk.get("status"), "unavailable")
    decision_output = {
        "persona": "authority",
        "decisionType": decision_type,
        "status": decision_status,
        "headline": f"{region_label} is the priority area for {window['label'].lower()}.",
        "summary": f"Regional assessment status: {decision_status}. " + " ".join(risk.get("reasons") or []),
        "reasons": list(risk.get("reasons") or []),
        "recommendedActions": [
            "Prioritize outreach to small-vessel operators in the flagged area." if decision_status != "favourable" else "No special outreach required; conditions are favourable within conservative thresholds.",
            "Review the generated warning draft below before any dissemination decision.",
        ],
        "caveats": [
            "This MVP assessment covers one representative point of the selected region, not a full area polygon sweep.",
            "SST and current data were unavailable for this analysis." if availability["sst"] == "unavailable" else "Satellite data was available for this analysis.",
            "This is a decision-support assessment, not an official warning.",
        ],
        "evidenceRefs": [f"marineSituation.spatialAnalysis.regions.{region_id}"],
        "areaPriorities": [{
            "areaId": region_id,
            "label": region_label,
            "priority": priority,
            "status": decision_status,
            "reasons": list(risk.get("reasons") or []),
            "hazardIds": hazard_ids,
        }],
    }

    severity = STATUS_TO_SEVERITY.get(risk.get("status"), "unavailable")
    alert_workflow = {
        "workflowId": f"warning-{region_id}-{meta['responseId']}",
        "status": "draft",
        "sourceDecisionRef": f"decision-output-{meta['analysisId']}",
        "draft": {
            "severity": severity,
            "title": f"Marine conditions {decision_status} for small vessels — {region_label}",
            "message": " ".join(risk.get("reasons") or []) + " Small fishing vessels are advised to review the latest official marine advisories before departure.",
            "targetAreas": [region_label],
            "targetAudience": ["small_fishing_vessels", "coastal_fishing_communities"],
            "validFrom": window["start"],
            "validUntil": window["end"],
            "languages": [meta["language"]["response"]],
            "hazardRefs": hazard_ids,
            "evidenceRefs": [f"marineSituation.conditions.waveHeight", f"marineSituation.conditions.windSpeed"],
            "disclaimer": "Draft generated by ORCA for authority review. It is not an official warning until approved and sent through authorised channels.",
        },
        "review": {"status": "not_implemented_in_mvp", "edited": False, "reviewedBy": None, "reviewedAt": None, "approvalNote": None},
        "simulation": {"status": "not_started", "channels": [], "simulatedAt": None, "summary": None},
    }

    map_block = {
        "status": "available" if coordinates else "unavailable",
        "viewport": {"center": coordinates or None, "zoom": 8, "bounds": None},
        "layers": [
            {
                "id": "regional-risk",
                "category": "regional_risk",
                "label": "Regional Risk Overview",
                "geometryType": "Polygon",
                "visibility": "default",
                "dataStatus": "live",
                "sourceRefs": ["open-meteo-marine", "neer-risk-engine"],
                "features": [{"id": region_id, "geometry": {"type": "Polygon", "coordinates": []}, "properties": {"label": region_label, "status": decision_status, "priority": priority}}],
            },
            {
                "id": "hazard-zones",
                "category": "hazard",
                "label": "Hazard Advisories",
                "geometryType": "Polygon",
                "visibility": "default",
                "dataStatus": "live",
                "sourceRefs": ["neer-risk-engine", "neer-geofence"],
                "features": [],
            },
        ],
        "legend": LEGEND,
    }

    return {
        "meta": meta,
        "request": {
            "originalQuery": intent.get("original_query"),
            "persona": "authority",
            "scope": "region",
            "intent": decision_type,
            "geometry": geometry,
            "timeWindow": window,
            "vesselContext": None,
        },
        "marineSituation": {
            "analysisId": meta["analysisId"],
            "generatedAt": meta["generatedAt"],
            "context": {"persona": "authority", "scope": "region", "geometry": {"type": "Polygon", "coordinates": [], "label": region_label}, "timeWindow": window, "vesselContext": None},
            "conditions": conditions,
            "fishingZones": {"status": "unavailable", "reason": "Not applicable at regional scope for this persona.", "zones": []},
            "hazards": hazards,
            "spatialAnalysis": {"scope": "region", "regions": [region]},
            "dataAvailability": availability,
            "sourceReferences": source_refs,
        },
        "decisionOutput": decision_output,
        "map": map_block,
        "provenance": {
            "overallStatus": availability["overallStatus"],
            "summary": f"Weather is {availability['weather']}; PFZ is not applicable for authority scope; SST is {availability['sst']}.",
            "availability": {key: availability[key] for key in ("weather", "hazards", "sst", "currents")},
            "sources": [ref["id"] for ref in source_refs],
        },
        "explainability": _explainability(
            risk,
            zones_block["status"],
            availability,
            narrative or f"ORCA ranked {region_label} as {priority} priority based on deterministic risk rules and available live data.",
            "authority",
            [ref["id"] for ref in source_refs],
        ),
        "alertWorkflow": alert_workflow,
    }


def build_orca_payload(intent: dict, weather: dict, ocean: dict, risk: dict, geofence: dict | None = None, route: dict | None = None, narrative: str | None = None) -> dict:
    intent = intent or {}
    meta = _meta(intent)
    builder = _authority_payload if intent.get("persona") == "authority" else _fisherman_payload
    return builder(meta, intent, weather or {}, ocean or {}, risk or {}, geofence or {}, route or {}, narrative)
