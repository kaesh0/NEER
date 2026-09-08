import React from 'react'
import { useTranslation } from '../../i18n/translations.js'

export default function MarineRoute({ onNavigate }) {
  const { t } = useTranslation()

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Centered Header matching code.html */}
      <div className="flex flex-col items-center justify-center text-center pb-2 border-b border-slate-200/60">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-2">
          {t('Route Plan & Segment Analysis')}
        </h1>
        <div className="inline-flex flex-wrap items-center justify-center gap-3 px-5 py-2 rounded-full bg-white border border-slate-200 shadow-2xs font-semibold text-xs sm:text-sm text-slate-900">
          <span className="text-sky-700">Kochi Port (9.93° N, 76.26° E)</span>
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M17 8l4 4m0 0l-4 4m4-4H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
          <span className="text-emerald-700">Lakshadweep Kavaratti (10.56° N, 72.64° E)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Timeline Column (7 cols) matching code.html */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-mono font-bold tracking-widest text-slate-700 uppercase">
              {t('TRANSIT SEGMENTS TIMELINE')}
            </h2>
            <span className="text-xs font-mono text-slate-500">{t('Total Distance: 218 NM')}</span>
          </div>

          <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
            {/* Segment 1 */}
            <div className="relative group">
              <span className="absolute -left-[31px] top-5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-4 ring-white shadow-xs" />
              <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition-all shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {t('Segment 1: Harbour Departure & Channel')}
                    </h3>
                    <p className="text-xs font-mono text-slate-500">06:00 – 08:00 IST • 42 NM</p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                      <path clipRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fillRule="evenodd" />
                    </svg>
                    {t('Favourable')}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">{t('Wave Height')}</span>
                    <span className="text-base font-mono font-bold text-slate-900">0.98 m</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">{t('Wind Speed')}</span>
                    <span className="text-base font-mono font-bold text-slate-900">14.7 km/h</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">{t('Bathymetry')}</span>
                    <span className="text-base font-mono font-bold text-slate-900">12–35 m</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Segment 2 */}
            <div className="relative group">
              <span className="absolute -left-[31px] top-5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-4 ring-white shadow-xs" />
              <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition-all shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {t('Segment 2: Continental Shelf Edge')}
                    </h3>
                    <p className="text-xs font-mono text-slate-500">08:00 – 10:00 IST • 58 NM</p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                      <path clipRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fillRule="evenodd" />
                    </svg>
                    {t('Favourable')}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">{t('Wave Height')}</span>
                    <span className="text-base font-mono font-bold text-slate-900">1.4 m</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">{t('Wind Speed')}</span>
                    <span className="text-base font-mono font-bold text-slate-900">18 km/h</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">{t('Bathymetry')}</span>
                    <span className="text-base font-mono font-bold text-slate-900">200–1,200 m</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Segment 3 (Caution Highlight) */}
            <div className="relative group">
              <span className="absolute -left-[31px] top-5 w-3.5 h-3.5 rounded-full bg-amber-500 ring-4 ring-white shadow-xs" />
              <div className="bg-white border-2 border-amber-400 rounded-2xl p-5 shadow-xs relative">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {t('Segment 3: Deep Offshore Transit Corridor')}
                    </h3>
                    <p className="text-xs font-mono text-slate-500">10:00 – 12:00 IST • 65 NM</p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                    <svg className="w-3 h-3 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                    {t('Caution')}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">{t('Wave Height')}</span>
                    <span className="text-base font-mono font-bold text-amber-600">1.9 m</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">{t('Wind Speed')}</span>
                    <span className="text-base font-mono font-bold text-amber-600">24 km/h</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">{t('Bathymetry')}</span>
                    <span className="text-base font-mono font-bold text-slate-900">1,820 m</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2 text-xs">
                  <span className="flex items-center gap-1 text-amber-800 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                    {t('Elevated swell wave surge')}
                  </span>
                  <span className="flex items-center gap-1 text-amber-800 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                    {t('Cross-sea current interplay')}
                  </span>
                </div>
              </div>
            </div>

            {/* Segment 4 */}
            <div className="relative group">
              <span className="absolute -left-[31px] top-5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-4 ring-white shadow-xs" />
              <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition-all shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {t('Segment 4: Lakshadweep Atoll Approach')}
                    </h3>
                    <p className="text-xs font-mono text-slate-500">12:00 – 14:00 IST • 53 NM</p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                      <path clipRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fillRule="evenodd" />
                    </svg>
                    {t('Favourable')}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">{t('Wave Height')}</span>
                    <span className="text-base font-mono font-bold text-slate-900">1.5 m</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">{t('Wind Speed')}</span>
                    <span className="text-base font-mono font-bold text-slate-900">19 km/h</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">{t('Bathymetry')}</span>
                    <span className="text-base font-mono font-bold text-slate-900">60–120 m</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 text-center">
            <button
              onClick={() => onNavigate && onNavigate('map')}
              className="inline-flex items-center gap-2 font-bold text-sm text-sky-700 hover:text-sky-900 transition-colors"
              type="button"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              {t('Plot Route Waypoints on GIS Nautical Map →')}
            </button>
          </div>
        </div>

        {/* Recommendation Column (5 cols) matching code.html */}
        <div className="lg:col-span-5 space-y-6">
          {/* Tactical Route Recommendation Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-sm mb-2">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              {t('Tactical Route Recommendation')}
            </div>
            <p className="text-sm font-semibold text-slate-800 leading-snug">
              {t(
                'Maintain planned early departure at 06:00 IST to avoid peak afternoon swell window and complete critical passage before mid-day tidal crest.'
              )}
            </p>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                {t('RECOMMENDED DEPARTURE')}
              </span>
              <div className="flex items-center gap-2 font-mono font-bold text-slate-900 text-lg mt-1">
                <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
                {t('06:00 IST (Strict Window)')}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-2">
                {t('RECOMMENDED OPERATOR ACTIONS')}
              </span>
              <ul className="text-xs text-slate-600 space-y-2 font-medium">
                <li className="flex items-start gap-2">
                  <span className="text-sky-500 font-bold">•</span>
                  <span>{t('Review INCOIS OSF segment 3 wave telemetry 30 mins prior to casting off.')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-sky-500 font-bold">•</span>
                  <span>{t('Maintain engine readiness for 1.9m wave compensation during 10:00–12:00.')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-sky-500 font-bold">•</span>
                  <span>{t('Broadcast route notice to Kochi VTS and Kavaratti Port Radio on VHF Ch 16.')}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Why is this route flagged? Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <h3 className="font-bold text-slate-900 text-base mb-3">{t('Why is this route flagged?')}</h3>
            <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-3">
              {t('ASSESSMENT PROCESS')}
            </p>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3 text-xs text-slate-700 font-medium">
                <div className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
                  </svg>
                </div>
                <span>{t('Confirmed origin port, fairway waypoints & vessel hydrodynamics')}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-700 font-medium">
                <div className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
                  </svg>
                </div>
                <span>{t('Partitioned 218 NM into 4 timed operational transit segments')}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-700 font-medium">
                <div className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
                  </svg>
                </div>
                <span>{t('Cross-referenced wave height threshold (>1.8m triggers CAUTION)')}</span>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-2">
                {t('MAIN FINDING')}
              </span>
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 text-xs">
                <p className="font-bold text-amber-900 text-sm mb-1">{t('Segment 3 crosses swell surge corridor')}</p>
                <p className="text-slate-700 leading-relaxed">
                  {t(
                    'Forecast indicates swell reaching 1.9 m with peak wave energy at 11:15 IST. Other 3 segments are rated fully favourable.'
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
