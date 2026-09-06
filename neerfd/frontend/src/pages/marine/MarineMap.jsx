import React, { useState, useEffect } from 'react'
import { Icon } from '../../icons/index.js'
import SectionHeader from '../../components/layout/SectionHeader.jsx'
import MarineInteractiveMap from '../../components/marine/MarineInteractiveMap.jsx'
import MarineMapAmbience from '../../components/marine/MarineMapAmbience.jsx'
import Card from '../../components/ui/Card.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import StructuredLocationCard from '../../components/ui/StructuredLocationCard.jsx'
import { useTranslation } from '../../i18n/translations.js'

export default function MarineMap({ focusPoint, setFocusPoint, onNavigate, setExploredLocation, exploredLocation }) {
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

    fetch(`/api/analysis?persona=marine&lat=${exploredLocation.lat}&lng=${exploredLocation.lng}`)
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

  return (
    <div className="relative flex flex-col h-[calc(100vh-4.5rem)] pb-4 md:pb-8 max-w-[1440px] mx-auto w-full px-4 pt-6 bg-slate-50">
      <MarineMapAmbience />
      
      {exploredLocation && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center py-8 px-4 animate-fade-in bg-slate-900/60 backdrop-blur-sm">
          <div className="relative z-10 max-w-lg w-full">
            <Card variant="bordered" className="bg-white p-6 md:p-8 shadow-neer-lg rounded-2xl border-slate-200">
              <div className="flex items-center justify-between pb-4 border-b border-neer-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neer-ocean-50 text-neer-ocean-600 flex items-center justify-center">
                    <Icon name="map" size={22} />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-neer-ocean-600 uppercase tracking-wider block">{t('Live Location Intelligence')}</span>
                    <h3 className="text-lg font-bold text-neer-navy-900">
                      {exploredLocation.lat.toFixed(4)}° N, {exploredLocation.lng.toFixed(4)}° E
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setExploredLocation(null)
                    setFocusPoint({ type: 'location', lat: 10.2, lng: 74.5, zoom: 7 })
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  aria-label="Close"
                >
                  <Icon name="x" size={20} />
                </button>
              </div>

              {locLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
                  <div className="w-8 h-8 border-3 border-neer-ocean-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm font-medium text-neer-ink-secondary">{t('Analyzing marine conditions...')}</p>
                </div>
              ) : locError ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-red-600 mb-4">{locError}</p>
                  <button
                    onClick={() => {
                      setExploredLocation(null)
                      setFocusPoint({ type: 'location', lat: 10.2, lng: 74.5, zoom: 7 })
                    }}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200"
                  >
                    {t('Close')}
                  </button>
                </div>
              ) : locData ? (
                <div className="py-4 space-y-4">
                  <StructuredLocationCard locData={locData} persona="marine" />

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-slate-400">
                      {locData.servedFrom === 'ai_service' ? t('Live AI Service') : t('Cached Model')}
                    </span>
                    <button
                      onClick={() => {
                        setExploredLocation(null)
                        setFocusPoint({ type: 'location', lat: 10.2, lng: 74.5, zoom: 7 })
                      }}
                      className="px-5 py-2.5 bg-neer-ocean-600 text-white rounded-xl font-semibold text-sm hover:bg-neer-ocean-700 transition-all shadow-sm"
                    >
                      {t('Clear Selection')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center">
                  <button
                    onClick={() => {
                      setExploredLocation(null)
                      setFocusPoint({ type: 'location', lat: 10.2, lng: 74.5, zoom: 7 })
                    }}
                    className="w-full py-3 bg-neer-ocean-600 text-white rounded-lg font-semibold hover:bg-neer-ocean-700 transition-all shadow-sm"
                  >
                    {t('Clear Selection')}
                  </button>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      <div className="relative z-10 flex flex-col h-full w-full">
        <SectionHeader 
          title={t('Nautical Cartography')} 
          subtitle={t('Route: Kochi Port → Lakshadweep')} 
        />
        <div className="flex-1 w-full mt-4 min-h-[400px]">
          <MarineInteractiveMap height="100%" focusPoint={focusPoint} onNavigate={onNavigate} setExploredLocation={setExploredLocation} exploredLocation={exploredLocation} />
        </div>
      </div>
    </div>
  )
}
