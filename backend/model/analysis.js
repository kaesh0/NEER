// The only layer that touches the data source (mirrors how a Mongoose model
// is the only place that talks to the database — no repository in between).
//
// The primary data source is the live Python marine-intelligence
// service (NEER-main/api.py) over HTTP. The frozen mock JSON files on disk are
// still present and become the safety-net fallback when the Python service is
// unreachable, the same live/cached/fallback discipline used everywhere else in
// the project. Nothing outside this file should need to change when the Python
// service is swapped for a real INCOIS/IMD/Open-Meteo-backed backend later.

const fs = require("fs/promises");
const path = require("path");

// Primary data source base URL. Reads AI_SERVICE_URL dynamically from the
// environment so tests can point to mock/unreachable ports at runtime.
function getAiServiceUrl() {
  return (process.env.AI_SERVICE_URL || "http://localhost:8000").replace(/\/+$/, "");
}

// Persona → mock file on disk. Only implemented personas are mapped here;
// maritime_operator is a planned persona handled at the controller level.
const PERSONA_MOCKS = {
  fisherman: "fisherman_kochi.json",
  authority: "authority_ernakulam.json",
  maritime_operator: "maritime_kochi_lakshadweep.json",
};

const MOCKS_DIR = path.join(__dirname, "..", "mocks");

// Default text queries the Node backend sends to the Python service for each
// persona. These guarantee a hardcoded default location (Kochi, Kerala: 9.9312, 76.2673)
// so the analysis endpoint reliably works without any user-supplied location.
const DEFAULT_PYTHON_QUERIES = {
  fisherman: "Is it safe to fish near Kochi, Kerala tomorrow morning?",
  authority: "Which coastal areas near Kochi, Kerala need attention this week?",
  maritime_operator: "Maritime transit and fairway navigability assessment near Kochi, Kerala",
};

// Error object the HTTP helper throws when the Python service cannot be reached.
// Callers decide how to respond (currently: degrade to the mock-file fallback).
const AI_SERVICE_UNAVAILABLE = {
  code: "AI_SERVICE_UNAVAILABLE",
  message: "The Python marine-intelligence service is not reachable.",
};

/**
 * POST a JSON body to the Python service with a 25-second timeout.
 *
 * On success returns the parsed JSON response body. On any failure (connection
 * refused, timeout, non-200 status, body that isn't valid JSON) throws an
 * `{ code: "AI_SERVICE_UNAVAILABLE", message: ... }` object so callers can
 * degrade gracefully instead of crashing.
 */
