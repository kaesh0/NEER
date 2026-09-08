## Copyright & Intellectual Property

© 2026 NEER Project. All Rights Reserved.

This repository and all of its contents, including but not limited to source code, documentation, designs, assets, and other materials, are the intellectual property of NEER.

No license is granted to copy, modify, distribute, sublicense, publish, sell, or commercially use any part of this repository without prior written permission from the copyright holder.

The repository may be publicly viewed on GitHub, but public availability does not grant permission to reuse or redistribute its contents.

For permission or licensing inquiries, please contact: aryanvr961@gmail.com  
Issue Tracker: https://github.com/kaesh0/NEER/issues

---

## Running the API service

The API service lives in `api.py` and is started with uvicorn:

```bash
.venv/bin/python -m uvicorn api:app --host 127.0.0.1 --port 8000
```

Or equivalently:

```bash
.venv/bin/uvicorn api:app --host 127.0.0.1 --port 8000
```

**Always use `.venv/bin/python` or `.venv/bin/uvicorn` — never the system `python3.11` directly.** Running with the wrong interpreter (e.g. `python3.11 -m uvicorn api:app ...`) fails **silently at import time** with no useful error printed: `api.py` imports `fastapi`, `pydantic`, and other packages that are only installed inside `.venv/`, so the wrong interpreter simply cannot import the app and uvicorn exits immediately. Because the failure happens before uvicorn ever reaches its "running" line, there is no crash message to read — the process just disappears. If a launch appears to do nothing and the port never binds, check that you are using `.venv/bin/python` (or `.venv/bin/uvicorn`) and that the venv was created and the dependencies installed.

For a shortcut that hardcodes the correct interpreter, use `run_api.sh`.
