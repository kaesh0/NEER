"""Agent 4: Geofencing via Shapely (MVP flat-file workaround)."""
from __future__ import annotations
import math

from shapely.geometry import Point, Polygon
from shapely.ops import nearest_points

# REPOSITORY PATTERN: MOCK DATA
# When upgrading to Approach B, delete this polygon and replace with a PostGIS connection.
MOCK_MPA_POLYGON = Polygon([
    (76.0, 9.5), (76.5, 9.5), (76.5, 10.0), (76.0, 10.0) # Abstract box near Kochi
])

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
    """Isolates the math so the agent orchestration doesn't change later."""
    user_point = Point(lon, lat) # Shapely uses (x, y) -> (lon, lat)

    inside = MOCK_MPA_POLYGON.contains(user_point)
    # Distance from the user to the nearest point on the polygon boundary,
    # converted to real surface distance via haversine (0 when inside).
    boundary = nearest_points(MOCK_MPA_POLYGON, user_point)[0]
    dist_km = round(_haversine_km(lat, lon, boundary.y, boundary.x), 2)
    
    # Extract coordinates from the Shapely polygon to send to the UI
    polygon_coords = list(MOCK_MPA_POLYGON.exterior.coords)
    
    return {
        "inside_restricted_zone": inside,
        "nearest_boundary_km": dist_km,
        "zone_name": "Demo Marine Protected Area",
        "zone_coordinates": polygon_coords
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