import { createContext, useContext, useState } from 'react'

/**
 * Home location for the signed-in user / guest — { name, lat, lng }.
 *
 * Chosen on the Register/Login pages (and via the header location chip /
 * gate modal for guests), then used for every analysis + chat request so the
 * app never falls back to a hardcoded default city.
 */
const LocationContext = createContext(null)

const STORAGE_KEY = 'neer-home-location'

function readStored() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY)
    if (!saved) return null
    const parsed = JSON.parse(saved)
    if (parsed && parsed.name && Number.isFinite(parsed.lat) && Number.isFinite(parsed.lng)) {
      return parsed
    }
  } catch {
    // corrupted storage → treat as unset
  }
  return null
}

export function LocationProvider({ children }) {
  const [homeLocation, setHomeLocationState] = useState(readStored)

  const setHomeLocation = (loc) => {
    const clean = loc && loc.name && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)
      ? { name: String(loc.name), lat: Number(loc.lat), lng: Number(loc.lng) }
      : null
    setHomeLocationState(clean)
    try {
      if (clean) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(clean))
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(clean))
      } else {
        localStorage.removeItem(STORAGE_KEY)
        sessionStorage.removeItem(STORAGE_KEY)
      }
    } catch (e) {
      console.error('Failed to persist home location', e)
    }
    return clean
  }

  return (
    <LocationContext.Provider value={{ homeLocation, setHomeLocation, hasHomeLocation: !!homeLocation }}>
      {children}
    </LocationContext.Provider>
  )
}

export function useHomeLocation() {
  const ctx = useContext(LocationContext)
  if (!ctx) {
    throw new Error('useHomeLocation must be used within a LocationProvider')
  }
  return ctx
}
