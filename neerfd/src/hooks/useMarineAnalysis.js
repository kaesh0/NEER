import { useState, useEffect, useCallback } from 'react';

/**
 * Shared hook to fetch marine analysis data from the Node backend.
 * Returns { data, loading, error, refetch }.
 *
 * Does NOT silently fall back to static JSON — surfaces errors clearly.
 * Caches per (persona, location) in a MODULE-level store so the boot-time
 * prefetch (App.jsx) and the hook share the same entry — by the time the user
 * picks a workspace, the data is often already there.
 *
 * `location` = { name, lat, lng } | null. Changing it refetches, so the
 * dashboard always reflects the user's chosen waters, never a default city.
 */

const analysisCache = new Map(); // `${persona}|${locKey}` → envelope

function cacheKeyFor(persona, location) {
  return `${persona}|${location ? `${location.lat},${location.lng},${location.name}` : ''}`;
}

/**
 * Fire-and-forget prefetch used at app boot so the first workspace visit is
 * instant when the user's location is already known.
 */
export function prefetchAnalysis(persona, location) {
  if (!persona || !location) return Promise.resolve(null);
  const key = cacheKeyFor(persona, location);
  if (analysisCache.has(key)) return Promise.resolve(analysisCache.get(key));

  const params = new URLSearchParams({ persona });
  params.set('location', location.name);
  params.set('lat', String(location.lat));
  params.set('lng', String(location.lng));

  return fetch(`/api/analysis?${params.toString()}`)
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`API error: ${res.status}`))))
    .then((json) => {
      analysisCache.set(key, json);
      return json;
    })
    .catch(() => null);
}

export function useMarineAnalysis(persona, location = null) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!!persona);
  const [error, setError] = useState(null);
  const locKey = location ? `${location.lat},${location.lng},${location.name}` : '';

  const fetchData = useCallback(async (bypassCache = false) => {
    if (!persona) {
      setLoading(false);
      return;
    }

    const key = cacheKeyFor(persona, location);

    if (!bypassCache && analysisCache.has(key)) {
      setData(analysisCache.get(key));
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ persona });
      if (location) {
        params.set('location', location.name);
        params.set('lat', String(location.lat));
        params.set('lng', String(location.lng));
      }
      const res = await fetch(`/api/analysis?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `API error: ${res.status}`);
      }
      const json = await res.json();
      analysisCache.set(key, json);
      setData(json);
    } catch (err) {
      setError(err.message || 'Failed to fetch marine data');
    } finally {
      setLoading(false);
    }
  }, [persona, locKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Allow forcing a fresh fetch (bypasses cache)
  const refetch = useCallback(() => fetchData(true), [fetchData]);

  return { data, loading, error, refetch };
}
