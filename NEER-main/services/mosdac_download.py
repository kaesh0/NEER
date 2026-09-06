"""Download the latest MOSDAC satellite granule for the configured products.

Set MOSDAC_USERNAME, MOSDAC_PASSWORD and dataset IDs in .env, then run:
    python services/mosdac_download.py

This follows MOSDAC's documented download flow: search -> authenticate -> download.
"""

from __future__ import annotations

import json
import os
import sys
from datetime import date, timedelta
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

try:
    from services.utils import load_env
except ImportError:  # running as a script: python services/mosdac_download.py
    from utils import load_env


SEARCH_URL = "https://mosdac.gov.in/apios/datasets.json"
TOKEN_URL = "https://mosdac.gov.in/download_api/gettoken"
DOWNLOAD_URL = "https://mosdac.gov.in/download_api/download"


def _request_json(url: str, *, params: dict | None = None, payload: dict | None = None) -> dict:
    if params:
        url = f"{url}?{urlencode(params)}"
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = Request(url, data=data, headers={"Content-Type": "application/json", "User-Agent": "NEER-MVP/0.1"})
    with urlopen(request, timeout=25) as response:  # nosec B310 - official MOSDAC endpoints only
        return json.loads(response.read().decode("utf-8"))


def _download_product(label: str, dataset_id: str, token: str, output_dir: Path) -> Path:
    days = int(os.getenv("MOSDAC_SEARCH_DAYS", "7"))
    end = date.today()
    bbox = os.getenv("MOSDAC_BOUNDING_BOX", "")
    params = {"datasetId": dataset_id, "startTime": (end - timedelta(days=days)).isoformat(), "endTime": end.isoformat(), "count": 1}
    if bbox:
        params["boundingBox"] = bbox
    results = _request_json(SEARCH_URL, params=params)
    entries = results.get("entries", [])
    if not entries:
        raise ValueError(f"No recent {label} file found for dataset ID '{dataset_id}'.")
    entry = entries[0]
    request = Request(f"{DOWNLOAD_URL}?{urlencode({'id': entry['id']})}", headers={"Authorization": f"Bearer {token}", "User-Agent": "NEER-MVP/0.1"})
    output_dir.mkdir(parents=True, exist_ok=True)
    filename = Path(entry.get("identifier") or f"{label}_{entry['id']}").name
    destination = output_dir / filename
    with urlopen(request, timeout=90) as response, destination.open("wb") as file:  # nosec B310 - official MOSDAC endpoint only
        while chunk := response.read(1024 * 1024):
            file.write(chunk)
    return destination


def main() -> None:
    load_env()
    required = ["MOSDAC_USERNAME", "MOSDAC_PASSWORD", "MOSDAC_SST_DATASET_ID", "MOSDAC_CHLOROPHYLL_DATASET_ID"]
    missing = [key for key in required if not os.getenv(key)]
    if missing:
        print("MOSDAC is not configured yet. Add these to .env:")
        print(", ".join(missing))
        return
    try:
        token_response = _request_json(TOKEN_URL, payload={"username": os.environ["MOSDAC_USERNAME"], "password": os.environ["MOSDAC_PASSWORD"]})
        token = token_response.get("access_token")
        if not token:
            raise ValueError("MOSDAC did not return an access token.")
        output_dir = Path(os.getenv("MOSDAC_DOWNLOAD_DIR", "mosdac_data"))
        for label, dataset_id in (("sst", os.environ["MOSDAC_SST_DATASET_ID"]), ("chlorophyll", os.environ["MOSDAC_CHLOROPHYLL_DATASET_ID"])):
            print(f"Downloading latest {label} granule...")
            print(f"Saved: {_download_product(label, dataset_id, token, output_dir)}")
    except (HTTPError, URLError, TimeoutError, ValueError, OSError, json.JSONDecodeError) as exc:
        print(f"MOSDAC download failed: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
