/**
 * NEER Marine / Maritime Operator Data Layer
 *
 * Reads from the actual marine JSON structure.
 * All UI components consume this layer — never the raw JSON directly.
 */
import marineJson from './maritime_kochi_lakshadweep.json'

export const rawJson = marineJson

// ── Context ──────────────────────────────────────────────────────────────
export const context = {
  routeId: marineJson.marineSituation.spatialAnalysis.route.id,
  origin: marineJson.marineSituation.spatialAnalysis.route.origin,
  destination: marineJson.marineSituation.spatialAnalysis.route.destination,
  timeWindow: marineJson.marineSituation.context.timeWindow,
  vesselContext: marineJson.marineSituation.context.vesselContext,
}

// ── Overall Marine Conditions ─────────────────────────────────────────────
const c = marineJson.marineSituation.conditions

function cond(val, unit, fallback = 'Unavailable') {
  if (!val || val.value == null || val.status === 'unavailable') return { value: null, display: fallback, status: 'unavailable' }
  return { value: val.value, display: `${val.value} ${unit}`, status: val.status }
}

export const overallConditions = {
  waveHeight: cond(c.waveHeight, 'm'),
  windSpeed: cond(c.windSpeed, 'km/h'),
}

// ── Route & Segments ──────────────────────────────────────────────────────
export const route = marineJson.marineSituation.spatialAnalysis.route
export const segments = marineJson.marineSituation.spatialAnalysis.segments.map(s => {
  const assessment = marineJson.decisionOutput.segmentAssessments.find(a => a.segmentId === s.id)
  return {
    id: s.id,
    estimatedEntryTime: s.estimatedEntryTime,
    estimatedExitTime: s.estimatedExitTime,
    conditions: {
      waveHeight: cond(s.conditions.waveHeight, 'm'),
      windSpeed: cond(s.conditions.windSpeed, 'km/h'),
    },
    hazardIds: s.hazardIds,
    status: assessment?.status || 'unknown',
    reasons: assessment?.reasons || [],
  }
})

// ── Hazards ───────────────────────────────────────────────────────────────
export const hazards = marineJson.marineSituation.hazards.map((h) => ({
  id: h.id,
  type: h.type,
  severity: h.severity,
  title: h.title,
  message: h.message,
  validFrom: h.validFrom,
  validUntil: h.validUntil,
  source: h.sourceRef,
}))

// ── Decision Output ───────────────────────────────────────────────────────
const d = marineJson.decisionOutput

export const decision = {
  status: d.status,
  headline: d.headline,
  summary: d.summary,
  reasons: d.reasons,
  recommendedActions: d.recommendedActions,
  caveats: d.caveats,
}

export const routeRecommendation = {
  routeId: d.routeRecommendation.routeId,
  recommendedDepartureTime: d.routeRecommendation.recommendedDepartureTime,
  recommendation: d.routeRecommendation.recommendation,
  routeStatus: d.routeRecommendation.routeStatus,
}

// ── Map Data ──────────────────────────────────────────────────────────────
export const mapData = {
  status: marineJson.map.status,
  center: marineJson.map.viewport.center,
  zoom: marineJson.map.viewport.zoom,
  layers: marineJson.map.layers,
  legend: marineJson.map.legend,
}

// ── Data Availability / Provenance ────────────────────────────────────────
export const dataAvailability = {
  overall: marineJson.marineSituation.dataAvailability.overallStatus,
  weather: marineJson.marineSituation.dataAvailability.weather,
  pfz: marineJson.marineSituation.dataAvailability.pfz,
  hazards: marineJson.marineSituation.dataAvailability.hazards,
  currents: marineJson.marineSituation.dataAvailability.currents,
  sst: marineJson.marineSituation.dataAvailability.sst,
}

export const provenance = {
  summary: marineJson.provenance.summary,
  availability: marineJson.provenance.availability,
  sources: marineJson.provenance.sources,
  sourceDetails: marineJson.marineSituation.sourceReferences,
}

// ── Explainability ────────────────────────────────────────────────────────
export const explainability = {
  summary: marineJson.explainability.summary,
  steps: marineJson.explainability.analysisSteps,
  findings: marineJson.explainability.findings,
  limitations: marineJson.explainability.limitations,
}

// ── Helper: Format ISO date for display ───────────────────────────────────
export function formatTime(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
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
