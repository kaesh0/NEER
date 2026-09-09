import React from 'react'
import { useTranslation } from '../../i18n/translations.js'
import LoadingState from '../../components/ui/LoadingState.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import InlandLocationNotice from '../../components/ui/InlandLocationNotice.jsx'
import AuthorityInteractiveMap from '../../components/authority/AuthorityInteractiveMap.jsx'
import {
  getRequest,
  getTimeWindow,
  getDecision,
  getAreaPriorities,
  getExplainability,
  getProvenance,
} from '../../data/mock/authorityData.js'

export default function AuthorityHome({ data, loading, error, onRetry, onNavigate, selectedLocation, onLocationChange }) {
  const { t } = useTranslation()

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={onRetry} />

  const request = getRequest(data)
  const timeWindow = getTimeWindow(data)
  const decision = getDecision(data)
  const explainability = getExplainability(data)
  const provenance = getProvenance(data)

  const activeLoc = selectedLocation || { name: request?.geometry?.label || 'Kochi, Kerala coast' }
  const isInland = activeLoc?.isCoastal === false || data?.is_coastal === false || decision?.status === 'inland'

  if (isInland) {
    return (
      <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-8 pb-12 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 mb-1 block">
              {t('Regional Risk & Coastal Monitoring')}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {activeLoc.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-2">
              {t('Inland Sector · Marine & Port Monitoring Inactive')}
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
          location={activeLoc} 
          onSelectLocation={onLocationChange}
          onOpenLocationModal={() => onNavigate && onNavigate('map')}
        />
      </div>
    )
  }

  return (
    <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-8 pb-12 animate-fade-in">
      {/* Overview Header matching code.html */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 mb-1 block">
            {t('Regional Risk & Coastal Monitoring')}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {t('Regional Overview')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-2">
            {t(activeLoc.name)} · {t(timeWindow?.label || 'next available forecast window')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {t('Advisory System Active')}
          </span>
        </div>
      </div>

      {/* Priority Headline Alert Banner matching code.html */}
      <div className="bg-white border-l-4 border-l-amber-500 border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 text-amber-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </div>
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('Status')}</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                {t(decision?.status || 'Caution')}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 leading-snug">
              {t(decision?.headline || `${activeLoc.name} is the priority area for next available forecast window.`)}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              {t(decision?.summary || `Regional assessment status for ${activeLoc.name}: favourable. All marine parameters are within standard operating limits.`)}
            </p>
          </div>
        </div>
      </div>

      {/* Two-Column Primary Layout (Actions/Analysis & Map Preview) matching code.html */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Recommended Actions & Why This Assessment */}
        <div className="lg:col-span-7 space-y-6">
          {/* Recommended Actions Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:translate-y-[-1px] transition-transform">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              <h3 className="text-base font-bold text-slate-900">{t('Recommended Actions')}</h3>
            </div>
            <ul className="space-y-2.5 text-sm text-slate-600">
              {(decision?.recommendedActions || [
                'Prioritize outreach to small-vessel operators in the flagged area.',
                'Review the generated warning draft below before any dissemination decision.',
              ]).map((action, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="text-slate-400 mt-2">→</span>
                  <span>{t(action)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Why this assessment? Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              <h3 className="text-base font-bold text-slate-900">{t('Why this assessment?')}</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {t(explainability?.summary || `For ${activeLoc.name} (forecast for next window), the marine assessment is caution: proceed only with caution and check official local advisories. Current coastal telemetry indicates conditions require vigilance. Small fishing vessels and coastal operators are advised to review local port authority notices before departure.`)}
            </p>
            {/* Risk Rule Triggered Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2 mt-4">
              <h4 className="font-bold text-slate-800 text-sm">{t('Risk rule triggered')}</h4>
              <div>
                <span className="font-semibold text-slate-700">{t('Observation:')}</span>
                <span className="text-slate-600">
                  {' '}
                  {t(explainability?.findings?.[0]?.observation || 'Coastal sector alert telemetry active for selected jurisdiction.')}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-700">{t('Impact:')}</span>
                <span className="text-slate-600">
                  {' '}
                  {t(explainability?.findings?.[0]?.impact || 'Contributed to the final assessment.')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Priority Map Preview & Data Sources */}
        <div className="lg:col-span-5 space-y-6">
          {/* Regional Priority Map Preview Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">{t('Regional Priority Map')}</h3>
              <button
                onClick={() => onNavigate && onNavigate('map')}
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 inline-flex items-center gap-1 transition"
                type="button"
              >
                {t('Expand →')}
              </button>
            </div>
            <div className="relative h-[320px] w-full bg-slate-100">
              <AuthorityInteractiveMap data={data} height="320px" onNavigate={onNavigate} selectedLocation={activeLoc} />
            </div>
          </div>

          {/* Data Sources & Status Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">{t('Data Sources & Status')}</h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{t('Weather')}</span>
                <span className="inline-flex items-center justify-center w-full py-1.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                  {provenance?.availability?.weather || 'live'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{t('Hazards')}</span>
                <span className="inline-flex items-center justify-center w-full py-1.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                  {provenance?.availability?.hazards || 'live'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">SST</span>
                <span className={`inline-flex items-center justify-center w-full py-1.5 rounded-md font-medium ${
                  provenance?.availability?.sst === 'live'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold'
                    : 'bg-slate-100 text-slate-500 border border-slate-200 shimmer-active'
                }`}>
                  {provenance?.availability?.sst === 'live' ? 'live' : 'Unavailable'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{t('Currents')}</span>
                <span className={`inline-flex items-center justify-center w-full py-1.5 rounded-md font-medium ${
                  provenance?.availability?.currents === 'live'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold'
                    : 'bg-slate-100 text-slate-500 border border-slate-200 shimmer-active'
                }`}>
                  {provenance?.availability?.currents === 'live' ? 'live' : 'Unavailable'}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">
              {t('Satellite data was available for this analysis.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
