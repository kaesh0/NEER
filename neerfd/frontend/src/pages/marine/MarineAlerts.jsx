import React from 'react'
import { Icon } from '../../icons/index.js'
import Button from '../../components/ui/Button.jsx'
import MarineAlertsAmbience from '../../components/marine/MarineAlertsAmbience.jsx'
import { hazards, formatTime } from '../../data/mock/marineData.js'
import { useTranslation } from '../../i18n/translations.js'

export default function MarineAlerts({ onNavigate }) {
  const { t } = useTranslation()

  return (
    <div className="relative min-h-full bg-slate-50 overflow-y-auto">
      <MarineAlertsAmbience />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-neer-navy-900 mb-8 tracking-tight">{t('Maritime Alerts & Hazards')}</h1>
        
        {hazards.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neer-border p-12 text-center">
            <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="checkCircle" size={32} />
            </div>
            <h2 className="text-xl font-bold text-neer-navy-900 mb-2">{t('No Active Alerts')}</h2>
            <p className="text-neer-ink-secondary">{t('There are currently no hazards or advisories for this route.')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {hazards.map((hazard) => (
              <div key={hazard.id} className={`bg-white rounded-2xl border ${hazard.severity === 'caution' ? 'border-amber-200' : 'border-red-200'} overflow-hidden shadow-sm flex flex-col md:flex-row`}>
                <div className={`p-4 md:p-6 md:w-48 flex-shrink-0 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r ${hazard.severity === 'caution' ? 'bg-amber-50 border-amber-100 text-amber-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                  <Icon name="alertTriangle" size={40} className="mb-2" />
                  <div className="font-bold uppercase tracking-wider text-sm">{t(hazard.severity === 'caution' ? 'Caution' : hazard.severity)}</div>
                  <div className="text-xs mt-1 font-medium bg-white/50 px-2 py-0.5 rounded-full">{formatTime(hazard.validFrom)} – {formatTime(hazard.validUntil)}</div>
                </div>
                <div className="p-4 md:p-6 flex-1 flex flex-col">
                  <h2 className="text-xl font-bold text-neer-navy-900 mb-2">{t(hazard.title)}</h2>
                  <p className="text-neer-navy-800 mb-4">{t(hazard.message)}</p>
                  
                  <div className="mt-auto pt-4 border-t border-neer-border flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs text-neer-ink-muted">
                      {t('Source:')} {hazard.source.toUpperCase().replace('-', ' ')}
                    </div>
                    <Button variant="secondary" icon="map" onClick={() => onNavigate('map', { type: 'hazard', id: hazard.id })}>
                      {t('Show on Map')}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
