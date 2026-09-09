/**
 * NEER Authority Data Layer — Pure Transform Functions
 *
 * Each function takes the API response envelope as a parameter and returns
 * the same shaped data the old module-level constants provided.
 * UI components call these with the live data from useMarineAnalysis().
 */
import rawJson from './authority_ernakulam.json' with { type: 'json' }

const resolveEnv = (env) => {
  if (!env) return rawJson
  if (env.is_coastal === false) return env
  return env.request ? env : rawJson
}

// ── Base Context ──────────────────────────────────────────────────────────
export function getRequest(env) {
  if (env?.is_coastal === false) {
    return {
      geometry: {
        label: env?.location?.name || env?.request?.geometry?.label || 'Inland Area',
      },
    }
  }
  return resolveEnv(env)?.request || {}
}

export function getContext(env) {
  return resolveEnv(env)?.marineSituation?.context || {}
}

export function getTimeWindow(env) {
  const r = resolveEnv(env)
  return r?.marineSituation?.context?.timeWindow || r?.request?.timeWindow || {}
}

// ── Spatial & Conditions ──────────────────────────────────────────────────
export function getConditions(env) {
  if (env?.is_coastal === false) return {}
  return resolveEnv(env)?.marineSituation?.conditions || {}
}

export function getMapData(env) {
  return resolveEnv(env)?.map || {}
}

export function getHazards(env) {
  if (env?.is_coastal === false) return []
  return resolveEnv(env)?.marineSituation?.hazards || []
}

export function getFishingZones(env) {
  if (env?.is_coastal === false) return {}
  return resolveEnv(env)?.marineSituation?.fishingZones || {}
}

export function getSpatialAnalysis(env) {
  if (env?.is_coastal === false) return {}
  return resolveEnv(env)?.marineSituation?.spatialAnalysis || {}
}

export function getRegions(env) {
  if (env?.is_coastal === false) return []
  return resolveEnv(env)?.marineSituation?.spatialAnalysis?.regions || []
}

// ── Decision Output ───────────────────────────────────────────────────────
export function getDecision(env) {
  if (env?.is_coastal === false) {
    const d = env?.decisionOutput || {}
    return {
      status: 'inland',
      headline: d.headline || 'Non-Coastal / Inland Location',
      summary: d.summary || 'Marine and oceanographic assessment is restricted to coastal waters.',
      narrative: d.narrative || '',
    }
  }
  return resolveEnv(env)?.decisionOutput || {}
}

export function getAreaPriorities(env) {
  if (env?.is_coastal === false) return []
  return resolveEnv(env)?.decisionOutput?.areaPriorities || []
}

// ── Other Modules ─────────────────────────────────────────────────────────
export function getProvenance(env) {
  return resolveEnv(env)?.provenance || {}
}

export function getExplainability(env) {
  return resolveEnv(env)?.explainability || {}
}

export function getAlertWorkflow(env) {
  return resolveEnv(env)?.alertWorkflow || {}
}

export function getDraftWarning(env) {
  return resolveEnv(env)?.alertWorkflow?.draft || {}
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

