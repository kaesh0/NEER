/**
 * NEER Marine Data Service
 *
 * This module defines the gateway interface that UI components consume.
 * The mock implementation returns empty/default data so the UI runs
 * without a backend. Later, swap `createMockMarineDataService()` for
 * `createHttpMarineDataService(baseUrl)` without touching any UI code.
 *
 * IMPORTANT: No real API endpoints are called. This is a clean boundary
 * for future integration.
 */

// ─────────────────────────────────────────────────────────────────────────
// Interface (documented via JSDoc — no TypeScript needed)
// ─────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} MarineDataService
 * @property {() => Promise<Object|null>}               getWeatherSummary
 * @property {() => Promise<Object|null>}               getSeaConditions
 * @property {() => Promise<Object[]>}                  getFishingZones
 * @property {() => Promise<Object[]>}                  getActiveAdvisories
 * @property {() => Promise<Object[]>}                  getSuggestedQuestions
 */

// ─────────────────────────────────────────────────────────────────────────
// Mock implementation
// ─────────────────────────────────────────────────────────────────────────

function delay(ms = 300) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Creates a mock marine data service.
 * Returns empty arrays / null — no invented production data.
 * @returns {MarineDataService}
 */
export function createMockMarineDataService() {
  return {
    async getWeatherSummary() {
      await delay(200)
      return null
    },

    async getSeaConditions() {
      await delay(200)
      return null
    },

    async getFishingZones() {
      await delay(150)
      return []
    },

    async getActiveAdvisories() {
      await delay(150)
      return []
    },

    async getSuggestedQuestions() {
      await delay(100)
      return [
        { id: 'sq-1', text: 'How are the sea conditions today?' },
        { id: 'sq-2', text: 'Where are the best fishing zones?' },
        { id: 'sq-3', text: 'Any weather warnings for my area?' },
      ]
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Service factory — swap this to switch from mock to real API
// ─────────────────────────────────────────────────────────────────────────

let _service = null

/**
 * Returns the configured marine data service singleton.
 * Currently returns mock; swap to Http implementation later.
 * @returns {MarineDataService}
 */
export function getMarineDataService() {
  if (!_service) {
    _service = createMockMarineDataService()
  }
  return _service
}

/**
 * Reset the service singleton (useful for testing / hot-reload).
 */
export function resetMarineDataService() {
  _service = null
}
