/**
 * NEER Authority Data Layer — Pure Transform Functions
 *
 * Each function takes the API response envelope as a parameter and returns
 * the same shaped data the old module-level constants provided.
 * UI components call these with the live data from useMarineAnalysis().
 */
import rawJson from './authority_ernakulam.json' with { type: 'json' }

// ── Base Context ──────────────────────────────────────────────────────────
export function getRequest(env) {
  return env?.request || {}
}

export function getContext(env) {
  return env?.marineSituation?.context || {}
}

export function getTimeWindow(env) {
  return env?.marineSituation?.context?.timeWindow || env?.request?.timeWindow || {}
}

// ── Spatial & Conditions ──────────────────────────────────────────────────
export function getConditions(env) {
  return env?.marineSituation?.conditions || {}
}

export function getMapData(env) {
  return env?.map || {}
}

export function getHazards(env) {
  return env?.marineSituation?.hazards || []
}

export function getFishingZones(env) {
  return env?.marineSituation?.fishingZones || {}
}

export function getSpatialAnalysis(env) {
  return env?.marineSituation?.spatialAnalysis || {}
}

export function getRegions(env) {
  return env?.marineSituation?.spatialAnalysis?.regions || []
}

// ── Decision Output ───────────────────────────────────────────────────────
export function getDecision(env) {
  return env?.decisionOutput || {}
}

export function getAreaPriorities(env) {
  return env?.decisionOutput?.areaPriorities || []
}

// ── Other Modules ─────────────────────────────────────────────────────────
export function getProvenance(env) {
  return env?.provenance || {}
}

export function getExplainability(env) {
  return env?.explainability || {}
}

export function getAlertWorkflow(env) {
  return env?.alertWorkflow || {}
}

export function getDraftWarning(env) {
  return env?.alertWorkflow?.draft || {}
}

// ── Helper formatting functions (no data dependency — kept as-is) ─────────
export const formatDate = (isoString) => {
  if (!isoString) return ''
  const date = new Date(isoString)
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date)
}

export const formatTime = (isoString) => {
  if (!isoString) return ''
  const date = new Date(isoString)
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date)
}

export const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'favourable': return 'text-neer-favourable'
    case 'caution': return 'text-neer-caution'
    case 'unfavourable': return 'text-neer-unfavourable'
    default: return 'text-neer-ink-muted'
  }
}

export const getStatusBg = (status) => {
  switch (status?.toLowerCase()) {
    case 'favourable': return 'bg-neer-favourable/15 border-neer-favourable'
    case 'caution': return 'bg-neer-caution/15 border-neer-caution'
    case 'unfavourable': return 'bg-neer-unfavourable/15 border-neer-unfavourable'
    default: return 'bg-neer-surface-alt border-neer-border'
  }
}

// ── Backwards compatibility constants (evaluated from mock json) ─────────
export { rawJson }
export const request = getRequest(rawJson)
export const context = getContext(rawJson)
export const timeWindow = getTimeWindow(rawJson)
export const conditions = getConditions(rawJson)
export const mapData = getMapData(rawJson)
export const hazards = getHazards(rawJson)
export const fishingZones = getFishingZones(rawJson)
export const spatialAnalysis = getSpatialAnalysis(rawJson)
export const regions = getRegions(rawJson)
export const decision = getDecision(rawJson)
export const areaPriorities = getAreaPriorities(rawJson)
export const provenance = getProvenance(rawJson)
export const explainability = getExplainability(rawJson)
export const alertWorkflow = getAlertWorkflow(rawJson)
export const draftWarning = getDraftWarning(rawJson)

