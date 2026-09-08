/**
 * NEER Domain Types
 *
 * This file documents the shape of data objects used across the frontend.
 * In plain JS we use JSDoc comments to describe types — no TypeScript needed.
 * All methods return Promises so the UI always works with async data.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * MarineStatus: 'favourable' | 'caution' | 'unfavourable' | 'unavailable'
 * ─────────────────────────────────────────────────────────────────────────
 *
 * WeatherCondition:
 *   { condition: string, tempC: number, windKmph: number, windDir: string, humidity: number }
 *
 * SeaCondition:
 *   { waveHeightM: number, swellDir: string, seaState: string, status: MarineStatus }
 *
 * FishingZone:
 *   { id: string, name: string, status: MarineStatus, tags: string[], validFrom: string, validTo: string }
 *
 * MarineAdvisory:
 *   { id: string, severity: MarineStatus, title: string, message: string, zones: string[] }
 *
 * ChatMessage:
 *   { id: string, role: 'user'|'assistant', text: string, languageCode?: string, sentAt: string }
 *
 * SuggestedQuestion:
 *   { id: string, text: string, languageCode?: string }
 */

// Note: Types are documented via JSDoc type definitions above.
export {}
