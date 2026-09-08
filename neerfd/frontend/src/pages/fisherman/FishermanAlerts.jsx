import React, { useState } from 'react'
import { getHazards, getTimeWindow, getMapData, formatDate } from '../../data/mock/fishermanData.js'
import { useTranslation } from '../../i18n/translations.js'

export default function FishermanAlerts({ data, loading, error, onRetry, onNavigate }) {
  const { t } = useTranslation()
  const [acknowledged, setAcknowledged] = useState(false)

  const hazards = getHazards(data)
  const timeWindow = getTimeWindow(data)
  const mapData = getMapData(data)

  const primaryHazard = hazards[0] || {
    id: 'hazard-mpa-1',
    title: 'Current Position Inside Demo Marine Protected Area (MPA)',
    message: 'Vessel coordinates indicate proximity inside the no-trawl preservation perimeter. Net deployment and mechanized dredging are unlawful in this coordinate polygon.',
    source: 'Kerala State Fisheries & Coastal Regulation Zone (CRZ) Notice 14-B.',
  }

  return (
    <div className="tab-view-content flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 view-transition-wrapper" id="view-alerts">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-red-600 uppercase tracking-widest">{t('Active Ocean Advisories')}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">1 {t('Critical Active')}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">{t('Maritime Alerts & Hazard Directives')}</h1>
          <p className="text-sm text-slate-500">{t('Government maritime notices, protected sanctuary perimeters, and oceanographic weather warnings.')}</p>
        </div>
        <button
          className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
          onClick={() => setAcknowledged(true)}
          type="button"
        >
          {acknowledged ? t('All advisories reviewed ✓') : t('Mark all as reviewed')}
        </button>
      </div>

      {/* Alert 1 - Critical MPA */}
      <article className="p-6 rounded-2xl bg-white border border-amber-300 shadow-sm space-y-4 card-tactile-lift">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path>
              <path d="M12 9v4"></path>
              <path d="M12 17h.01"></path>
            </svg>
          </div>
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <span className="badge-caution-pulse inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                {t('Action Required: Inside Demo Marine Protected Area (MPA)')}
              </span>
              <span className="text-xs text-slate-400">Issued 28m ago • Target: Small craft & Trawlers</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">{t(primaryHazard.title)}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {t(primaryHazard.message)}
            </p>
            <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-900 space-y-1">
              <div><strong>{t('Action Directive')}:</strong> {t('Steer course 240° WSW for 6.2 NM to clear sanctuary boundary prior to gear deployment.')}</div>
              <div><strong>{t('Authority')}:</strong> {primaryHazard.source || 'Kerala State Fisheries & Coastal Regulation Zone (CRZ) Notice 14-B.'}</div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition cursor-pointer"
                onClick={() => onNavigate && onNavigate('map', { type: 'hazard', id: primaryHazard.id, lat: 9.72, lng: 76.08 })}
                type="button"
              >
                {t('View Safe Exit Corridor on Map')}
              </button>
              <button
                className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-medium transition cursor-pointer"
                onClick={() => alert(t('MPA Rules: No bottom trawling, purse seine or gillnets allowed within 5 NM of sanctuary reef boundary.'))}
                type="button"
              >
                {t('Read MPA Rules & Fine Schedule')}
              </button>
            </div>
          </div>
        </div>
      </article>

      {/* Alert 2 - Route Swell */}
      <article className="p-6 rounded-2xl bg-white border border-sky-300 shadow-sm space-y-4 card-tactile-lift">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-100 border border-sky-200 text-sky-700 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24">
              <path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"></path>
              <path d="m13 12-3 5h4l-3 5"></path>
            </svg>
          </div>
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800">
                {t('Advisory: Swell Surge in Outer Route Segment')}
              </span>
              <span className="text-xs text-slate-400">Forecast for Wednesday • Target: All Vessels</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">{t('Offshore Swell Period Lengthening to 11.2s in Segment 3')}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {t('Wave crest heights expected to reach 1.9 m in the deep sea passage between NM 72 and NM 130. Harbor bar breakers possible on return during outgoing tide.')}
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition cursor-pointer"
                onClick={() => onNavigate && onNavigate('map')}
                type="button"
              >
                {t('Inspect on Map')}
              </button>
              <button
                className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold transition cursor-pointer"
                onClick={() => onNavigate && onNavigate('home')}
                type="button"
              >
                {t('Review Wave Telemetry')}
              </button>
            </div>
          </div>
        </div>
      </article>
    </div>
  )
}
