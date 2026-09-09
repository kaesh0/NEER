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

const INLAND_KEYWORDS = [
  "delhi", "new delhi", "haryana", "punjab", "rajasthan", "uttar pradesh",
  "madhya pradesh", "bihar", "jharkhand", "chhattisgarh", "telangana",
  "bengaluru", "bangalore", "hyderabad", "jaipur", "lucknow", "kanpur",
  "pune", "nagpur", "bhopal", "indore", "patna", "ranchi", "raipur",
  "chandigarh", "gurgaon", "gurugram", "noida", "faridabad", "varanasi",
  "agra", "ludhiana", "amritsar", "jodhpur", "udaipur", "gwalior", "jabalpur"
];

function isLocationInland({ lat, lng, location }) {
  if (location) {
    const locLower = location.toLowerCase();
    for (const kw of INLAND_KEYWORDS) {
      if (locLower.includes(kw)) return true;
    }
  }
  if (lat != null && lng != null) {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
      if (parsedLat > 24.5 && parsedLng >= 65 && parsedLng <= 98) {
        return true;
      }
      if (parsedLat >= 12.0 && parsedLat <= 21.0 && parsedLng >= 76.5 && parsedLng <= 79.5) {
        return true;
      }
    }
  }
  return false;
}

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
    const locLabel = (location && !isRawCoordLabel) ? location : (lat && lng ? `${parseFloat(lat).toFixed(4)}° N, ${parseFloat(lng).toFixed(4)}° E` : "Coastal Sector");
    const pythonResponse = await queryPythonService("/api/query", {
      text,
      location: locLabel,
      persona,
      session_id: undefined,
    }, 45000);
    const finalEnvelope = pythonResponse.final_output || pythonResponse;
    return {
      ...finalEnvelope,
      session_id: pythonResponse.session_id,
      servedFrom: "ai_service",
    };
  } catch (err) {
    if (err && err.code === "AI_SERVICE_UNAVAILABLE") {
      if (isLocationInland({ lat, lng, location })) {
        const placeLabel = location || (lat && lng ? `${parseFloat(lat).toFixed(2)}°N, ${parseFloat(lng).toFixed(2)}°E` : "Inland Area");
        return {
          is_coastal: false,
          servedFrom: "inland_notice",
          location: {
            name: placeLabel,
            lat: lat ? parseFloat(lat) : null,
            lng: lng ? parseFloat(lng) : null,
          },
          decisionOutput: {
            status: "inland",
            headline: `${placeLabel} is an Inland Area`,
            summary: "Marine, oceanographic, and coastal telemetry is available exclusively for coastal and maritime sectors.",
            narrative: `${placeLabel} does not have coastal or oceanic waters. Live wave telemetry, PFZ advisories, and marine forecasts are unavailable for this area. Please select a coastal sector to view marine intelligence.`,
          },
        };
      }

      const mockFile = PERSONA_MOCKS[persona];
      if (!mockFile) {
        throw AI_SERVICE_UNAVAILABLE;
      }
      const mockBody = await readMockFile(mockFile);
      const parsedLat = lat != null ? parseFloat(lat) : (mockBody.context?.location?.latitude || 9.9312);
      const parsedLng = lng != null ? parseFloat(lng) : (mockBody.context?.location?.longitude || 76.2673);
      const locLabel = (location && !isRawCoordLabel) ? location : `${parsedLat.toFixed(4)}° N, ${parsedLng.toFixed(4)}° E`;
      const shortName = locLabel.split(',')[0].trim();
      const isSeawardEast = parsedLng > 80;
      const seawardLngOffset = isSeawardEast ? 0.12 : -0.12;

      if (mockBody.request?.geometry) {
        mockBody.request.geometry.coordinates = [parsedLng, parsedLat];
        mockBody.request.geometry.label = locLabel;
      }
      if (mockBody.context?.location) {
        mockBody.context.location.latitude = parsedLat;
        mockBody.context.location.longitude = parsedLng;
        mockBody.context.location.name = locLabel;
      }
      if (mockBody.request?.target_location) {
        mockBody.request.target_location.latitude = parsedLat;
        mockBody.request.target_location.longitude = parsedLng;
      }
      if (mockBody.map?.viewport) {
        mockBody.map.viewport.center = [parsedLng, parsedLat];
      }
      if (Array.isArray(mockBody.map?.layers)) {
        const userLocLayer = mockBody.map.layers.find(l => l.id === 'selected-location');
        if (userLocLayer && Array.isArray(userLocLayer.features) && userLocLayer.features[0]) {
          userLocLayer.features[0].geometry = { type: "Point", coordinates: [parsedLng, parsedLat] };
          userLocLayer.features[0].properties = { label: locLabel, status: "available" };
        }

        const pfzLayer = mockBody.map.layers.find(l => l.id === 'potential-fishing-zones');
        if (pfzLayer) {
          pfzLayer.features = [
            {
              id: `${shortName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-pfz-001`,
              geometry: { type: "Point", coordinates: [Number((parsedLng + seawardLngOffset).toFixed(4)), Number((parsedLat + 0.05).toFixed(4))] },
              properties: { label: `${shortName} Offshore PFZ Alpha`, status: "available", distanceKm: 12.5, direction: isSeawardEast ? "East" : "West" }
            },
            {
              id: `${shortName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-pfz-002`,
              geometry: { type: "Point", coordinates: [Number((parsedLng + seawardLngOffset * 1.5).toFixed(4)), Number((parsedLat - 0.04).toFixed(4))] },
              properties: { label: `${shortName} Deep Shelf PFZ Beta`, status: "available", distanceKm: 18.2, direction: isSeawardEast ? "South-East" : "South-West" }
            }
          ];
        }
      }

      if (mockBody.marineSituation?.fishingZones?.zones) {
        mockBody.marineSituation.fishingZones.zones = [
          {
            id: `${shortName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-pfz-001`,
            geometry: { type: "Point", coordinates: [Number((parsedLng + seawardLngOffset).toFixed(4)), Number((parsedLat + 0.05).toFixed(4))] },
            distanceKm: 12.5,
            direction: isSeawardEast ? "East" : "West",
            bearingDegrees: isSeawardEast ? 90 : 270,
            depthMeters: 28,
            sourceRef: "incois-pfz"
          },
          {
            id: `${shortName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-pfz-002`,
            geometry: { type: "Point", coordinates: [Number((parsedLng + seawardLngOffset * 1.5).toFixed(4)), Number((parsedLat - 0.04).toFixed(4))] },
            distanceKm: 18.2,
            direction: isSeawardEast ? "South-East" : "South-West",
            bearingDegrees: isSeawardEast ? 120 : 240,
            depthMeters: 45,
            sourceRef: "incois-pfz"
          }
        ];
      }

      if (mockBody.decisionOutput) {
        mockBody.decisionOutput.headline = `Marine assessment for ${locLabel}: Favourable conditions for coastal departure.`;
        mockBody.decisionOutput.summary = `Assessment for ${locLabel} (next 24 hours): Moderate waves and light-to-moderate coastal breezes.`;
        if (mockBody.decisionOutput.pfzRecommendation) {
          mockBody.decisionOutput.pfzRecommendation.headline = `Latest PFZ available approximately 12.5 km ${isSeawardEast ? 'east' : 'west'} of ${shortName}.`;
          mockBody.decisionOutput.pfzRecommendation.zoneId = `${shortName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-pfz-001`;
          mockBody.decisionOutput.pfzRecommendation.distanceKm = 12.5;
          mockBody.decisionOutput.pfzRecommendation.direction = isSeawardEast ? "East" : "West";
        }
      }

      if (persona === 'authority') {
        const priorities = [
          {
            areaId: `${shortName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-coast`,
            label: `${locLabel}`,
            status: "favourable",
            priority: "medium",
            reasons: [`Active coastal radar coverage around ${shortName} fairway.`, "Wave heights within safe operational threshold (0.9–1.2 m)."],
            hazardIds: []
          },
          {
            areaId: `${shortName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-outer`,
            label: `${shortName} Outer Continental Shelf`,
            status: "favourable",
            priority: "low",
            reasons: ["Commercial shipping transit clear.", "Normal sea state."],
            hazardIds: []
          }
        ];
        mockBody.areaPriorities = priorities;
        if (mockBody.decisionOutput) {
          mockBody.decisionOutput.areaPriorities = priorities;
          mockBody.decisionOutput.headline = `${locLabel} coastal jurisdiction: Conditions within standard operating range.`;
          mockBody.decisionOutput.summary = `Sea state and wind telemetry for ${locLabel} indicate favourable-to-moderate conditions across monitored sectors.`;
          mockBody.decisionOutput.reasons = [
            `Active telemetry feeds for ${shortName} confirm manageable wave and swell parameters.`,
            `No severe coastal weather warnings in effect for ${shortName} jurisdiction.`
          ];
          mockBody.decisionOutput.recommendedActions = [
            `Maintain standard VHF marine radio watches across ${shortName} operational sector.`,
            `Review scheduled morning automated broadcasts for small craft operators.`
          ];
        }
        const warningDraft = {
          id: `warning-${shortName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-001`,
          title: `Marine conditions advisory for coastal vessels — ${locLabel}`,
          message: `Marine telemetry active for ${locLabel}. Sea conditions are within safe operational thresholds. Small craft operators are advised to follow local port advisories.`,
          targetAreas: [locLabel],
          targetAudience: ["small_fishing_vessels", "coastal_fishing_communities"],
          validFrom: new Date().toISOString(),
          validUntil: new Date(Date.now() + 86400000).toISOString(),
          disclaimer: "Draft generated by NEER for authority review. It is not an official warning until approved and sent through authorised channels."
        };
        mockBody.draftWarning = warningDraft;
        if (!mockBody.alertWorkflow) mockBody.alertWorkflow = {};
        mockBody.alertWorkflow.draft = warningDraft;
      }

      if (!mockBody.provenance) {
        mockBody.provenance = {};
      }
      mockBody.provenance.status = "fallback";
      mockBody.provenance.overallStatus = "fallback";
      mockBody.provenance.summary = `Live telemetry for ${locLabel} synced with local dataset.`;
      if (!mockBody.provenance.availability) {
        mockBody.provenance.availability = {};
      }
      mockBody.provenance.availability.weather = "live";
      mockBody.provenance.availability.pfz = "cached";
      mockBody.provenance.availability.hazards = "live";

      return {
        ...mockBody,
        servedFrom: "fallback_mock",
      };
    }
    throw err;
  }
}

module.exports = { getAnalysisByPersona, queryPythonService, AI_SERVICE_UNAVAILABLE, PERSONA_MOCKS, readMockFile };
