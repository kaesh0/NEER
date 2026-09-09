import React from 'react'
import { useTranslation } from '../../i18n/translations.js'
import InlandLocationNotice from '../../components/ui/InlandLocationNotice.jsx'

export default function MarineAreas({ onNavigate, selectedLocation, onLocationChange }) {
  const { t } = useTranslation()

  const isInland = selectedLocation?.isCoastal === false

  if (isInland) {
    return (
      <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-8 pb-12 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">{t('Maritime Corridors')}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">{t('Inland Non-Maritime')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-2">
              {t('Maritime Transit Corridors Inactive')}
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-2">
              {selectedLocation?.name || t('This area')} {t('is located inland. Oceanic transit corridors, shelf drop-offs, and fairway bathymetry apply exclusively to coastal ports and maritime corridors.')}
            </p>
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

  const baseName = selectedLocation?.name ? selectedLocation.name.split(',')[0] : 'Coastal'
  const lat = selectedLocation?.lat || 9.96
  const lng = selectedLocation?.lng || 76.22

  const sectors = [
    {
      id: 'sector-1',
      title: 'SECTOR 1 • 0–50 NM',
      name: `${baseName} Coastal Corridor`,
      status: 'Medium / Caution',
      statusClass: 'bg-amber-50 text-amber-800 border border-amber-200',
      description: 'Harbour exit, shipping channels, and coastal shelf transition zone.',
      wave: '0.98 m',
      wind: '14.7 km/h',
      coords: `${lat.toFixed(2)}° N, ${lng.toFixed(2)}° E`,
      lat: lat,
      lng: lng,
    },
    {
      id: 'sector-2',
      title: 'SECTOR 2 • 50–120 NM',
      name: 'Outer Continental Shelf',
      status: 'Favourable',
      statusClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      description: 'Deep continental drop-off, low traffic commercial transit zone.',
      wave: '1.4 m',
      wind: '18.0 km/h',
      coords: `${(lat + 0.1).toFixed(2)}° N, ${(lng - 0.9).toFixed(2)}° E`,
      lat: lat + 0.1,
      lng: lng - 0.9,
    },
    {
      id: 'sector-3',
      title: 'SECTOR 3 • 120–218 NM',
      name: 'Open Ocean Transit Channel',
      status: 'Caution Swell',
      statusClass: 'bg-amber-50 text-amber-800 border border-amber-300',
      description: 'Outer deep-water transit corridor with cross-sea swell interaction.',
      wave: '1.9 m (Surge)',
      waveClass: 'text-amber-600',
      wind: '24.0 km/h',
      coords: `${(lat + 0.6).toFixed(2)}° N, ${(lng - 3.6).toFixed(2)}° E`,
      lat: lat + 0.6,
      lng: lng - 3.6,
    },
  ]

  return (
    <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-8 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {t('Regional Operational Sectors & Maritime Corridors')}
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-2">
            {t('Detailed bathymetric, traffic density, and environmental risk analysis for')} {baseName}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-mono font-bold border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            {t('3 Monitored Sectors Active')}
          </span>
        </div>
      </div>

      {/* Sector Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {sectors.map((sector) => (
          <div
            key={sector.id}
            className={`bg-white border-2 rounded-2xl p-6 shadow-xs flex flex-col justify-between transition-all hover:shadow-md ${
              sector.id === 'sector-3'
                ? 'border-amber-300'
                : sector.id === 'sector-2'
                ? 'border-emerald-200'
                : 'border-slate-200 hover:border-sky-400'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                  {sector.title}
                </span>
                <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${sector.statusClass}`}>
                  {t(sector.status)}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">{t(sector.name)}</h2>
              <p className="text-xs text-slate-500 font-medium mt-2">{t(sector.description)}</p>

              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-mono text-[10px] uppercase font-semibold">
                    {t('WAVE HEIGHT')}
                  </span>
                  <span className={`font-mono font-bold text-base ${sector.waveClass || 'text-slate-900'}`}>
                    {sector.wave}
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-mono text-[10px] uppercase font-semibold">
                    {t('WIND SPEED')}
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-base">{sector.wind}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400">{sector.coords}</span>
              <button
                onClick={() =>
                  onNavigate &&
                  onNavigate('map', { type: 'location', lat: sector.lat, lng: sector.lng, zoom: 9 })
                }
                className="text-xs font-bold text-sky-700 hover:text-sky-900 transition-colors"
                type="button"
              >
                {t('Locate Corridor →')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
