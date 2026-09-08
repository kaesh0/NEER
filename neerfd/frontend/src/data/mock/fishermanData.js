/**
 * NEER Fisherman Data Layer — Pure Transform Functions
 *
 * Each function takes the API response envelope as a parameter and returns
 * the same shaped data the old module-level constants provided.
 * UI components call these with the live data from useMarineAnalysis().
 */
import fishermanJson from './fisherman_kochi.json' with { type: 'json' }

const resolveEnv = (env) => (env && env.request ? env : fishermanJson)

// ── Location ──────────────────────────────────────────────────────────────
export function getLocation(env) {
  const g = resolveEnv(env)?.request?.geometry
  return {
    name: g?.label || 'Unknown',
    lat: g?.coordinates?.[1] ?? 0,
    lng: g?.coordinates?.[0] ?? 0,
    source: g?.source || 'unknown',
  }
}

// ── Time Window ───────────────────────────────────────────────────────────
export function getTimeWindow(env) {
  const tw = resolveEnv(env)?.request?.timeWindow
  return {
    label: tw?.label || '',
    start: tw?.start || '',
    end: tw?.end || '',
    timezone: tw?.timezone || 'Asia/Kolkata',
  }
}

// ── Vessel Context ────────────────────────────────────────────────────────
export function getVessel(env) {
  const vc = resolveEnv(env)?.request?.vesselContext
  const type = vc?.type || 'unknown'
  return {
    type,
    label: type === 'small_fishing_boat' ? 'Small fishing boat' : type,
  }
}

// ── Marine Conditions ─────────────────────────────────────────────────────
function cond(val, unit, fallback = 'Unavailable') {
  if (!val || val.value == null || val.status === 'unavailable') {
    return { value: null, display: fallback, status: 'unavailable' }
  }
  return { value: val.value, display: `${val.value} ${unit}`, status: val.status }
}

export function getConditions(env) {
  const c = resolveEnv(env)?.marineSituation?.conditions || {}
  return {
    waveHeight: cond(c.waveHeight, 'm'),
    wavePeriod: cond(c.wavePeriod, 's'),
    windSpeed: cond(c.windSpeed, 'km/h'),
    windDirection: cond(c.windDirection, '°'),
    swellHeight: cond(c.swellHeight, 'm'),
    swellPeriod: cond(c.swellPeriod, 's'),
    currentSpeed: cond(c.currentSpeed, 'km/h'),
    currentDirection: cond(c.currentDirection, '°'),
    seaSurfaceTemperature: cond(c.seaSurfaceTemperature, '°C'),
  }
}

// ── Fishing Zones (PFZ) ──────────────────────────────────────────────────
export function getFishingZones(env) {
  const zones = resolveEnv(env)?.marineSituation?.fishingZones?.zones || []
  return zones.map((z) => ({
    id: z.id,
    name: z.id.toUpperCase().replace(/-/g, ' '),
    distance: z.distanceKm,
    direction: z.direction,
    bearing: z.bearingDegrees,
    status: 'favourable',
    source: z.sourceRef,
    lat: z.geometry?.coordinates?.[1] ?? 0,
    lng: z.geometry?.coordinates?.[0] ?? 0,
  }))
}

export function getFishingZoneMeta(env) {
  const fz = resolveEnv(env)?.marineSituation?.fishingZones || {}
  return {
    status: fz.status || 'unavailable',
    advisoryDate: fz.advisoryDate || '',
    validFrom: fz.validFrom || '',
    validUntil: fz.validUntil || '',
    source: fz.sourceRef || '',
  }
}

// ── Hazards ───────────────────────────────────────────────────────────────
export function getHazards(env) {
  const hazards = resolveEnv(env)?.marineSituation?.hazards || []
  return hazards.map((h) => ({
    id: h.id,
    type: h.type,
    severity: h.severity,
    title: h.title,
    message: h.message,
    validFrom: h.validFrom,
    validUntil: h.validUntil,
    source: h.sourceRef,
  }))
}

// ── Decision Output ───────────────────────────────────────────────────────
export function getDecision(env) {
  const d = resolveEnv(env)?.decisionOutput || {}
  return {
    status: d.status || 'unavailable',
    headline: d.headline || '',
    summary: d.summary || '',
    reasons: d.reasons || [],
    recommendedActions: d.recommendedActions || [],
    caveats: d.caveats || [],
  }
}

// ── PFZ Recommendation ────────────────────────────────────────────────────
export function getPfzRecommendation(env) {
  const pfz = resolveEnv(env)?.decisionOutput?.pfzRecommendation
  if (!pfz) return null
  return {
    status: pfz.status,
    headline: pfz.headline,
    zoneId: pfz.zoneId,
    distance: pfz.distanceKm,
    direction: pfz.direction,
    validUntil: pfz.validUntil,
  }
}

