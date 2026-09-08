import React from 'react'
import { dataAvailability, provenance } from '../../data/mock/marineData.js'
import { useTranslation } from '../../i18n/translations.js'

export default function MarineDataStatus() {
  const { t } = useTranslation()

  const items = [
    { label: t('Marine Waves & Swell'), source: 'Open-Meteo Marine', status: dataAvailability.weather || 'live' },
    { label: t('Ocean Surface Currents'), source: 'Live Copernicus/ECMWF', status: dataAvailability.currents || 'live' },
    { label: t('Sea Surface Temperature'), source: 'Open-Meteo SST', status: dataAvailability.sst || 'live' },
    { label: t('Navigation Seamarks'), source: 'OpenSeaMap Fairway Buoys', status: 'live' },
    { label: t('Maritime Hazards'), source: 'INCOIS OSF Advisories', status: dataAvailability.hazards || 'live' },
  ]

  const isFull = dataAvailability.overall === 'full' || (items.every(i => i.status.toLowerCase() === 'live'))

  return (
    <div className="bg-white rounded-2xl border border-neer-border overflow-hidden shadow-sm card-tactile-lift">
      <div className="p-4 border-b border-neer-border bg-slate-50 flex items-center justify-between">
        <h3 className="font-bold text-neer-navy-900 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-500" />
          {t('Data Sources & Status')}
        </h3>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-neer-ink-secondary">
          <div className={`w-2 h-2 rounded-full ${isFull ? 'bg-emerald-500' : 'bg-amber-400'}`} />
          {isFull ? t('Full Coverage') : t('Partial Availability')}
        </div>
      </div>
      
      <div className="divide-y divide-neer-border/80">
        {items.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center p-3 text-sm hover:bg-slate-50/50 transition-colors">
            <div>
              <div className="font-medium text-neer-navy-800 text-xs">{item.label}</div>
              <div className="text-[10px] text-slate-400">{item.source}</div>
            </div>
            <span className={`text-[11px] font-semibold ${
              item.status.toLowerCase() === 'live' ? 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200' : 
              item.status.toLowerCase() === 'unavailable' ? 'text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full' : 
              'text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200'
            }`}>
              {item.status === 'live' ? t('Live') : 
               item.status === 'unavailable' ? t('Unavailable') : 
               item.status}
            </span>
          </div>
        ))}
      </div>
      
      <div className="p-3 bg-slate-50 border-t border-neer-border text-xs text-neer-ink-secondary">
        <p className="font-semibold mb-1 text-neer-navy-900 text-[11px] uppercase tracking-wider">{t('Verified Feeds:')}</p>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {provenance.sources.map(s => (
            <span key={s} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono font-medium text-slate-600">
              {s.replace('-', ' ').toUpperCase()}
            </span>
          ))}
          <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono font-medium text-slate-600">
            OPENSEAMAP
          </span>
        </div>
      </div>
    </div>
  )
}
