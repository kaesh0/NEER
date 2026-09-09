import React from 'react'
import { getFishingZones, getFishingZoneMeta, getPfzRecommendation, directionToCompass, formatTime, formatDate } from '../../data/mock/fishermanData.js'
import { useTranslation } from '../../i18n/translations.js'
import InlandLocationNotice from '../../components/ui/InlandLocationNotice.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'

export default function FishermanZones({ data, loading, error, onRetry, onNavigate, selectedLocation, onLocationChange }) {
  const { t } = useTranslation()

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={onRetry} />

  const isInland = selectedLocation?.isCoastal === false || data?.is_coastal === false || data?.decisionOutput?.status === 'inland'

  if (isInland) {
    return (
      <div className="tab-view-content flex-1 max-w-screen-2xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-8 view-transition-wrapper" id="view-zones">
        <div className="border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">{t('Regional Priority & Fishing Zones')}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">{t('Non-Coastal Sector')}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-2">{t('Potential Fishing Zones (PFZ) Inactive')}</h1>
          <p className="text-sm text-slate-500">
            {selectedLocation?.name || t('This area')} {t('is located inland. Oceanic chlorophyll-a and sea surface temperature (SST) divergence zones apply exclusively to coastal and maritime waters.')}
          </p>
        </div>

        <InlandLocationNotice 
          location={selectedLocation} 
          onSelectLocation={onLocationChange}
          onOpenLocationModal={() => onNavigate && onNavigate('map')}
        />
      </div>
    )
  }

  const fishingZones = getFishingZones(data)
  const fishingZoneMeta = getFishingZoneMeta(data)
  const pfzRecommendation = getPfzRecommendation(data)

  // If no zones available and not inland
  if (fishingZones.length === 0) {
    return (
      <div className="tab-view-content flex-1 max-w-screen-2xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-8 view-transition-wrapper" id="view-zones">
        <div className="border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-black text-slate-900">{t('Potential Fishing Zones (PFZ)')}</h1>
          <p className="text-sm text-slate-500">{t('No active PFZ advisories available for this sector.')}</p>
        </div>
        <InlandLocationNotice 
          location={selectedLocation} 
          onSelectLocation={onLocationChange}
          onOpenLocationModal={() => onNavigate && onNavigate('map')}
        />
      </div>
    )
  }

  const highlightZone = fishingZones[0]
  const displayZones = fishingZones.slice(0, 3)

  return (
    <div className="tab-view-content flex-1 max-w-screen-2xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-8 view-transition-wrapper" id="view-zones">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-sky-600 uppercase tracking-widest">{t('Regional Priority & Fishing Zones')}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">{t('INCOIS Live Feed Active')}</span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 mt-2">{t('Regional Priority & Potential Fishing Zones (PFZ)')}</h1>
        <p className="text-sm text-slate-500">{t('Real-time chlorophyll frontal analysis and ocean sea surface temperature divergence bands around')} {selectedLocation?.name || t('coastal waters')}.</p>
      </div>

      {/* Regional Priority Summary Banner (4 KPI Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-400 font-semibold uppercase">{t('Regional Priority')}</div>
          <div className="text-xl font-bold text-slate-900 mt-2 flex items-center gap-2">
            <span>{selectedLocation?.name ? selectedLocation.name.split(',')[0] : t('Coastal Sector')}</span>
            <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-800 font-semibold">{t('Active')}</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">{selectedLocation?.lat ? `${selectedLocation.lat.toFixed(4)}° N, ${selectedLocation.lng.toFixed(4)}° E` : ''}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-400 font-semibold uppercase">{t('Safety Index Score')}</div>
          <div className="text-xl font-bold text-emerald-600 mt-2">88 / 100</div>
          <p className="text-xs text-slate-500 mt-2">{t('Calm nearshore, swells offshore')}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-400 font-semibold uppercase">{t('Active Marine Zones')}</div>
          <div className="text-xl font-bold text-sky-600 mt-2">{displayZones.length} {t('Identified')}</div>
          <p className="text-xs text-slate-500 mt-2">{displayZones.filter(z => z.status === 'favourable').length} {t('Favourable')}, {displayZones.filter(z => z.status !== 'favourable').length} {t('Moderate')}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-400 font-semibold uppercase">{t('Advisory Status')}</div>
          <div className="text-xl font-bold text-emerald-600 mt-2">{t('Active')}</div>
          <p className="text-xs text-slate-500 mt-2">{t('Live coastal telemetry')}</p>
        </div>
      </div>

      {/* Feature Banner: Highest Probability Cluster */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-sky-50 via-indigo-50/50 to-white border border-sky-200 shadow-sm card-tactile-lift">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-600 text-white text-xs font-semibold shadow-sm">
              <svg className="w-3.5 h-3.5" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24">
                <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"></path>
                <path d="M20 2v4"></path>
                <path d="M22 4h-4"></path>
                <circle cx="4" cy="20" r="2"></circle>
              </svg>
              {t('Highest Probability Cluster')}
            </div>
            <h2 className="text-xl font-black text-slate-900">{t(highlightZone.name)} — Offshore {selectedLocation?.name ? selectedLocation.name.split(',')[0] : 'Coastal'} Sector</h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
              {t('High concentration of chlorophyll-a gradients detected by Oceansat radiometer. Strong pelagic and demersal fish congregation forecast.')}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
              <span>{t('Distance')}: <strong className="text-slate-900">~{highlightZone.distance} km SW</strong></span>
              <span>{t('Depth')}: <strong className="text-slate-900">38–44 meters</strong></span>
              <span>{t('Coordinates')}: <strong className="text-slate-900">9.78° N, 75.92° E</strong></span>
              <span>{t('Valid until')}: <strong className="text-slate-900">11:59 PM ({t('Today')})</strong></span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <button
              className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs transition shadow flex items-center justify-center gap-2 cursor-pointer"
              onClick={() => onNavigate && onNavigate('map', { type: 'zone', id: highlightZone.id, lat: highlightZone.lat, lng: highlightZone.lng })}
              type="button"
            >
              <svg className="w-4 h-4" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24">
                <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
              </svg>
              {t('Plot GPS Waypoints')}
            </button>
          </div>
        </div>
      </div>

      {/* 3 Zone Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {displayZones.map((zone, idx) => {
          const isFavourable = zone.status === 'favourable'
          return (
            <div key={zone.id || idx} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm card-tactile-lift space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">{t(zone.name)}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  isFavourable ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {isFavourable ? t('Favourable') : t('Moderate')}
                </span>
              </div>
              <div className="space-y-1 text-xs text-slate-500">
                <div>{t('Distance')}: <strong className="text-slate-700">{zone.distance} km</strong></div>
                <div>{t('Direction')}: <strong className="text-slate-700">{zone.direction || (zone.bearing ? `${zone.bearing}°` : 'Offshore')}</strong></div>
                <div>{t('Target Species')}: <strong className="text-slate-700">{zone.species || 'Mackerel, Sardine, Tuna'}</strong></div>
                <div>{t('Surface Temp')}: <strong className="text-slate-700">{zone.temp || '28.4°C'}</strong></div>
              </div>
              <button
                className="w-full mt-2 py-2 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
                onClick={() => onNavigate && onNavigate('map', { type: 'zone', id: zone.id, lat: zone.lat, lng: zone.lng })}
                type="button"
              >
                {t('Inspect on Marine Map')}
                <svg className="w-3.5 h-3.5" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24">
                  <path d="m9 18 6-6-6-6"></path>
                </svg>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
