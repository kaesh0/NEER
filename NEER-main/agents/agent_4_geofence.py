"""Agent 4: Geofencing via Shapely (MVP flat-file workaround)."""
from __future__ import annotations
import math

from shapely.geometry import Point, Polygon
from shapely.ops import nearest_points

# REPOSITORY PATTERN: MOCK DATA
# When upgrading to Approach B, delete this polygon and replace with a PostGIS connection.
# Multi-region Indian Coastal Marine Protected Areas
COASTAL_MPAS = [
    {
        "name": "Vembanad Marine Protected Area, Kerala",
        "polygon": Polygon([(76.0, 9.5), (76.5, 9.5), (76.5, 10.0), (76.0, 10.0)]),
        "state": "Kerala",
    },
    {
        "name": "Malvan Marine Sanctuary, Maharashtra",
        "polygon": Polygon([(73.40, 15.95), (73.55, 15.95), (73.55, 16.15), (73.40, 16.15)]),
        "state": "Maharashtra",
    },
    {
        "name": "Gulf of Kutch Marine National Park, Gujarat",
        "polygon": Polygon([(69.00, 22.30), (70.20, 22.30), (70.20, 22.80), (69.00, 22.80)]),
        "state": "Gujarat",
    },
    {
        "name": "Gulf of Mannar Marine National Park, Tamil Nadu",
        "polygon": Polygon([(78.10, 8.80), (79.30, 8.80), (79.30, 9.45), (78.10, 9.45)]),
        "state": "Tamil Nadu",
    },
    {
        "name": "Gahirmatha Marine Sanctuary, Odisha",
        "polygon": Polygon([(86.80, 20.40), (87.25, 20.40), (87.25, 20.90), (86.80, 20.90)]),
        "state": "Odisha",
    },
    {
        "name": "Coringa Marine Protected Area, Andhra Pradesh",
        "polygon": Polygon([(82.15, 16.70), (82.35, 16.70), (82.35, 17.00), (82.15, 17.00)]),
        "state": "Andhra Pradesh",
    },
]

# Preserve MOCK_MPA_POLYGON alias for tests
MOCK_MPA_POLYGON = COASTAL_MPAS[0]["polygon"]

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in km; accurate at Indian latitudes, unlike
    degree-scaling (1 deg of longitude shrinks from ~111 km at the equator to
    ~109 km at 10N and ~102 km at 23N)."""
    radius_km = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * radius_km * math.asin(math.sqrt(a))

def _check_geofence_internal(lat: float, lon: float) -> dict:
    """Check user coordinates against all Indian coastal MPAs."""
    user_point = Point(lon, lat)

    # 1. Check if inside any coastal MPA
    for mpa in COASTAL_MPAS:
        poly = mpa["polygon"]
        if poly.contains(user_point):
            return {
                "inside_restricted_zone": True,
                "nearest_boundary_km": 0.0,
                "zone_name": mpa["name"],
                "zone_coordinates": list(poly.exterior.coords),
                "is_nearby": True,
            }

    # 2. Find closest MPA
    closest_mpa = COASTAL_MPAS[0]
    min_dist = float("inf")

    for mpa in COASTAL_MPAS:
        poly = mpa["polygon"]
        boundary = nearest_points(poly, user_point)[0]
        dist = _haversine_km(lat, lon, boundary.y, boundary.x)
        if dist < min_dist:
            min_dist = dist
            closest_mpa = mpa

    min_dist_km = round(min_dist, 2)
    is_nearby = min_dist_km <= 50.0

    return {
        "inside_restricted_zone": False,
        "nearest_boundary_km": min_dist_km,
        "zone_name": closest_mpa["name"],
        "zone_coordinates": list(closest_mpa["polygon"].exterior.coords) if is_nearby else [],
        "is_nearby": is_nearby,
    }

def agent_4_geofence(intent: dict) -> dict:
    if not intent.get("location"):
        return {"agent": "geofence", "status": "skipped", "reason": "Location required."}
    
    lat = intent["location"]["latitude"]
    lon = intent["location"]["longitude"]
    
    result = _check_geofence_internal(lat, lon)
    result["agent"] = "geofence"
    result["status"] = "ok"
    
    return result