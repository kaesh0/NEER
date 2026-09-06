import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../icons/index.js'
import { useTranslation } from '../../i18n/translations.js'

/**
 * LocationPicker — search-as-you-type place picker backed by
 * GET /api/geo/search, plus a "Use my location" button that reverse-geocodes
 * browser coordinates via GET /api/geo/reverse.
 *
 * value / onChange contract: { name, lat, lng } | null
 */
export default function LocationPicker({ id, label, value, onChange, placeholder, required = false, error }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState(value?.name || '')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [locating, setLocating] = useState(false)
  const [pickerError, setPickerError] = useState('')
  const containerRef = useRef(null)
  const debounceRef = useRef(null)

  // Keep the visible text in sync when the parent resets the value from outside.
  useEffect(() => {
    setQuery(value?.name || '')
  }, [value?.name])

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => () => clearTimeout(debounceRef.current), [])

  const runSearch = (text) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!text || text.trim().length < 2) {
      setResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geo/search?q=${encodeURIComponent(text.trim())}`)
        const body = await res.json().catch(() => ({}))
        setResults(Array.isArray(body.results) ? body.results : [])
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
  }

  const handleChange = (e) => {
    const text = e.target.value
    setQuery(text)
    // Any manual edit invalidates the previously picked place until re-picked.
    runSearch(text)
  }

  const pick = (place) => {
    setQuery(place.name)
    setOpen(false)
    setPickerError('')
    onChange && onChange({ name: place.name, lat: place.lat, lng: place.lng })
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setPickerError(t('Geolocation is not supported by this browser. Please search instead.'))
      return
    }
    setLocating(true)
    setPickerError('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          const res = await fetch(`/api/geo/reverse?lat=${latitude}&lng=${longitude}`)
          if (!res.ok) throw new Error('reverse failed')
          const place = await res.json()
          setQuery(place.name)
          onChange && onChange({ name: place.name, lat: place.lat, lng: place.lng })
        } catch {
          // Reverse geocode failed — fall back to raw coordinates.
          const name = `${pos.coords.latitude.toFixed(4)}°, ${pos.coords.longitude.toFixed(4)}°`
          setQuery(name)
          onChange && onChange({ name, lat: pos.coords.latitude, lng: pos.coords.longitude })
        } finally {
          setLocating(false)
        }
      },
      () => {
        setLocating(false)
        setPickerError(t('Could not get your location. Please allow location access or search manually.'))
      },
      { timeout: 15000 },
    )
  }

  const showValue = query && !open

  return (
    <div className="flex flex-col gap-1 w-full relative" ref={containerRef}>
      {label && (
        <label htmlFor={id} className="text-neer-sm font-medium text-neer-ink">
          {label} {required && <span className="text-neer-unfavourable">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        <Icon name="location" size={18} className="absolute left-3 text-neer-ink-muted pointer-events-none" aria-hidden="true" />
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
          className={`w-full h-11 pl-11 pr-24 text-neer-base text-neer-ink bg-white border rounded-[0.625rem] outline-none transition-all duration-neer-base ease-neer-out placeholder:text-neer-ink-muted ${
            error || pickerError
              ? 'border-neer-unfavourable focus:shadow-[0_0_0_3px_rgba(179,38,30,0.18)]'
              : 'border-neer-border-strong focus:border-neer-ocean-500 focus:shadow-neer-focus'
          }`}
          placeholder={placeholder || t('Search your coastal town or port…')}
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        <div className="absolute right-2 flex items-center gap-1">
          {searching && (
            <span className="w-4 h-4 border-2 border-neer-ocean-200 border-t-neer-ocean-600 rounded-full animate-spin" aria-hidden="true" />
          )}
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="flex items-center gap-1 px-2 py-1.5 text-neer-xs font-semibold text-neer-ocean-600 hover:bg-neer-ocean-50 rounded-lg transition-colors disabled:opacity-60"
            title={t('Use my current location')}
          >
            {locating ? (
              <span className="w-3.5 h-3.5 border-2 border-neer-ocean-200 border-t-neer-ocean-600 rounded-full animate-spin" aria-hidden="true" />
            ) : (
              <Icon name="target" size={14} />
            )}
            {locating ? t('Locating…') : t('Use GPS')}
          </button>
        </div>
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neer-border rounded-xl shadow-neer-lg z-[300] overflow-hidden py-1 max-h-56 overflow-y-auto">
          {results.map((place) => (
            <button
              key={`${place.name}-${place.lat}-${place.lng}`}
              type="button"
              onClick={() => pick(place)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-neer-ocean-50 transition-colors"
            >
              <Icon name="location" size={14} className="text-neer-ocean-600 flex-shrink-0" />
              <span className="text-sm font-medium text-neer-ink">{place.name}</span>
            </button>
          ))}
        </div>
      )}

      {(pickerError || error) && (
        <div className="text-neer-xs text-neer-unfavourable" role="alert">
          {pickerError || error}
        </div>
      )}
      {showValue && value?.name && !pickerError && !error && (
        <div className="text-neer-xs text-neer-favourable font-medium flex items-center gap-1">
          <Icon name="check" size={12} /> {t('Location set')}: {value.name}
        </div>
      )}
    </div>
  )
}
