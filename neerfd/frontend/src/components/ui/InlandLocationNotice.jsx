import React from 'react'
import { Icon } from '../../icons/index.js'
import { useTranslation } from '../../i18n/translations.js'

export default function InlandLocationNotice({ 
  location, 
  onSelectLocation,
  onOpenLocationModal
}) {
  const { t } = useTranslation()
  const placeName = location?.name || 'Inland Area'
  const distance = location?.distanceToCoastKm
  const nearestPort = location?.nearestPort

  const POPULAR_COASTAL_HUBS = [
    { name: 'Kochi, Kerala', lat: 9.9312, lng: 76.2673, isCoastal: true },
    { name: 'Mumbai, Maharashtra', lat: 18.9667, lng: 72.8333, isCoastal: true },
    { name: 'Chennai, Tamil Nadu', lat: 13.0827, lng: 80.2707, isCoastal: true },
    { name: 'Visakhapatnam, Andhra Pradesh', lat: 17.6868, lng: 83.2185, isCoastal: true },
    { name: 'Veraval, Gujarat', lat: 20.9071, lng: 70.3632, isCoastal: true },
    { name: 'Digha, West Bengal', lat: 21.6266, lng: 87.5074, isCoastal: true },
  ]

  return (
    <div className="w-full max-w-4xl mx-auto my-8 px-4 animate-fade-in" data-purpose="inland-location-notice">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-lg p-6 sm:p-10 text-center relative overflow-hidden">
        {/* Decorative background subtle accent */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* Top Icon Emblem */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-6 shadow-sm">
          <Icon name="compass" size={32} />
        </div>

        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold uppercase tracking-wider mb-4">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          <span>{t('Non-Coastal / Inland Area')}</span>
        </div>

        {/* Main Heading */}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
          {placeName}
        </h2>

        {/* Distance Subheading if available */}
        {distance != null && (
          <p className="text-sm font-medium text-amber-800 bg-amber-50 border border-amber-200/80 inline-block px-4 py-1.5 rounded-xl mb-5">
            📍 {t('Located approximately')} <span className="font-bold">{distance} km</span> {t('from the nearest coastline')}
            {nearestPort ? ` (${nearestPort.name}, ${nearestPort.admin})` : ''}
          </p>
        )}

        {/* Clear Generic Explanation */}
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto mb-8">
          {t('NEER is a dedicated oceanographic and marine intelligence platform. Live sea surface telemetry, wave forecasts, high-swell alerts, and Potential Fishing Zone (PFZ) advisories are only active for coastal and maritime zones.')}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-10">
          {nearestPort && onSelectLocation && (
            <button
              type="button"
              onClick={() => onSelectLocation({
                name: `${nearestPort.name}, ${nearestPort.admin}`,
                lat: nearestPort.lat,
                lng: nearestPort.lng,
                isCoastal: true,
              })}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-medium text-sm text-white bg-[#0b192e] hover:bg-[#003351] active:scale-[0.99] transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Icon name="navigation" size={16} className="text-sky-400" />
              <span>{t('Switch to Nearest Port')}: {nearestPort.name}</span>
            </button>
          )}

          {onOpenLocationModal && (
            <button
              type="button"
              onClick={onOpenLocationModal}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-medium text-sm text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Icon name="mapPin" size={16} className="text-slate-500" />
              <span>{t('Select Any Coastal Port')}</span>
            </button>
          )}
        </div>

        {/* Quick Coastal Hub Presets */}
        <div className="border-t border-slate-100 pt-6">
          <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            {t('Explore Major Coastal Sectors')}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {POPULAR_COASTAL_HUBS.map((hub) => (
              <button
                key={hub.name}
                type="button"
                onClick={() => onSelectLocation && onSelectLocation(hub)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-50 hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200 hover:border-sky-200 text-xs font-medium transition-colors cursor-pointer"
              >
                {hub.name.split(',')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
