// Geocoding model — the only layer that talks to external geocoding APIs.
//
// Two operations, both cached in memory (same live/cached discipline as the
// analysis model):
//   search(name)  → Open-Meteo Geocoding API, India results only
//   reverse(lat,lng) → Nominatim reverse geocoding (needs a descriptive
//                      User-Agent per their usage policy)
//
// The frontend uses search for the location picker on Register/Login and
// reverse for the "Use my location" button, so users never type coordinates.

const LOCATION_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // place names don't move
const SEARCH_TIMEOUT_MS = 8000;

const cache = new Map(); // key → { body, ts }

function getCached(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > LOCATION_CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.body;
}

function setCached(key, body) {
  // Bound the cache so a long-running demo server can't grow it forever.
  if (cache.size > 500) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
  cache.set(key, { body, ts: Date.now() });
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function prettyName(result) {
  const parts = [result.name || result.city || result.town || result.village];
  const admin = result.admin1 || result.state;
  if (admin && admin !== parts[0]) parts.push(admin);
  return parts.join(", ");
}

/**
 * Search Indian coastal/inland places by name.
 * Returns [{ name, lat, lng }] (max 6) or [] when nothing resolves / offline.
 */
async function searchLocations(query) {
  const clean = String(query || "").trim();
  if (clean.length < 2) return [];

  const key = `search:${clean.toLowerCase()}`;
  const cached = getCached(key);
  if (cached) return cached;

  const url =
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(clean)}` +
    `&count=10&language=en&format=json&countryCode=IN`;
  const payload = await fetchJson(url);
  const results = Array.isArray(payload?.results) ? payload.results : [];

  const seen = new Set();
  const places = [];
  for (const r of results) {
    const name = prettyName(r);
    const dedupe = name.toLowerCase();
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    places.push({
      name,
      lat: r.latitude,
      lng: r.longitude,
      admin1: r.admin1 || "",
      country: r.country_code || "IN",
    });
    if (places.length >= 6) break;
  }

  setCached(key, places);
  return places;
}

/**
 * Reverse-geocode coordinates into a human-readable place name.
 * Returns { name, lat, lng } or null when offline/unresolvable.
 */
async function reverseGeocode(lat, lng) {
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return null;

  const key = `reverse:${latNum.toFixed(3)},${lngNum.toFixed(3)}`;
  const cached = getCached(key);
  if (cached !== null) return cached;

  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latNum}&lon=${lngNum}` +
    `&zoom=10&accept-language=en`;
  const payload = await fetchJson(url, {
    headers: { "User-Agent": "NEER-Marine-Intelligence-Demo/1.0 (local development)" },
  });

  if (!payload || payload.error || !payload.display_name) {
    // Cache the miss too so a flaky Nominatim doesn't get hammered per click.
    setCached(key, null);
    return null;
  }

  const address = payload.address || {};
  const city = address.city || address.town || address.village || address.county || address.state_district;
  const state = address.state;
  const name = [city, state].filter(Boolean).join(", ") || payload.display_name.split(",").slice(0, 2).join(", ");

  const body = { name, lat: latNum, lng: lngNum };
  setCached(key, body);
  return body;
}

module.exports = { searchLocations, reverseGeocode };