// ── Map Data ──────────────────────────────────────────────────────────────
export function getMapData(env) {
  const m = resolveEnv(env)?.map || {}
  const vp = m.viewport || {}
  return {
    status: m.status || 'unavailable',
    center: vp.center || [76.2673, 9.9312],
    zoom: vp.zoom || 10,
    layers: m.layers || [],
    legend: m.legend || [],
  }
}

// ── Data Availability / Provenance ────────────────────────────────────────
export function getDataAvailability(env) {
  const da = resolveEnv(env)?.marineSituation?.dataAvailability || {}
  return {
    overall: da.overallStatus || 'unavailable',
    weather: da.weather || 'unavailable',
    pfz: da.pfz || 'unavailable',
    hazards: da.hazards || 'unavailable',
    currents: da.currents || 'unavailable',
    sst: da.sst || 'unavailable',
  }
}

export function getProvenance(env) {
  const res = resolveEnv(env)
  const p = res?.provenance || {}
  const sr = res?.marineSituation?.sourceReferences || []
  return {
    summary: p.summary || '',
    availability: p.availability || {},
    sources: p.sources || [],
    sourceDetails: sr,
  }
}

// ── Explainability ────────────────────────────────────────────────────────
export function getExplainability(env) {
  const e = resolveEnv(env)?.explainability || {}
  return {
    summary: e.summary || '',
    steps: e.analysisSteps || [],
    findings: e.findings || [],
    limitations: e.limitations || [],
  }
}

// ── Meta ──────────────────────────────────────────────────────────────────
export function getMeta(env) {
  const m = resolveEnv(env)?.meta || {}
  return {
    generatedAt: m.generatedAt || '',
    responseId: m.responseId || '',
    language: m.language || {},
  }
}

// ── Tide Schedule (Frontend-only: not from backend) ───────────────────────
// Derived from time window. Keep as function for consistency.
export function getTideSchedule(env) {
  const tw = getTimeWindow(env)
  const twStart = tw.start ? new Date(tw.start) : new Date()
  return {
    high: {
      time: new Date(twStart.getTime() + 2.5 * 3600000).toISOString(),
      label: 'Next High Tide',
      trend: 'Rising',
    },
    low: {
      time: new Date(twStart.getTime() + 5.75 * 3600000).toISOString(),
      label: 'Next Low Tide',
      trend: 'Falling',
    },
  }
}

// ── Recommended Actions (Frontend-only: hardcoded guidance) ──────────────
export const recommendedActionsMain = [
  'Best time to fish: next 4-6 hours',
  'Check latest official advisory before departure',
  'Carry safety equipment',
  'Consider returning if winds increase',
]

// ── Helper: Wind direction degrees to compass label ───────────────────────
export function degreesToCompass(deg) {
  if (deg == null) return '—'
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  return dirs[Math.round(deg / 22.5) % 16]
}

// ── Helper: Direction to compass short ──────────────────────────────────────
export function directionToCompass(dir) {
  if (!dir) return '—'
  const map = {
    'N': 'N', 'North': 'N', 'NNE': 'NE', 'NE': 'NE', 'ENE': 'NE',
    'E': 'E', 'East': 'E', 'ESE': 'SE', 'SE': 'SE', 'SSE': 'SE',
    'S': 'S', 'South': 'S', 'SSW': 'SW', 'SW': 'SW', 'WSW': 'SW',
    'W': 'W', 'West': 'W', 'WNW': 'NW', 'NW': 'NW', 'NNW': 'NE',
    'North-West': 'NW', 'North-East': 'NE', 'South-West': 'SW', 'South-East': 'SE',
    'South-west': 'SW', 'South-east': 'SE', 'North-west': 'NW', 'North-east': 'NE',
  }
  return map[dir] || dir.slice(0, 2).toUpperCase()
}

// ── Helper: Format ISO date for display ───────────────────────────────────
export function formatTime(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  } catch {
    return iso
  }
}

export function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
  } catch {
    return iso
  }
}

// ── Backwards compatibility constants (evaluated from mock json) ─────────
export const rawJson = fishermanJson
export const location = getLocation(fishermanJson)
export const timeWindow = getTimeWindow(fishermanJson)
export const vessel = getVessel(fishermanJson)
export const conditions = getConditions(fishermanJson)
export const fishingZones = getFishingZones(fishermanJson)
export const fishingZoneMeta = getFishingZoneMeta(fishermanJson)
export const hazards = getHazards(fishermanJson)
export const decision = getDecision(fishermanJson)
export const pfzRecommendation = getPfzRecommendation(fishermanJson)
export const mapData = getMapData(fishermanJson)
export const dataAvailability = getDataAvailability(fishermanJson)
export const provenance = getProvenance(fishermanJson)
export const explainability = getExplainability(fishermanJson)
export const meta = getMeta(fishermanJson)
export const tideSchedule = getTideSchedule(fishermanJson)

