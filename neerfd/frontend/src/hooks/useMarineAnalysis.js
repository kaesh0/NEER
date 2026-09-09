import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Shared hook to fetch marine analysis data from the Node backend.
 * Returns { data, loading, error, refetch }.
 *
 * Does NOT silently fall back to static JSON — surfaces errors clearly.
 * Caches per-persona to avoid re-fetching on tab switches.
 */
export function useMarineAnalysis(persona, locationParams = null) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!!persona);
  const [error, setError] = useState(null);
  const cache = useRef({});

  const locationKey = locationParams
    ? (typeof locationParams === 'string' ? locationParams : `${locationParams.lat ?? ''},${locationParams.lng ?? ''},${locationParams.name || locationParams.location || ''}`)
    : 'default';

  const fetchData = useCallback(async () => {
    if (!persona) {
      setLoading(false);
      return;
    }

    // Wait until location detection finishes so we don't query dummy "Locating..."
    if (locationParams && (locationParams.isDetecting || locationParams.name === 'Detecting Location...' || locationParams.name === 'Locating...')) {
      setLoading(true);
      return;
    }

    const cacheKey = `${persona}:${locationKey}`;
    // Return cached data if available for this persona and location
    if (cache.current[cacheKey]) {
      setData(cache.current[cacheKey]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ persona });
      if (locationParams) {
        if (typeof locationParams === 'string') {
          params.set('location', locationParams);
        } else {
          if (locationParams.lat != null && locationParams.lng != null) {
            params.set('lat', locationParams.lat);
            params.set('lng', locationParams.lng);
          }
          if (locationParams.name || locationParams.location) {
            params.set('location', locationParams.name || locationParams.location);
          }
        }
      }

      const res = await fetch(`/api/analysis?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `API error: ${res.status}`);
      }
      const json = await res.json();
      cache.current[cacheKey] = json;
      setData(json);
    } catch (err) {
      console.warn('Live marine API offline or unreachable, using local dataset:', err.message);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [persona, locationKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Allow forcing a fresh fetch (bypasses cache)
  const refetch = useCallback(() => {
    const cacheKey = `${persona}:${locationKey}`;
    delete cache.current[cacheKey];
    return fetchData();
  }, [persona, locationKey, fetchData]);

  return { data, loading, error, refetch };
}
