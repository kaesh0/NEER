import React, { useState } from 'react'
import { getHazards, getTimeWindow, getMapData, formatDate } from '../../data/mock/fishermanData.js'
import { useTranslation } from '../../i18n/translations.js'
import { Icon } from '../../icons/index.js'
import InlandLocationNotice from '../../components/ui/InlandLocationNotice.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'

export default function FishermanAlerts({ data, loading, error, onRetry, onNavigate, selectedLocation, onLocationChange }) {
  const { t } = useTranslation()
  const [acknowledged, setAcknowledged] = useState(false)

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={onRetry} />

  const isInland = selectedLocation?.isCoastal === false || data?.is_coastal === false || data?.decisionOutput?.status === 'inland'

  if (isInland) {
    return (
      <div className="tab-view-content flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 view-transition-wrapper" id="view-alerts">
        <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('Maritime Alerts & Hazards')}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">0 {t('Active Coastal Notices')}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mt-1">{t('No Marine Advisories for Inland Region')}</h1>
            <p className="text-sm text-slate-500">
              {selectedLocation?.name || t('This area')} {t('is located inland. High wave surges, MPA sanctuary restrictions, and storm alerts apply only to maritime sectors.')}
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

  const hazards = getHazards(data)
  const timeWindow = getTimeWindow(data)
  const mapData = getMapData(data)

  return (
    <div className="tab-view-content flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 view-transition-wrapper" id="view-alerts">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-red-600 uppercase tracking-widest">{t('Active Ocean Advisories')}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              hazards.length > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {hazards.length} {hazards.length > 0 ? t('Active Notices') : t('All Clear')}
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">{t('Maritime Alerts & Hazard Directives')}</h1>
          <p className="text-sm text-slate-500">
            {selectedLocation?.name ? `${t('Monitoring')} ${selectedLocation.name} · ` : ''}
            {t('Government maritime notices, protected sanctuary perimeters, and oceanographic weather warnings.')}
          </p>
        </div>
        {hazards.length > 0 && (
          <button
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
            onClick={() => setAcknowledged(true)}
            type="button"
          >
            {acknowledged ? t('All advisories reviewed ✓') : t('Mark all as reviewed')}
          </button>
        )}
      </div>

      {hazards.length === 0 ? (
        <div className="p-8 rounded-2xl bg-white border border-emerald-200 shadow-sm text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <Icon name="checkCircle" size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">{t('No Active Marine Advisories')}</h3>
          <p className="text-sm text-slate-600 max-w-lg mx-auto">
            {t('All oceanographic parameters for this coastal sector are currently within safe operating thresholds.')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {hazards.map((hazard, index) => {
            const isWarning = hazard.severity === 'warning' || hazard.severity === 'critical'
            return (
              <article 
                key={hazard.id || index}
                className={`p-6 rounded-2xl bg-white border ${
                  isWarning ? 'border-amber-300' : 'border-sky-300'
                } shadow-sm space-y-4 card-tactile-lift`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${
                    isWarning ? 'bg-amber-100 border-amber-200 text-amber-700' : 'bg-sky-100 border-sky-200 text-sky-700'
                  } border flex items-center justify-center flex-shrink-0`}>
                    <Icon name={isWarning ? 'alertTriangle' : 'info'} size={24} />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        isWarning ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'
                      }`}>
                        {hazard.severity ? hazard.severity.toUpperCase() : t('ADVISORY')}
                      </span>
                      {hazard.validUntil && (
                        <span className="text-xs text-slate-400">
                          {t('Valid until')}: {hazard.validUntil}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{t(hazard.title || hazard.headline || 'Marine Advisory')}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {t(hazard.message || '')}
                    </p>
                    {hazard.source && (
                      <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 space-y-1">
                        <div><strong>{t('Issuing Authority')}:</strong> {hazard.source}</div>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition cursor-pointer"
                        onClick={() => onNavigate && onNavigate('map')}
                        type="button"
                      >
                        {t('Inspect Sector on Map')}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
