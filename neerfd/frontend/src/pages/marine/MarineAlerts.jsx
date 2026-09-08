import React, { useState } from 'react'
import { useTranslation } from '../../i18n/translations.js'

export default function MarineAlerts({ onNavigate }) {
  const { t } = useTranslation()
  const [acknowledged, setAcknowledged] = useState(false)
  const [fairwayLocked, setFairwayLocked] = useState(false)

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header matching code.html */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {t('Maritime Alerts & Tactical Advisories')}
            </h1>
            <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 rounded-full text-xs font-mono font-bold border border-rose-200">
              {t('2 Active Notices')}
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-1">
            {t('Real-time ocean state hazards, geofence compliance, and safety broadcasts.')}
          </p>
        </div>
      </div>

      {/* Alert Cards Stream matching code.html */}
      <div className="space-y-6 max-w-5xl">
        {/* Alert Card 1 */}
        <div className="bg-white border-2 border-amber-300 rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-shadow">
          <div className="flex flex-col md:flex-row">
            <div className="w-full md:w-52 bg-amber-50/90 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-amber-200/80 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shadow-xs mb-3">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </div>
              <span className="font-extrabold text-amber-900 tracking-wider text-sm">
                {t('CAUTION SWELL')}
              </span>
              <span className="text-xs font-mono font-semibold text-amber-700 mt-1">10:00 – 12:00 IST</span>
            </div>

            <div className="p-6 md:p-7 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-xl font-bold text-slate-900">
                    {t('Elevated Swell & Sea State Advisory (Segment 3)')}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-100 text-amber-800">
                    Wave 1.9m • Wind 24 km/h
                  </span>
                </div>
                <p className="text-slate-600 text-sm font-medium leading-relaxed">
                  {t(
                    'Significant wave height surges up to 1.9 m with cross-quarter swells detected across the outer Arabian Sea passage corridor. Vessels under 45m LOA and fishing craft are advised to exercise elevated situational awareness.'
                  )}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => setAcknowledged(true)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition ${
                    acknowledged
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                  type="button"
                >
                  {acknowledged ? t('Advisory Acknowledged ✓') : t('Acknowledge Advisory')}
                </button>
                <button
                  onClick={() => onNavigate && onNavigate('map', { type: 'hazard', id: 'swell-surge' })}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 hover:text-sky-900 transition-colors"
                  type="button"
                >
                  <span>{t('Plot Avoidance Waypoint')}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Alert Card 2 */}
        <div className="bg-white border-2 border-sky-300 rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-shadow">
          <div className="flex flex-col md:flex-row">
            <div className="w-full md:w-52 bg-sky-50/90 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-sky-200/80 text-center">
              <div className="w-14 h-14 rounded-2xl bg-sky-100 border border-sky-300 flex items-center justify-center text-sky-700 shadow-xs mb-3">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </div>
              <span className="font-extrabold text-sky-900 tracking-wider text-sm">
                {t('GEOFENCE MPA')}
              </span>
              <span className="text-xs font-mono font-semibold text-sky-700 mt-1">Zone Active 24/7</span>
            </div>

            <div className="p-6 md:p-7 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-xl font-bold text-slate-900">
                    {t('Geofenced Demo Marine Protected Area Restricted Zone')}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-sky-100 text-sky-800">
                    {t('Compliance Mandatory')}
                  </span>
                </div>
                <p className="text-slate-600 text-sm font-medium leading-relaxed">
                  {t(
                    'Vessel transit is strictly permitted only along designated hydrographic shipping fairways. No dropping anchor, bilge cleaning, or drift fishing allowed within the Cochin Coral Reef buffer coordinate polygon.'
                  )}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => setFairwayLocked(true)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition ${
                    fairwayLocked
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                  type="button"
                >
                  {fairwayLocked ? t('Fairway Lock Confirmed ✓') : t('Confirm Fairway Lock')}
                </button>
                <button
                  onClick={() => onNavigate && onNavigate('map')}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition"
                  type="button"
                >
                  {t('Inspect Zone Perimeter')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
