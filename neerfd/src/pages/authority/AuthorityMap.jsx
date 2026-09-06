import React, { useState, useEffect } from 'react'
import SectionHeader from '../../components/layout/SectionHeader.jsx'
import AuthorityInteractiveMap from '../../components/authority/AuthorityInteractiveMap.jsx'
import AuthorityMapAmbience from '../../components/authority/AuthorityMapAmbience.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import StructuredLocationCard from '../../components/ui/StructuredLocationCard.jsx'
import { getMapData } from '../../data/mock/authorityData.js'
import { useTranslation } from '../../i18n/translations.js'

import { Icon } from '../../icons/index.js'

export default function AuthorityMap({ data, loading, error, onRetry, focusPoint, setFocusPoint, onNavigate, exploredLocation, setExploredLocation }) {
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

    fetch(`/api/analysis?persona=authority&lat=${exploredLocation.lat}&lng=${exploredLocation.lng}`)
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
    <div className="relative flex flex-col h-[calc(100vh-4.5rem)] pb-4 md:pb-8 max-w-[1440px] mx-auto w-full px-4 pt-6">
      <AuthorityMapAmbience />
      <div className="relative z-10 flex flex-col h-full w-full">
        <SectionHeader 
          title="Regional Geospatial Intelligence" 
          subtitle={`${mapData.layers.length} layers available · ${mapData.status}`} 
        />
        <div className="flex-1 w-full mt-4 min-h-[400px] relative">
          <AuthorityInteractiveMap height="100%" focusPoint={focusPoint} onNavigate={onNavigate} setExploredLocation={setExploredLocation} data={data} />

          {/* Explored Location Overlay */}
          {exploredLocation && (
            <div className="absolute top-4 left-4 z-[400] w-[340px] bg-white rounded-xl shadow-neer-lg border border-slate-200 overflow-hidden animate-fade-in">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-start justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{t('Location Selected')}</div>
                  <div className="text-lg font-mono font-bold text-neer-navy-900">
                    {exploredLocation.lat.toFixed(4)}° N, {exploredLocation.lng.toFixed(4)}° E
                  </div>
                </div>
                <button
                  onClick={() => setExploredLocation(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  aria-label="Clear selection"
                >
                  <Icon name="x" size={16} />
                </button>
              </div>

              {locLoading ? (
                <div className="p-6 flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 border-2 border-neer-ocean-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-slate-500">{t('Loading intelligence...')}</span>
                </div>
              ) : locError ? (
                <div className="p-4 text-xs text-red-600">
                  {locError}
                </div>
              ) : locData ? (
                <div className="p-4 flex flex-col gap-3">
                  <StructuredLocationCard locData={locData} persona="authority" />

                  <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-2 flex justify-between items-center">
                    <span>{locData.servedFrom === 'ai_service' ? t('Live AI Service') : t('Cached Model')}</span>
                    <button
                      onClick={() => setExploredLocation(null)}
                      className="text-neer-ocean-600 hover:underline font-medium"
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
    </div>
  )
}
