"""Extract nearest-point SST and chlorophyll values from downloaded MOSDAC files."""

from __future__ import annotations

import copy
import math
from pathlib import Path
from typing import Any

import h5py
import numpy as np
from scipy.io import netcdf_file


def _latest_file(directory: Path, patterns: tuple[str, ...]) -> Path | None:
    files: list[Path] = []
    for pattern in patterns:
        files.extend(directory.glob(pattern))
    return max(files, key=lambda path: path.stat().st_mtime, default=None)


def _decode(value: Any) -> Any:
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    if hasattr(value, "item"):
        return value.item()
    return value


def _nearest_index_2d(latitudes: np.ndarray, longitudes: np.ndarray, latitude: float, longitude: float) -> tuple[int, int]:
    distance = (latitudes - latitude) ** 2 + (longitudes - longitude) ** 2
    return tuple(int(index) for index in np.unravel_index(np.nanargmin(distance), distance.shape))


def _valid_number(value: float, fill_value: float | None = None) -> float | None:
    if not math.isfinite(value):
        return None
    if fill_value is not None and math.isclose(value, fill_value):
        return None
    if abs(value) > 1e20:
        return None
    return value


def _extract_sst(path: Path, latitude: float, longitude: float) -> dict:
    with h5py.File(path, "r") as file:
        lat_dataset = file["Latitude"]
        lon_dataset = file["Longitude"]
        sst_dataset = file["SST_DLY"]
        lat_scale = float(np.array(lat_dataset.attrs.get("scale_factor", 1.0)).reshape(-1)[0])
        lat_offset = float(np.array(lat_dataset.attrs.get("add_offset", 0.0)).reshape(-1)[0])
        lon_scale = float(np.array(lon_dataset.attrs.get("scale_factor", 1.0)).reshape(-1)[0])
        lon_offset = float(np.array(lon_dataset.attrs.get("add_offset", 0.0)).reshape(-1)[0])
        latitudes = lat_dataset[()] * lat_scale + lat_offset
        longitudes = lon_dataset[()] * lon_scale + lon_offset
        row, column = _nearest_index_2d(latitudes, longitudes, latitude, longitude)
        fill_value = float(np.array(sst_dataset.attrs.get("_FillValue", np.nan)).reshape(-1)[0])
        kelvin = _valid_number(float(sst_dataset[0, row, column]), fill_value)
        celsius = round(kelvin - 273.15, 2) if kelvin is not None else None
        return {
            "file": path.name,
            "variable": "SST_DLY",
            "value_c": celsius,
            "raw_value_k": round(kelvin, 2) if kelvin is not None else None,
            "nearest_latitude": round(float(latitudes[row, column]), 4),
            "nearest_longitude": round(float(longitudes[row, column]), 4),
            "units": "degC",
            "product_time": _decode(file.attrs.get("Product_Creation_Time")),
        }


def _extract_chlorophyll(path: Path, latitude: float, longitude: float) -> dict:
    with netcdf_file(path, "r", mmap=False) as file:
        latitudes = np.array(file.variables["lat"].data, dtype=float)
        longitudes = np.array(file.variables["lon"].data, dtype=float)
        row = int(np.nanargmin((latitudes - latitude) ** 2))
        column = int(np.nanargmin((longitudes - longitude) ** 2))
        variable = file.variables["chla"]
        missing = float(getattr(variable, "missing_value", np.nan))
        value = _valid_number(float(variable.data[0, 0, row, column]), missing)
        return {
            "file": path.name,
            "variable": "chla",
            "value_mg_m3": round(value, 4) if value is not None else None,
            "nearest_latitude": round(float(latitudes[row]), 4),
            "nearest_longitude": round(float(longitudes[column]), 4),
            "units": "mg/m3",
            "time_units": _decode(getattr(file.variables["time"], "units", None)),
        }


# Parsed-result cache: the granules are ~30 MB and change at most once per
# day, so decoding full lat/lon grids on every turn is pure waste. Keyed by
# file identity + mtime, so a new download invalidates automatically.
_MOSDAC_CACHE: dict[tuple, dict] = {}


def extract_mosdac_values(location: dict, directory: str = "mosdac_data") -> dict:
    """Return nearest MOSDAC SST/chlorophyll values from already-downloaded files."""
    data_dir = Path(directory)
    latitude = float(location["latitude"])
    longitude = float(location["longitude"])
    sst_file = _latest_file(data_dir, ("*SST_DLY*.h5", "*SST*.h5"))
    chlorophyll_file = _latest_file(data_dir, ("*L4AC*.nc", "*OCML4AC*.nc", "*ch*.nc"))
    cache_key = (
        str(sst_file), sst_file.stat().st_mtime if sst_file else None,
        str(chlorophyll_file), chlorophyll_file.stat().st_mtime if chlorophyll_file else None,
        round(latitude, 2), round(longitude, 2),
    )
    cached = _MOSDAC_CACHE.get(cache_key)
    if cached is not None:
        return copy.deepcopy(cached)

    result = {
        "source": "Downloaded MOSDAC files",
        "download_dir": str(data_dir),
        "sea_surface_temperature_c": None,
        "chlorophyll_mg_m3": None,
        "sst": None,
        "chlorophyll": None,
        "status": "no_downloaded_files",
    }
    if sst_file:
        result["sst"] = _extract_sst(sst_file, latitude, longitude)
        result["sea_surface_temperature_c"] = result["sst"]["value_c"]
    if chlorophyll_file:
        result["chlorophyll"] = _extract_chlorophyll(chlorophyll_file, latitude, longitude)
        result["chlorophyll_mg_m3"] = result["chlorophyll"]["value_mg_m3"]
    if sst_file or chlorophyll_file:
        result["status"] = "parsed"
    _MOSDAC_CACHE[cache_key] = result
    return copy.deepcopy(result)
