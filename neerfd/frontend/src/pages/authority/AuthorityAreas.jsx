import React, { useState, useEffect } from 'react'
import LoadingState from '../../components/ui/LoadingState.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import InlandLocationNotice from '../../components/ui/InlandLocationNotice.jsx'
import { getAreaPriorities, getRegions, getStatusColor, getStatusBg } from '../../data/mock/authorityData.js'
import { useTranslation } from '../../i18n/translations.js'

export default function AuthorityAreas({ data, loading, error, onRetry, focusPoint, setFocusPoint, onNavigate, selectedLocation, onLocationChange }) {
  const { t } = useTranslation()
  const [selectedAreaId, setSelectedAreaId] = useState(null)

  useEffect(() => {
    if (focusPoint && focusPoint.type === 'area' && focusPoint.id) {
      setSelectedAreaId(focusPoint.id)
    }
  }, [focusPoint])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={onRetry} />

  const isInland = selectedLocation?.isCoastal === false || data?.is_coastal === false || data?.decisionOutput?.status === 'inland'

  if (isInland) {
    return (
      <div className="space-y-6 pb-12 animate-fade-in">
        <div className="space-y-1 pb-2 border-b border-slate-200/60">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">{t('Regional Priority Analysis')}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">{t('Inland Administrative Sector')}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {t('Coastal Priority Index Inactive')}
          </h1>
          <p className="text-sm font-medium text-slate-500">
            {selectedLocation?.name || t('This area')} {t('is located inland. Coastal patrol corridors and harbour safety indexes are inactive for inland zones.')}
          </p>
        </div>

        <InlandLocationNotice 
          location={selectedLocation} 
          onSelectLocation={onLocationChange}
          onOpenLocationModal={() => onNavigate && onNavigate('map')}
        />
      </div>
    )
  }

  const areaPriorities = getAreaPriorities(data)
  const regions = getRegions(data)
  const currentAreaId = selectedAreaId || (areaPriorities.length > 0 ? areaPriorities[0].areaId : 'coastal-sector')

  const selectedArea = areaPriorities.find((a) => a.areaId === currentAreaId) || areaPriorities[0] || {
    areaId: 'coastal-sector',
    label: selectedLocation?.name || 'Coastal Sector',
    status: 'favourable',
    priority: 'medium',
    reasons: ['Regional coastal telemetry is active.'],
    hazardIds: [],
  }

  const regionDetails = regions.find((r) => r.id === currentAreaId) || {
    conditions: {
      waveHeight: { value: 0.98, unit: 'm' },
      windSpeed: { value: 14.7, unit: 'km/h' },
    },
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Section Header matching code.html */}
      <div className="space-y-1 pb-2 border-b border-slate-200/60">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {t('Regional Priority Analysis')}
        </h1>
        <p className="text-sm font-medium text-slate-500">
          {t('Detailed area assessments')}
        </p>
      </div>

      {/* Master-Detail Layout matching code.html */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Areas List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          {areaPriorities.map((area) => {
            const isSelected = area.areaId === currentAreaId
            return (
              <div
                key={area.areaId}
                onClick={() => setSelectedAreaId(area.areaId)}
                className={`rounded-2xl p-5 transition cursor-pointer ${
                  isSelected
                    ? 'bg-white border-2 border-sky-500 shadow-sm relative'
                    : 'bg-slate-50 border border-slate-200/80 opacity-75 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`text-base ${isSelected ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>
                    {t(area.label)}
                  </h3>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                      area.status === 'caution'
                        ? 'bg-amber-100 text-amber-700 border-amber-200'
                        : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {t(area.status === 'caution' ? 'Caution' : 'Normal')}
                  </span>
                </div>
                <p
                  className={`text-xs font-bold tracking-wide uppercase mb-1 ${
                    area.priority === 'high'
                      ? 'text-rose-600'
                      : area.priority === 'medium'
                      ? 'text-amber-600'
                      : 'text-slate-500'
                  }`}
                >
                  {t(area.priority)} {t('Priority')}
                </p>
                <p className="text-xs text-slate-500">
                  {(area.reasons || []).length} {t((area.reasons || []).length !== 1 ? 'risk factors' : 'risk factor')}
                </p>
              </div>
            )
          })}
        </div>

        {/* Right: Detail View Pane (8 cols) matching code.html */}
        <div
          className={`lg:col-span-8 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6 border-t-4 ${
            selectedArea.status === 'caution' ? 'border-t-amber-500' : 'border-t-emerald-500'
          }`}
        >
          {/* Detail Title Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{t(selectedArea.label)}</h2>
              <div className="flex items-center gap-2 mt-1.5">
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${
                    selectedArea.priority === 'high'
                      ? 'text-rose-600'
                      : selectedArea.priority === 'medium'
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }`}
                >
                  {t(selectedArea.priority)} {t('Priority')}
                </span>
                <span className="text-slate-300">•</span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                    selectedArea.status === 'caution'
                      ? 'bg-amber-100 text-amber-700 border-amber-200'
                      : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {t(selectedArea.status === 'caution' ? 'Caution' : 'Normal')}
                </span>
              </div>
            </div>

            <button
              onClick={() => onNavigate && onNavigate('map', { type: 'area', id: selectedArea.areaId, lat: 9.9312, lng: 76.2673 })}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-lg transition border border-sky-200"
              type="button"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              {t('View on Map')}
            </button>
          </div>

          {/* Forecast Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-5 space-y-1.5">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold tracking-wider uppercase">
                <svg className="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
                {t('Forecast Wave')}
              </div>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {regionDetails?.conditions?.waveHeight?.value ?? '0.98'} {regionDetails?.conditions?.waveHeight?.unit ?? 'm'}
              </div>
            </div>

            <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-5 space-y-1.5">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold tracking-wider uppercase">
                <svg className="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
                {t('Forecast Wind')}
              </div>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {regionDetails?.conditions?.windSpeed?.value ?? '14.7'} {regionDetails?.conditions?.windSpeed?.unit ?? 'km/h'}
              </div>
            </div>
          </div>

          {/* Risk Factors & Reasons */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              {t('Risk Factors & Reasons')}
            </div>
            <div className="space-y-2.5">
              {(selectedArea.reasons || []).map((r, i) => (
                <div key={i} className="flex items-start gap-3 p-3.5 bg-amber-50/60 border border-amber-200/70 rounded-xl text-xs sm:text-sm text-slate-700">
                  <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                  <span>{t(r)}</span>
                </div>
              ))}
              {(!selectedArea.reasons || selectedArea.reasons.length === 0) && (
                <div className="p-3.5 bg-emerald-50/60 border border-emerald-200/70 rounded-xl text-xs sm:text-sm text-emerald-800">
                  {t('Conditions within normal parameters for small vessel navigation.')}
                </div>
              )}
            </div>
          </div>

          {/* Active Hazards Box */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              {t('Active Hazards')}
            </div>
            <div className="flex items-center justify-between p-4 bg-amber-50/40 border border-amber-200 rounded-xl">
              <span className="font-mono text-sm font-semibold text-amber-900">
                {selectedArea.hazardIds?.[0] || 'restricted-zone'}
              </span>
              <button
                onClick={() => onNavigate && onNavigate('alerts')}
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline"
                type="button"
              >
                {t('View Warning Draft')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
