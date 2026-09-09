import React from 'react'
import MarineInteractiveMap from '../../components/marine/MarineInteractiveMap.jsx'
import InlandLocationNotice from '../../components/ui/InlandLocationNotice.jsx'
import { context, routeRecommendation, segments, formatTime, overallConditions } from '../../data/mock/marineData.js'
import { useTranslation } from '../../i18n/translations.js'

export default function MarineHome({ onNavigate, selectedLocation, onLocationChange }) {
  const { t } = useTranslation()

  const isInland = selectedLocation?.isCoastal === false

  if (isInland) {
    return (
      <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-8 pb-12 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {selectedLocation.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-2">
              {t('Inland Sector · Commercial Fairways Inactive')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              {t('Non-Coastal Area')}
            </span>
          </div>
        </div>

        <InlandLocationNotice 
          location={selectedLocation} 
          onSelectLocation={onLocationChange}
          onOpenLocationModal={() => onNavigate && onNavigate('map')}
        />
      </div>
    )
  }

  const isCaution = routeRecommendation.routeStatus === 'caution'
  const segment3 = segments.find((s) => s.id === 'segment-3') || {
    id: 'segment-3',
    name: 'Segment 3 (Offshore Transit Corridor)',
    status: 'caution',
    coordinates: '10.12° N, 74.88° E',
    timeWindow: '10:00 – 12:00',
    waveHeight: 1.9,
    windSpeed: 24,
    swellPeriod: 11.4,
    current: '1.2 kts NW',
  }

  const isKerala = !selectedLocation?.name || selectedLocation.name.toLowerCase().includes('kerala') || selectedLocation.name.toLowerCase().includes('kochi')
  const activeOrigin = selectedLocation?.name || context.origin.label || 'Kochi Port'
  const originShortName = activeOrigin.split(',')[0].trim()
  const activeDest = isKerala ? (context.destination.label || 'Lakshadweep (Kavaratti)') : `${originShortName} Deepwater Fairway`
  const activeBerth = isKerala ? 'Kochi Harbour Berth 4' : `${originShortName} Berth 1`
  const activeArrivalPier = isKerala ? 'Kavaratti Island Pier' : `${originShortName} Fairway Buoy`

  return (
    <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-8 pb-12 animate-fade-in">
      {/* Top Header matching code.html */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {t('Voyage Overview')}
          </h1>
          <div className="flex items-center gap-2 text-slate-600 font-medium mt-2 text-sm">
            <span className="font-semibold text-slate-900">{t(activeOrigin)}</span>
            <svg className="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            <span className="font-semibold text-slate-900">
              {t(activeDest)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-sky-50 text-sky-800 border border-sky-200">
            <span className="w-2 h-2 rounded-full bg-sky-500" />
            {t('Transit Plan: VOY-2025-084')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 columns */}
        <div className="lg:col-span-8 space-y-6">
          {/* Caution Banner matching code.html */}
          <div className="bg-amber-50/95 border-2 border-amber-300 rounded-2xl p-5 flex items-start gap-4 shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 flex-shrink-0 mt-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-200/80 text-amber-900 uppercase">
                  {t('CAUTION REQUIRED')}
                </span>
                <span className="text-xs text-amber-800 font-medium">• {t('Segment 3 Review Required')}</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                {t('Moderate swell surge flagged in Segment 3 (Offshore Corridor)')}
              </h2>
              <p className="text-sm text-slate-700 leading-relaxed">
                {t(
                  'Wave heights up to 1.9m with 11.4s period expected between 10:00 and 12:00 IST. Vessel stability remains within safe envelope, but speed reduction is advised.'
                )}
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  {t('Action Directive: Reduce transit speed to 12 knots through waypoint MP-03.')}
                </span>
              </div>
            </div>
          </div>

          {/* 4 Metric KPI Cards matching code.html */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block mb-1">{t('Departure')}</span>
              <div className="font-mono font-bold text-slate-900 text-lg">06:00 IST</div>
              <span className="text-[11px] text-slate-400 font-mono mt-2 block">{t(activeBerth)}</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block mb-1">{t('Estimated Arrival')}</span>
              <div className="font-mono font-bold text-slate-900 text-lg">14:30 IST</div>
              <span className="text-[11px] text-slate-400 font-mono mt-2 block">{t(activeArrivalPier)}</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block mb-1">{t('Max Wave Height')}</span>
              <div className="font-mono font-bold text-amber-600 text-lg">1.9 m</div>
              <span className="text-[11px] text-slate-400 font-mono mt-2 block">{t('Peak in Segment 3')}</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block mb-1">{t('Fuel Burn Estimate')}</span>
              <div className="font-mono font-bold text-slate-900 text-lg">1,280 L</div>
              <span className="text-[11px] text-slate-400 font-mono mt-2 block">{t('Optimal trim at 14 kts')}</span>
            </div>
          </div>

          {/* Voyage Details Card matching code.html */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-4">{t('Voyage Details')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-medium mb-1">{t('Planned Distance')}</span>
                <span className="font-mono font-bold text-slate-800 text-sm">218 NM</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium mb-1">{t('Avg Transit Speed')}</span>
                <span className="font-mono font-bold text-slate-800 text-sm">14.2 Knots</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium mb-1">{t('Sea Condition')}</span>
                <span className="font-mono font-bold text-amber-600 text-sm">{t('Moderate (State 3–4)')}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium mb-1">{t('Weather')}</span>
                <span className="font-mono font-bold text-slate-800 text-sm">{t('Clear · Wind 24 km/h')}</span>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <span className="font-medium text-slate-800">
                <span className="text-slate-500 font-normal">{t('Vessel Class:')}</span> Mid-size commercial passenger & cargo
              </span>
              <span className="text-slate-500 font-mono">Payload: 420 MT • Fairway Clearance: Yes</span>
            </div>
          </div>

          {/* Segment Requiring Review matching code.html */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">{t('Segment Requiring Review')}</h3>
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                  10:00–12:00
                </span>
              </div>
              <button
                className="text-xs font-bold text-sky-700 hover:text-sky-900 transition-colors"
                onClick={() => onNavigate && onNavigate('route')}
                type="button"
              >
                {t('Inspect all 4 segments →')}
              </button>
            </div>

            <div className="bg-white border-2 border-sky-400/90 rounded-2xl p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-lg">Segment 3 (Offshore Transit Corridor)</h4>
                  <p className="text-xs text-slate-500 font-mono mt-2">Coords: 10.12° N, 74.88° E • Transit: 10:00 – 12:00</p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                  <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                  {t('Caution')}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-3 border-t border-slate-100">
                <div>
                  <span className="text-xs text-slate-500 font-medium">{t('Wave Height')}</span>
                  <div className="text-lg font-mono font-bold text-amber-600">1.9 m</div>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium">{t('Wind Speed')}</span>
                  <div className="text-lg font-mono font-bold text-slate-900">24 km/h</div>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium">{t('Swell Period')}</span>
                  <div className="text-lg font-mono font-bold text-slate-900">11.4 s</div>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium">{t('Surface Current')}</span>
                  <div className="text-lg font-mono font-bold text-slate-900">1.2 kts NW</div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-2 text-xs">
                <span className="flex items-center gap-1 text-amber-800 font-medium bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                  <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                  {t('Elevated swell surge')}
                </span>
                <span className="flex items-center gap-1 text-amber-800 font-medium bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                  <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                  {t('Cross-quarter wave impact')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 columns */}
        <div className="lg:col-span-4 space-y-6">
          {/* Route Map Preview Card matching code.html */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <svg className="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
                {t('Route Map')}
              </span>
              <span className="text-[11px] font-mono text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {t('Active Fairway')}
              </span>
            </div>

            <div className="relative h-48 rounded-xl overflow-hidden border border-slate-200">
              <MarineInteractiveMap height="100%" onNavigate={onNavigate} selectedLocation={selectedLocation} />
            </div>

            <div className="mt-3 text-center">
              <button
                onClick={() => onNavigate && onNavigate('map')}
                className="text-xs font-bold text-sky-700 hover:text-sky-900 transition-colors inline-flex items-center gap-1"
                type="button"
              >
                {t('Open interactive cartography →')}
              </button>
            </div>
          </div>

          {/* Data Sources & Status Card matching code.html */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">{t('Data Sources & Status')}</h3>
              <span className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> {t('Live Telemetry')}
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs font-medium">
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-600 tracking-wide font-mono font-semibold">{t('WEATHER')}</span>
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                  {t('Live')}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-600 tracking-wide font-mono font-semibold">{t('HAZARDS / OSF')}</span>
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                  {t('Live')}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-600 tracking-wide font-mono font-semibold">{t('BATHYMETRY')}</span>
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                  {t('Verified')}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-600 tracking-wide font-mono font-semibold">{t('AIS VESSEL TRAFFIC')}</span>
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                  {t('Active')}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-600 tracking-wide font-mono font-semibold">{t('PFZ FISHING ZONES')}</span>
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                  {t('Updated')}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700">{t('Validated Feeds:')}</p>
              <p>• INCOIS Ocean State Forecast (OSF India)</p>
              <p>• Open-Meteo Marine High-Resolution Grid</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
