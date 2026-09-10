import React, { useState, useEffect } from 'react'
import { Icon } from '../../icons/index.js'
import MarineInteractiveMap from '../../components/marine/MarineInteractiveMap.jsx'
import Card from '../../components/ui/Card.jsx'
import StructuredLocationCard from '../../components/ui/StructuredLocationCard.jsx'
import { useTranslation } from '../../i18n/translations.js'
import { getCoastalPlaceName } from '../../utils/coastalGeocoder.js'

export default function MarineMap({
  selectedLocation,
  focusPoint,
  setFocusPoint,
  onNavigate,
  setExploredLocation,
  exploredLocation,
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
      `/api/analysis?persona=marine&lat=${exploredLocation.lat}&lng=${exploredLocation.lng}&location=${encodeURIComponent(
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

  return (
    <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 pb-12 animate-fade-in">
      {/* Map Header matching code.html */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {t('Nautical Cartography GIS')}
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-2">
            {(!selectedLocation?.name || selectedLocation.name.toLowerCase().includes('kerala') || selectedLocation.name.toLowerCase().includes('kochi'))
              ? t('Route Vector: Kochi Outer Anchorage → Lakshadweep Sea Fairway')
              : `${t('Route Vector:')} ${selectedLocation.name.split(',')[0]} ${t('Outer Anchorage')} → ${selectedLocation.name.split(',')[0]} ${t('Deepwater Fairway')}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 text-xs font-mono font-medium border border-slate-200 shadow-2xs">
            Scale 1:250,000
          </span>
          <span className="px-2.5 py-1 rounded bg-sky-50 text-sky-800 text-xs font-mono font-medium border border-sky-200 shadow-2xs">
            WGS-84 Datum
          </span>
        </div>
      </div>

      {/* Interactive Map Frame Container matching code.html */}
      <div className="relative w-full h-[640px] bg-slate-900 rounded-3xl overflow-hidden shadow-xl border border-slate-300">
        <MarineInteractiveMap
          height="100%"
          focusPoint={focusPoint}
          onNavigate={onNavigate}
          setExploredLocation={setExploredLocation}
          exploredLocation={exploredLocation}
          selectedLocation={selectedLocation}
        />

        {/* Floating Layer Indicator */}
        <div className="absolute top-4 left-14 sm:left-16 z-[1000] bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-3 shadow-md flex flex-col gap-1.5 pointer-events-auto">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">{t('Map Layers')}</span>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
            <input checked readOnly className="rounded text-sky-600 focus:ring-sky-500 w-3.5 h-3.5" type="checkbox" />
            <span>{t('Weather & Swell')}</span>
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
            <input checked readOnly className="rounded text-sky-600 focus:ring-sky-500 w-3.5 h-3.5" type="checkbox" />
            <span>{t('Vessel Traffic (AIS)')}</span>
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
            <input checked readOnly className="rounded text-sky-600 focus:ring-sky-500 w-3.5 h-3.5" type="checkbox" />
            <span>{t('Official Fairways')}</span>
          </label>
        </div>

        {/* Explored Location Modal */}
        {exploredLocation && (
          <div className="fixed inset-0 z-[2000] flex flex-col items-center justify-center py-8 px-4 animate-fade-in bg-slate-900/60 backdrop-blur-sm">
            <div className="relative z-10 max-w-lg w-full">
              <Card variant="bordered" className="bg-white p-6 md:p-8 shadow-neer-lg rounded-2xl border-slate-200">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                      <Icon name="map" size={22} />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider block">
                        {t('Live Location Intelligence')}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900">
                        {locData?.request?.geometry?.label ||
                          locData?.marineSituation?.context?.geometry?.label ||
                          locData?.marineSituation?.spatialAnalysis?.pointSummary?.label ||
                          getCoastalPlaceName(exploredLocation.lat, exploredLocation.lng)}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono mt-2">
                        {exploredLocation.lat.toFixed(4)}° N, {exploredLocation.lng.toFixed(4)}° E
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setExploredLocation(null)
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    aria-label="Close"
                    type="button"
                  >
                    <Icon name="x" size={20} />
                  </button>
                </div>

                {locLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
                    <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-medium text-slate-600">{t('Analyzing marine conditions...')}</p>
                  </div>
                ) : locError ? (
                  <div className="py-6 text-center">
                    <p className="text-sm text-red-600 mb-4">{locError}</p>
                    <button
                      onClick={() => setExploredLocation(null)}
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200"
                      type="button"
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
                        onClick={() => setExploredLocation(null)}
                        className="px-5 py-2.5 bg-sky-600 text-white rounded-xl font-semibold text-sm hover:bg-sky-700 transition-all shadow-sm"
                        type="button"
                      >
                        {t('Clear Selection')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    <button
                      onClick={() => setExploredLocation(null)}
                      className="w-full py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700 transition-all shadow-sm"
                      type="button"
                    >
                      {t('Clear Selection')}
                    </button>
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
