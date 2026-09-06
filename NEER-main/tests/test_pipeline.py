import sys
import math
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agents.agent_6_risk import agent_6_risk
from agents.agent_5_route import agent_5_route
from services.payload_builder import build_orca_payload
from services.mosdac_parser import _valid_number

print("=== STARTING RAW TEST SUITE ===")

dummy_intent = {
    "original_query": "kya fishing safe hai?",
    "query_type": "safety",
    "persona": "fisherman",
    "time_window": "tomorrow",
    "vessel_type": "small fishing boat",
    "location": {"name": "Kochi, Kerala", "latitude": 9.93988, "longitude": 76.26022}
}

dummy_ocean = {
    "status": "live",
    "mosdac": {"status": "parsed", "sea_surface_temperature_c": 28.5, "chlorophyll_mg_m3": 0.35},
    "pfz_advisory": {
        "data_kind": "LIVE OFFICIAL INCOIS ADVISORY",
        "sector": "KERALA",
        "valid_until": "5 SEP 2026",
        "nearest_pfz": {
            "coastal_reference": "Kochi",
            "direction_from_coast": "W",
            "bearing_degrees": 270,
            "distance_from_coast_km": 15,
            "depth_m": "30-40",
            "latitude": 9.95,
            "longitude": 76.10
        },
        "distance_from_user_km": 15.0
    }
}

geofence_inside = {
    "inside_restricted_zone": True,
    "zone_name": "Vembanad Marine Protected Area",
    "zone_coordinates": [[76.20, 9.90], [76.30, 9.90], [76.30, 10.00], [76.20, 10.00], [76.20, 9.90]]
}
geofence_outside = {"inside_restricted_zone": False, "zone_name": None, "zone_coordinates": []}

weather_safe = {
    "status": "ok",
    "forecast_valid_for": "2026-09-05T06:00",
    "wave_height_m": 1.2,
    "wind_speed_kmh": 20.0,
    "swell_height_m": 0.8,
    "swell_period_s": 8.0,
    "current_speed_kmh": 1.5,
    "current_direction_degrees": 240,
    "sea_surface_temperature_c": 28.5
}
weather_moderate = {
    "status": "ok",
    "forecast_valid_for": "2026-09-05T06:00",
    "wave_height_m": 2.1,
    "wind_speed_kmh": 35.0,
    "swell_height_m": 1.4,
    "swell_period_s": 9.0,
    "current_speed_kmh": 2.0,
    "current_direction_degrees": 250,
    "sea_surface_temperature_c": 28.0
}
weather_severe = {
    "status": "ok",
    "forecast_valid_for": "2026-09-05T06:00",
    "wave_height_m": 3.2,
    "wind_speed_kmh": 48.0,
    "swell_height_m": 2.5,
    "swell_period_s": 10.0,
    "current_speed_kmh": 3.5,
    "current_direction_degrees": 270,
    "sea_surface_temperature_c": 27.5
}

# Test 1
r1 = agent_6_risk(weather_safe, dummy_ocean, "small fishing boat", geofence_outside)
p1 = build_orca_payload(dummy_intent, weather_safe, dummy_ocean, r1, geofence_outside, None, "Safe")
assert r1["status"] == "SAFE" and p1["decisionOutput"]["status"] == "favourable"
print("TEST 1 PASSED: Safe + Outside -> decisionOutput.status = 'favourable'")

# Test 2: Safe Weather + INSIDE Restricted Zone (Geofence-only caution)
r2 = agent_6_risk(weather_safe, dummy_ocean, "small fishing boat", geofence_inside)
p2 = build_orca_payload(dummy_intent, weather_safe, dummy_ocean, r2, geofence_inside, None, "Caution zone")
assert r2["status"] == "CAUTION" and p2["decisionOutput"]["status"] == "caution"
expected_headline = "Weather conditions are favourable, but you are inside Vembanad Marine Protected Area. Exit before fishing."
assert p2["decisionOutput"]["headline"] == expected_headline, f"Headline mismatch: got {p2['decisionOutput']['headline']}"
# Crucial check: verify that NO physical high_wave hazard was generated since weather is safe!
hazard_types = [h["type"] for h in p2["marineSituation"]["hazards"]]
assert hazard_types == ["restricted_zone"], f"Expected only ['restricted_zone'], got {hazard_types}"
print(f"TEST 2 PASSED: Safe + INSIDE Zone -> decisionOutput.status = '{p2['decisionOutput']['status']}', headline = '{p2['decisionOutput']['headline']}', hazards = {hazard_types}")

