import React from 'react'
import { dataAvailability, provenance } from '../../data/mock/marineData.js'
import { useTranslation } from '../../i18n/translations.js'

export default function MarineDataStatus() {
  const { t } = useTranslation()

  const items = [
    { label: t('WEATHER'), status: dataAvailability.weather },
    { label: t('HAZARDS'), status: dataAvailability.hazards },
    { label: t('CURRENTS'), status: dataAvailability.currents },
    { label: t('SST'), status: dataAvailability.sst },
    { label: t('PFZ'), status: t('Not applicable for maritime operator') }
  ]

  return (
    <div className="bg-white rounded-2xl border border-neer-border overflow-hidden">
      <div className="p-4 border-b border-neer-border bg-slate-50 flex items-center justify-between">
        <h3 className="font-bold text-neer-navy-900">{t('Data Sources & Status')}</h3>
        <div className="flex items-center gap-1.5 text-xs text-neer-ink-secondary">
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          {t('Partial Availability')}
        </div>
      </div>
      
      <div className="divide-y divide-neer-border">
        {items.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center p-3 text-sm">
            <span className="font-medium text-neer-navy-800">{item.label}</span>
            <span className={`text-xs ${
              item.status.toLowerCase() === 'live' ? 'text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100' : 
              item.status.toLowerCase() === 'unavailable' ? 'text-neer-ink-muted' : 
              'text-neer-ink-secondary'
            }`}>
              {item.status === 'live' ? t('Live') : 
               item.status === 'unavailable' ? t('Unavailable') : 
               item.status}
            </span>
          </div>
        ))}
      </div>
      
      <div className="p-3 bg-slate-50 border-t border-neer-border text-xs text-neer-ink-secondary">
        <p className="font-semibold mb-1 text-neer-navy-900">{t('Sources:')}</p>
        <ul className="space-y-1">
          {provenance.sources.map(s => (
            <li key={s}>• {s.replace('-', ' ').toUpperCase()}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