async function queryPythonService(urlPath, body, timeoutMs = 25000) {
  const url = `${getAiServiceUrl()}${urlPath}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw AI_SERVICE_UNAVAILABLE;
    }
    let bodyText = "";
    try {
      bodyText = await response.text();
    } catch (readErr) {
      throw AI_SERVICE_UNAVAILABLE;
    }
    if (!bodyText || !bodyText.trim()) {
      throw AI_SERVICE_UNAVAILABLE;
    }
    return JSON.parse(bodyText);
  } catch (err) {
    if (err && err.code === "AI_SERVICE_UNAVAILABLE") {
      throw err;
    }
    console.error(`[queryPythonService error] ${err?.message || err}:`, err?.cause || err);
    // Network errors,AbortError (timeout), DNS, etc. — all degrade to fallback.
    throw AI_SERVICE_UNAVAILABLE;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Read a mock file from disk and return its parsed contents.
 * Used as the safety-net fallback when the Python service is unreachable.
 */
async function readMockFile(fileName) {
  const raw = await fs.readFile(path.join(MOCKS_DIR, fileName), "utf8");
  return JSON.parse(raw);
}

/**
 * Primary path: ask the live Python service for the persona's analysis.
 *
 * Returns the Python service's response (`{ session_id, final_output }`) with
 * a `servedFrom` flag so the team can tell it came from the live service. The
 * `final_output` field IS the ORCA envelope, so this is a drop-in replacement
 * for the old mock-file reader used by GET /api/analysis.
 *
 * Fallback path: when the Python service is unreachable, read the matching mock
 * file from disk and return it with `servedFrom: "fallback_mock"`. The endpoint
 * never fails — it degrades to the cached mock.
 */
async function getAnalysisByPersona(persona, locationParams = {}) {
  const { lat, lng, location } = locationParams || {};
  let text = DEFAULT_PYTHON_QUERIES[persona];

  // If a coastal port/harbour name is provided, prioritize it so the Python NLP
  // and geocoder resolve the administrative state (e.g. Maharashtra, Tamil Nadu, Andhra Pradesh),
  // enabling live INCOIS PFZ sector lookup and human-friendly narratives.
  const isRawCoordLabel = location && /^\s*\d+(\.\d+)?°?\s*[NS]?\s*,\s*\d+(\.\d+)?°?\s*[EW]?/i.test(location);

  if (lat && lng) {
    const latNum = parseFloat(lat).toFixed(4);
    const lngNum = parseFloat(lng).toFixed(4);
    const placeDesc = (location && !isRawCoordLabel) ? `${location} (${latNum}, ${lngNum})` : `${latNum}, ${lngNum}`;
    if (persona === "fisherman") {
      text = `Is it safe to fish near ${placeDesc} tomorrow morning?`;
    } else if (persona === "authority") {
      text = `Regional coastal assessment for ${placeDesc}`;
    } else {
      text = `Maritime transit and fairway navigability assessment for ${placeDesc}`;
    }
  } else if (location && !isRawCoordLabel) {
    if (persona === "fisherman") {
      text = `Is it safe to fish near ${location} tomorrow morning?`;
    } else if (persona === "authority") {
      text = `Which coastal areas near ${location} need attention this week?`;
    } else {
      text = `Maritime transit and fairway navigability assessment near ${location}`;
    }
  }

  if (!text) {
    // Should not happen for implemented personas, but guard anyway.
    throw AI_SERVICE_UNAVAILABLE;
  }

  try {
    const pythonResponse = await queryPythonService("/api/query", {
      text,
      session_id: undefined,
    });
    const finalEnvelope = pythonResponse.final_output || pythonResponse;
    return {
      ...finalEnvelope,
      session_id: pythonResponse.session_id,
      servedFrom: "ai_service",
    };
  } catch (err) {
    if (err && err.code === "AI_SERVICE_UNAVAILABLE") {
      const mockFile = PERSONA_MOCKS[persona];
      if (!mockFile) {
        throw AI_SERVICE_UNAVAILABLE;
      }
      const mockBody = await readMockFile(mockFile);
      if (lat && lng) {
        const parsedLat = parseFloat(lat);
        const parsedLng = parseFloat(lng);
        if (mockBody.request?.geometry) {
          mockBody.request.geometry.coordinates = [parsedLng, parsedLat];
          mockBody.request.geometry.label = location || `${parsedLat.toFixed(4)}° N, ${parsedLng.toFixed(4)}° E`;
        }
        if (mockBody.context?.location) {
          mockBody.context.location.latitude = parsedLat;
          mockBody.context.location.longitude = parsedLng;
          mockBody.context.location.name = location || `${parsedLat.toFixed(2)}°N, ${parsedLng.toFixed(2)}°E`;
        }
        if (mockBody.request?.target_location) {
          mockBody.request.target_location.latitude = parsedLat;
          mockBody.request.target_location.longitude = parsedLng;
        }
      }
      if (!mockBody.provenance) {
        mockBody.provenance = {};
      }
      mockBody.provenance.status = "fallback";
      mockBody.provenance.overallStatus = "fallback";
      mockBody.provenance.summary = "Showing example data — live service temporarily unavailable, please try again shortly.";
      if (!mockBody.provenance.availability) {
        mockBody.provenance.availability = {};
      }
      mockBody.provenance.availability.weather = "fallback";
      mockBody.provenance.availability.pfz = "fallback";
      mockBody.provenance.availability.hazards = "fallback";

      return {
        ...mockBody,
        servedFrom: "fallback_mock",
      };
    }
    throw err;
  }
}

module.exports = { getAnalysisByPersona, queryPythonService, AI_SERVICE_UNAVAILABLE, PERSONA_MOCKS, readMockFile };
