import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Shared hook to fetch marine analysis data from the Node backend.
 * Returns { data, loading, error, refetch }.
 *
 * Does NOT silently fall back to static JSON — surfaces errors clearly.
 * Caches per-persona to avoid re-fetching on tab switches.
 */
export function useMarineAnalysis(persona) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!!persona);
  const [error, setError] = useState(null);
  const cache = useRef({});

  const fetchData = useCallback(async () => {
    if (!persona) {
      setLoading(false);
      return;
    }

    // Return cached data if available for this persona
    if (cache.current[persona]) {
      setData(cache.current[persona]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/analysis?persona=${persona}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `API error: ${res.status}`);
      }
      const json = await res.json();
      cache.current[persona] = json;
      setData(json);
    } catch (err) {
      setError(err.message || 'Failed to fetch marine data');
    } finally {
      setLoading(false);
    }
  }, [persona]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Allow forcing a fresh fetch (bypasses cache)
  const refetch = useCallback(() => {
    delete cache.current[persona];
    return fetchData();
  }, [persona, fetchData]);

  return { data, loading, error, refetch };
}
