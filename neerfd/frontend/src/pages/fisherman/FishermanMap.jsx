import { useState, useEffect } from 'react'
import { Icon } from '../../icons/index.js'
import InteractiveMap from '../../components/fisherman/InteractiveMap.jsx'
import { getMapData } from '../../data/mock/fishermanData.js'
import Card from '../../components/ui/Card.jsx'
import { useTranslation } from '../../i18n/translations.js'
import StructuredLocationCard from '../../components/ui/StructuredLocationCard.jsx'
import { getCoastalPlaceName } from '../../utils/coastalGeocoder.js'

export default function FishermanMap({ data, loading, error, onRetry, focusPoint, setFocusPoint, onNavigate, setExploredLocation, exploredLocation, onLocationChange, selectedLocation }) {
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
    fetch(`/api/analysis?persona=fisherman&lat=${exploredLocation.lat}&lng=${exploredLocation.lng}&location=${encodeURIComponent(placeName)}`)
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

  const mapData = getMapData(data)

  return (
    <div className="tab-view-content flex-1 max-w-screen-2xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5 view-transition-wrapper" id="view-map">
      {/* Header matching code.html */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-sky-600 uppercase tracking-widest">{t('Nautical Radar & Cartography')}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">{t('Marine Map & Satellite Bathymetry')}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 text-white shadow hover:bg-sky-700 transition flex items-center gap-1.5 cursor-pointer"
            onClick={() => alert(t('Bathymetry, PFZ fronts, & Weather Radar layers active.'))}
            type="button"
          >
            <svg className="w-3.5 h-3.5" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24">
              <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"></path>
              <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"></path>
              <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"></path>
            </svg>
            {t('Layer Selector (3 Active)')}
          </button>
          <button
            className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            onClick={() => setFocusPoint({ type: 'location', lat: selectedLocation?.lat || 9.9312, lng: selectedLocation?.lng || 76.2673, zoom: 10 })}
            type="button"
          >
            <svg className="w-3.5 h-3.5" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24">
              <line x1="2" x2="5" y1="12" y2="12"></line>
              <line x1="19" x2="22" y1="12" y2="12"></line>
              <line x1="12" x2="12" y1="2" y2="5"></line>
              <line x1="12" x2="12" y1="19" y2="22"></line>
              <circle cx="12" cy="12" r="7"></circle>
            </svg>
            {t('Recenter')} {selectedLocation?.name ? selectedLocation.name.split(',')[0] : t('Location')}
          </button>
        </div>
      </div>

      {/* Map Container with Overlays */}
      <div className="relative w-full h-[620px] rounded-2xl overflow-hidden border border-slate-200 shadow-md">
        <InteractiveMap
          data={data}
          height="100%"
          className="w-full h-full"
          focusPoint={focusPoint}
          onNavigate={onNavigate}
          setExploredLocation={setExploredLocation}
          exploredLocation={exploredLocation}
          selectedLocation={selectedLocation}
        />

        {/* Telemetry Card Overlay */}
        <div className="absolute top-4 left-14 sm:left-16 z-[400] bg-white/95 backdrop-blur-md px-4 py-3 rounded-xl border border-slate-200 shadow-lg text-xs space-y-1 pointer-events-auto max-w-[calc(100%-4.5rem)] sm:max-w-sm">
          <div className="font-bold text-slate-800">{t('Fairway Vessel Telemetry')}</div>
          <div className="text-slate-500">{t('Bearing')}: <span className="font-semibold text-slate-800">242° WSW</span> • {t('Depth')}: <span className="font-semibold text-slate-800">22.4 m</span></div>
          <div className="text-emerald-700 font-medium">{t('Optimal Surface Temperature: 28.3°C')}</div>
        </div>

        {/* Full Map Legend */}
        {(() => {
          const locShortName = selectedLocation?.name ? selectedLocation.name.split(',')[0].trim() : 'Current Port'
          const isKerala = !selectedLocation?.name || selectedLocation.name.toLowerCase().includes('kerala') || selectedLocation.name.toLowerCase().includes('kochi')
          return (
            <div className="absolute bottom-28 right-4 md:bottom-32 md:right-6 z-[400] bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-slate-200 shadow-lg text-xs space-y-2 pointer-events-auto max-w-[calc(100%-2rem)] sm:max-w-sm transition-all">
              <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">{t('GIS Layer Legend')}</div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-600 ring-2 ring-sky-200"></span>
                <span className="text-slate-700">{locShortName} ({t('Current Vessel')})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-emerald-200"></span>
                <span className="text-slate-700">{locShortName} PFZ ({t('Target')})</span>
              </div>
              {isKerala && (
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-200"></span>
                  <span className="text-slate-700">{t('Demo Marine Protected Area (Restricted)')}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="w-5 h-0.5 bg-sky-500 inline-block border-t-2 border-dashed border-sky-600"></span>
                <span className="text-slate-700">{t('Recommended Route Waypoint Path')}</span>
              </div>
            </div>
          )
        })()}
      </div>

      {/* Exploration modal on map pin click */}
      {exploredLocation && (
        <div className="fixed inset-0 z-[500] flex flex-col items-center justify-center py-8 px-4 animate-fade-in bg-slate-900/60 backdrop-blur-sm">
          <div className="relative z-10 max-w-lg w-full">
            <Card variant="bordered" className="bg-white p-6 md:p-8 shadow-neer-lg rounded-2xl border-slate-200">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                    <Icon name="map" size={22} />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider block">{t('Live Location Intelligence')}</span>
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
                    setFocusPoint({ type: 'location', lat: 9.9312, lng: 76.2673, zoom: 10 })
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <Icon name="x" size={20} />
                </button>
              </div>

              <div className="mt-4">
                {locLoading && (
                  <div className="py-8 flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs text-slate-500">{t('Fetching live marine telemetry...')}</span>
                  </div>
                )}
                {locError && (
                  <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 mb-3">
                    {locError}
                  </div>
                )}
                {locData && (
                  <StructuredLocationCard data={locData} />
                )}

                {/* Set as Active Location Action Button */}
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
                    className="w-full mt-4 py-2.5 px-4 bg-[#0284c7] hover:bg-sky-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{t('Set as Active Location')}</span>
                  </button>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
