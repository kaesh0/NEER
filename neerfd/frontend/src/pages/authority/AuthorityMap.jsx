import React, { useState, useEffect } from 'react'
import AuthorityInteractiveMap from '../../components/authority/AuthorityInteractiveMap.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import StructuredLocationCard from '../../components/ui/StructuredLocationCard.jsx'
import { getMapData } from '../../data/mock/authorityData.js'
import { useTranslation } from '../../i18n/translations.js'
import { getCoastalPlaceName } from '../../utils/coastalGeocoder.js'
import { Icon } from '../../icons/index.js'

export default function AuthorityMap({
  data,
  loading,
  error,
  onRetry,
  focusPoint,
  setFocusPoint,
  onNavigate,
  exploredLocation,
  setExploredLocation,
  onLocationChange,
  selectedLocation,
}) {
  const { t } = useTranslation()
  const [locData, setLocData] = useState(null)
  const [locLoading, setLocLoading] = useState(false)
  const [locError, setLocError] = useState(null)

  useEffect(() => {
    if (!exploredLocation) {
      setLocData(null)
      setLocError(null)
      return
    }

    let isMounted = true
    setLocLoading(true)
    setLocError(null)

    const placeName = getCoastalPlaceName(exploredLocation.lat, exploredLocation.lng)
    fetch(
      `/api/analysis?persona=authority&lat=${exploredLocation.lat}&lng=${exploredLocation.lng}&location=${encodeURIComponent(
        placeName
      )}`
    )
      .then(async (res) => {
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          throw new Error(errBody.message || `API error: ${res.status}`)
        }
        return res.json()
      })
      .then((resData) => {
        if (isMounted) {
          setLocData(resData)
          setLocLoading(false)
        }
      })
      .catch((err) => {
        if (isMounted) {
          setLocError(err.message || 'Failed to fetch location analysis')
          setLocLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [exploredLocation?.lat, exploredLocation?.lng])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={onRetry} />

  const mapData = getMapData(data)

  return (
    <div className="space-y-4 pb-12 animate-fade-in">
      {/* Map Header matching code.html */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {t('Regional Geospatial Intelligence')}
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            {mapData?.layers?.length || 2} {t('layers available · live coastal telemetry')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
            {t('Bounding Box:')} {selectedLocation?.name ? `${selectedLocation.name.split(',')[0]} Sector` : t('Maritime Zone (EEZ)')}
          </span>
        </div>
      </div>

      {/* Full Interactive Map Canvas Card matching code.html */}
      <div className="relative bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden h-[640px] w-full">
        <AuthorityInteractiveMap
          height="100%"
          focusPoint={focusPoint}
          onNavigate={onNavigate}
          setExploredLocation={setExploredLocation}
          data={data}
          selectedLocation={selectedLocation}
        />

        {/* Explored Location Overlay */}
        {exploredLocation && (
          <div className="absolute top-4 left-4 z-[1000] w-[340px] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-fade-in">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-start justify-between">
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  {t('Location Selected')}
                </div>
                <div className="text-base font-bold text-slate-900">
                  {locData?.request?.geometry?.label ||
                    locData?.marineSituation?.context?.geometry?.label ||
                    locData?.marineSituation?.spatialAnalysis?.pointSummary?.label ||
                    getCoastalPlaceName(exploredLocation.lat, exploredLocation.lng)}
                </div>
                <div className="text-xs font-mono text-slate-500 mt-0.5">
                  {exploredLocation.lat.toFixed(4)}° N, {exploredLocation.lng.toFixed(4)}° E
                </div>
              </div>
              <button
                onClick={() => setExploredLocation(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Clear selection"
                type="button"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            {locLoading ? (
              <div className="p-6 flex flex-col items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-500">{t('Loading intelligence...')}</span>
              </div>
            ) : locError ? (
              <div className="p-4 text-xs text-red-600">{locError}</div>
            ) : locData ? (
              <div className="p-4 flex flex-col gap-3">
                <StructuredLocationCard locData={locData} persona="authority" />

                {/* Set as Active Monitoring Sector Action Button */}
                {onLocationChange && (
                  <button
                    onClick={() => {
                      const resolvedName = locData?.request?.geometry?.label ||
                        locData?.marineSituation?.context?.geometry?.label ||
                        getCoastalPlaceName(exploredLocation.lat, exploredLocation.lng)
                      onLocationChange({
                        name: resolvedName,
                        lat: exploredLocation.lat,
                        lng: exploredLocation.lng,
                      })
                      setExploredLocation(null)
                    }}
                    className="w-full py-2.5 px-4 bg-[#0284c7] hover:bg-sky-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{t('Set as Active Monitoring Sector')}</span>
                  </button>
                )}

                <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-2 flex justify-between items-center">
                  <span>{locData.servedFrom === 'ai_service' ? t('Live AI Service') : t('Cached Model')}</span>
                  <button
                    onClick={() => setExploredLocation(null)}
                    className="text-sky-600 hover:underline font-medium"
                    type="button"
                  >
                    {t('Dismiss')}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