# Test 2b: Moderate Weather + INSIDE Restricted Zone (Compound Moderate)
r2b = agent_6_risk(weather_moderate, dummy_ocean, "small fishing boat", geofence_inside)
p2b = build_orca_payload(dummy_intent, weather_moderate, dummy_ocean, r2b, geofence_inside, None, "Compound moderate")
assert r2b["status"] == "CAUTION" and p2b["decisionOutput"]["status"] == "caution"
assert "Moderate sea conditions AND you are inside" in p2b["decisionOutput"]["headline"]
hz_info_2b = [(h["type"], h["severity"]) for h in p2b["marineSituation"]["hazards"]]
assert ("restricted_zone", "advisory") in hz_info_2b and ("high_wave", "watch") in hz_info_2b
print(f"TEST 2b PASSED: Moderate + INSIDE Zone -> decisionOutput.status = '{p2b['decisionOutput']['status']}', hazards = {hz_info_2b}")

# Test 3
r3 = agent_6_risk(weather_moderate, dummy_ocean, "small fishing boat", geofence_outside)
p3 = build_orca_payload(dummy_intent, weather_moderate, dummy_ocean, r3, geofence_outside, None, "Moderate")
assert r3["status"] == "CAUTION" and p3["decisionOutput"]["status"] == "caution"
watch_hazards = [h for h in p3["marineSituation"]["hazards"] if h["severity"] == "watch"]
assert len(watch_hazards) >= 1
print(f"TEST 3 PASSED: Moderate Sea Alone -> decisionOutput.status = '{p3['decisionOutput']['status']}', hazard severity = '{watch_hazards[0]['severity']}'")

# Test 4
r4 = agent_6_risk(weather_severe, dummy_ocean, "small fishing boat", geofence_outside)
p4 = build_orca_payload(dummy_intent, weather_severe, dummy_ocean, r4, geofence_outside, None, "Severe")
assert r4["status"] == "UNSAFE" and p4["decisionOutput"]["status"] == "unfavourable"
warn_hazards = [h for h in p4["marineSituation"]["hazards"] if h["severity"] == "warning"]
assert len(warn_hazards) >= 1
print(f"TEST 4 PASSED: Severe Weather Alone -> decisionOutput.status = '{p4['decisionOutput']['status']}', hazard severity = '{warn_hazards[0]['severity']}'")

# Test 5
r5 = agent_6_risk(weather_severe, dummy_ocean, "small fishing boat", geofence_inside)
p5 = build_orca_payload(dummy_intent, weather_severe, dummy_ocean, r5, geofence_inside, None, "Severe + Zone")
assert r5["status"] == "UNSAFE" and p5["decisionOutput"]["status"] == "unfavourable"
assert "DANGER" in p5["decisionOutput"]["headline"]
hz_info_5 = [(h["type"], h["severity"]) for h in p5["marineSituation"]["hazards"]]
assert ("restricted_zone", "advisory") in hz_info_5 and ("high_wave", "warning") in hz_info_5
print(f"TEST 5 PASSED: Compound (Severe + Zone) -> decisionOutput.status = '{p5['decisionOutput']['status']}', hazards = {hz_info_5}")

# Test 6
hz = [h for h in p2["marineSituation"]["hazards"] if h["type"] == "restricted_zone"][0]
coords = hz["geometry"]["coordinates"]
assert len(coords) == 1 and len(coords[0]) == 5 and coords[0][0] == coords[0][-1]
print(f"TEST 6 PASSED: GeoJSON Polygon depth -> outer ring count: {len(coords)}, vertices: {len(coords[0])}, closed: {coords[0][0] == coords[0][-1]}")

# Test 7
map_layers = p2["map"]["layers"]
hazard_layer = next(l for l in map_layers if l["id"] == "hazard-zones")
legend_keys = {item["key"] for item in p2["map"]["legend"]}
for f in hazard_layer["features"]:
    assert f["properties"]["status"] in legend_keys
print(f"TEST 7 PASSED: Hazard layer features match map.legend keys: {legend_keys}")

# Test 8
route = agent_5_route(dummy_intent, dummy_ocean)
assert route["status"] == "ok"
w0 = route["waypoints"][0]
assert abs(w0[0] - 76.26022) < 0.001 and abs(w0[1] - 9.93988) < 0.001
print(f"TEST 8 PASSED: Route waypoints GeoJSON [lon, lat] -> origin: {w0}, total waypoints: {len(route['waypoints'])}")

# Test 9
assert _valid_number(-999000000.0, -999000000.0) is None
assert _valid_number(float("nan")) is None
assert _valid_number(float("inf")) is None
assert _valid_number(0.0) == 0.0
assert _valid_number(28.5) == 28.5
print("TEST 9 PASSED: MOSDAC sentinel values correctly mapped to None; valid 0.0 preserved")

print("=== ALL 9 TESTS PASSED WITH ZERO ERRORS ===")
