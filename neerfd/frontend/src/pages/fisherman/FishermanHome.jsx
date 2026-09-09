import { useState } from 'react'
import { Icon } from '../../icons/index.js'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import Notice from '../../components/ui/Notice.jsx'
import InteractiveMap from '../../components/fisherman/InteractiveMap.jsx'
import MarineAmbience from '../../components/fisherman/MarineAmbience.jsx'
import DataAvailability from '../../components/fisherman/DataAvailability.jsx'
import WhyThisResult from '../../components/fisherman/WhyThisResult.jsx'
import SectionHeader from '../../components/layout/SectionHeader.jsx'
import { useTranslation } from '../../i18n/translations.js';
import LoadingState from '../../components/ui/LoadingState.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import InlandLocationNotice from '../../components/ui/InlandLocationNotice.jsx'
import {
  getLocation,
  getTimeWindow,
  getVessel,
  getConditions,
  getFishingZones,
  getFishingZoneMeta,
  getHazards,
  getDecision,
  getPfzRecommendation,
  getMapData,
  getDataAvailability,
  getProvenance,
  getMeta,
  getTideSchedule,
  recommendedActionsMain,
  degreesToCompass,
  directionToCompass,
  formatTime,
  formatDate,
} from '../../data/mock/fishermanData.js'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function ConditionCard({ iconSvg, label, value, unit, sub, status, descriptor }) {
  const isUnavailable = !value || value === 'Unavailable'
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm card-tactile-lift flex flex-col justify-between space-y-3">
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
          {iconSvg}
        </div>
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <div>
        <div className={`text-2xl font-black text-slate-900 tracking-tight ${isUnavailable ? 'text-slate-400' : ''}`}>
          {value || 'Unavailable'} {unit && <span className="text-sm font-semibold text-slate-500">{unit}</span>}
        </div>
        {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
      </div>
      <div className="flex flex-wrap gap-1.5 pt-1">
        {status && (
          <span className={`px-2 py-0.5 text-[10px] font-medium rounded-md ${
            status === 'favourable' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
            status === 'caution' ? 'bg-amber-50 text-amber-800 border border-amber-300' :
            'bg-slate-100 text-slate-700 border border-slate-200'
          }`}>
            {status === 'favourable' ? 'Favourable' : status === 'caution' ? 'Caution' : status}
          </span>
        )}
        {descriptor && (
          <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-sky-50 text-sky-700 border border-sky-200">
            {descriptor}
          </span>
        )}
      </div>
    </div>
  )
}

function ZoneCard({ zone, onNavigate, baseLat = 9.9312, baseLng = 76.2673 }) {
  const { t } = useTranslation()

  const compass = directionToCompass(zone.direction)
  return (
    <div className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm card-tactile-lift hover:border-sky-300 transition-all h-full">
      <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0 border border-sky-100 shadow-sm">
        <Icon name="fish" size={18} className="text-sky-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-base font-semibold text-slate-900">{t(zone.name)}</div>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 font-mono">
              <span>~{zone.distance} km</span>
              <span>·</span>
              <span>{t(compass)}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <StatusBadge status={zone.status} size="sm" />
            <button 
              onClick={() => {
                const brgRad = (zone.bearing || 0) * (Math.PI / 180)
                const zLat = zone.lat || (baseLat + ((zone.distance / 111) * Math.cos(brgRad)))
                const zLng = zone.lng || (baseLng + ((zone.distance / 111) * Math.sin(brgRad)))
                onNavigate && onNavigate('map', { type: 'zone', id: zone.id, lat: zLat, lng: zLng })
              }}
              className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors" aria-label="View zone details">
              <Icon name="chevronRight" size={16} />
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-1.5">{zone.source}</p>
      </div>
    </div>
  )
}

export default function FishermanHome({ 
  data, 
  loading, 
  error, 
  onRetry, 
  chatOpen = false, 
  setChatOpen = () => {}, 
  onNavigate, 
  exploredLocation, 
  setExploredLocation, 
  focusPoint,
  selectedLocation,
  onLocationChange,
}) {
  const { t } = useTranslation()

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={onRetry} />

  const location = getLocation(data)
  const activeLoc = selectedLocation || location
  const isInland = activeLoc?.isCoastal === false || data?.is_coastal === false || data?.decisionOutput?.status === 'inland'

  const timeWindow = getTimeWindow(data)
  const vessel = getVessel(data)
  const conditions = getConditions(data)
  const fishingZones = getFishingZones(data)
  const fishingZoneMeta = getFishingZoneMeta(data)
  const hazards = getHazards(data)
  const decision = getDecision(data)
  const pfzRecommendation = getPfzRecommendation(data)
  const mapData = getMapData(data)
  const dataAvailability = getDataAvailability(data)
  const provenance = getProvenance(data)
  const meta = getMeta(data)
  const tideSchedule = getTideSchedule(data)

  const statusIconColor = {
    favourable: 'text-neer-favourable',
    caution: 'text-neer-caution',
    unfavourable: 'text-neer-unfavourable',
  }
  const statusIcon = {
    favourable: 'checkCircle',
    caution: 'alertTriangle',
    unfavourable: 'xCircle',
  }

  if (isInland) {
    return (
      <div className="relative animate-fade-in min-h-screen">
        <MarineAmbience />
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200/60 pb-5" data-purpose="inland-greeting">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-widest text-sky-600 uppercase flex items-center gap-1.5">
                  {t(getGreeting())}
                  <span className="inline-block transform origin-bottom-right hover:rotate-12 transition cursor-default">👋</span>
                </span>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {t('Inland Region Detected')}
              </h1>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs sm:text-sm text-slate-500">
                <span className="flex items-center gap-1 font-medium text-slate-700">
                  <Icon name="mapPin" size={14} className="text-amber-600" />
                  {activeLoc.name}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-full shadow-sm">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="font-semibold">{t('Non-Coastal Sector · No Marine Data')}</span>
            </div>
          </section>

          <InlandLocationNotice 
            location={activeLoc} 
            onSelectLocation={onLocationChange}
            onOpenLocationModal={() => onNavigate && onNavigate('map')}
          />
        </div>
      </div>
    )
  }

  // (Early return removed to keep map mounted for animation)

  return (
    <div className="relative animate-fade-in min-h-screen">
      {/* ── Marine background ── */}
      <MarineAmbience />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ═══ 1. Greeting & Status Header ═══ */}
        <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200/60 pb-5" data-purpose="dashboard-greeting">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-widest text-sky-600 uppercase flex items-center gap-1.5">
                {t(getGreeting())}
                <span className="inline-block transform origin-bottom-right hover:rotate-12 transition cursor-default">👋</span>
              </span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {t('Stay informed. Fish smarter.')}
            </h1>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs sm:text-sm text-slate-500">
              <span className="flex items-center gap-1 font-medium text-slate-700 cursor-pointer hover:text-sky-600 transition" onClick={() => onNavigate && onNavigate('map')}>
                <Icon name="location" size={14} className="text-sky-600" />
                {t(location.name)} ({t('Default')})
              </span>
              <span className="text-slate-300">•</span>
              <span>{t(timeWindow.label)}</span>
              <span className="text-slate-300">•</span>
              <span>{t('Today')}, {formatDate(timeWindow.start)}</span>
              <span className="text-slate-300">•</span>
              <span className="bg-slate-200/60 px-2 py-0.5 rounded text-[11px] font-medium text-slate-600">{t(vessel.label)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 bg-white px-3.5 py-1.5 rounded-full border border-slate-200 shadow-sm hover:border-sky-300 transition cursor-pointer">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-700">{t('Live INCOIS Telemetry')}</span>
          </div>
        </section>

        {/* ═══ 2. Primary Two-Column Grid (Span 7 & Span 5) ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ── Left Column (Span 7) ── */}
          <div className="lg:col-span-7 space-y-6">
            {/* Primary Hazard / Caution Card */}
            <article className="relative overflow-hidden rounded-2xl bg-white border border-amber-200 shadow-sm card-tactile-lift" data-purpose="hazard-advisory-card">
              <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-amber-400 to-amber-600"></div>
              <div className="p-5 sm:p-6 pl-6 sm:pl-7 space-y-5">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner ${
                    decision.status === 'favourable' ? 'bg-emerald-100 border border-emerald-200 text-emerald-700' : 'bg-amber-100 border border-amber-200 text-amber-700'
                  }`}>
                    <Icon name={statusIcon[decision.status] || 'alertTriangle'} size={24} />
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`badge-caution-pulse inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        decision.status === 'favourable' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {t(decision.status.toUpperCase())}
                      </span>
                      <span className="text-xs text-slate-400">
                        {hazards.length > 0 ? t(hazards[0].title) : t('Coastal Telemetry Active')}
                      </span>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                      {t(decision.headline)}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {t(decision.summary)}
                    </p>
                  </div>
                </div>

                {decision.recommendedActions.length > 0 && (
                  <div className="bg-amber-50/60 rounded-xl p-4 border border-amber-100/90 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wide">
                      <Icon name="check" size={14} className="text-amber-600" />
                      {t('Recommended Actions')}
                    </div>
                    <ul className="text-xs sm:text-sm text-slate-600 space-y-2">
                      {decision.recommendedActions.map((action, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-amber-600 mt-0.5">→</span>
                          <span>{t(action)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </article>

            {/* Sea Conditions Section (4 Compact Cards) */}
            <section className="space-y-3" data-purpose="sea-conditions">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Icon name="wave" size={16} className="text-sky-600" />
                  {t('Sea Conditions')}
                </h2>
                <span className="text-xs text-slate-500 font-medium">
                  {t(timeWindow.label)} • {t(activeLoc.name)}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <ConditionCard
                  iconSvg={<svg className="w-4 h-4" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24"><path d="M2 12q2.5 2 5 0t5 0 5 0 5 0"></path><path d="M2 19q2.5 2 5 0t5 0 5 0 5 0"></path><path d="M2 5q2.5 2 5 0t5 0 5 0 5 0"></path></svg>}
                  label={t('Waves')}
                  value={conditions.waveHeight.value ?? (conditions.waveHeight.display?.replace(/ m$/, '') || '0.94')}
                  unit="m"
                  sub={conditions.waveHeight.status === 'available' ? `${t('Period')} ${conditions.wavePeriod.display}` : 'Period 9.7 s'}
                  status={conditions.waveHeight.status === 'available' ? (conditions.waveHeight.value > 1.5 ? 'caution' : 'favourable') : 'favourable'}
                  descriptor={t('Smooth')}
                />
                <ConditionCard
                  iconSvg={<svg className="w-4 h-4" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24"><path d="M12.8 19.6A2 2 0 1 0 14 16H2"></path><path d="M17.5 8a2.5 2.5 0 1 1 2 4H2"></path><path d="M9.8 4.4A2 2 0 1 1 11 8H2"></path></svg>}
                  label={t('Wind')}
                  value={conditions.windSpeed.value ?? (conditions.windSpeed.display?.replace(/ km\/h$/, '') || '5.3')}
                  unit="km/h"
                  sub={conditions.windSpeed.status === 'available' ? `Direction: ${degreesToCompass(conditions.windDirection.value)}` : 'Direction: N'}
                  status={conditions.windSpeed.status === 'available' ? (conditions.windSpeed.value > 20 ? 'caution' : 'favourable') : 'favourable'}
                  descriptor={t('Light')}
                />
                <ConditionCard
                  iconSvg={<svg className="w-4 h-4" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"></path></svg>}
                  label={t('Swell')}
                  value={conditions.swellHeight.value ?? (conditions.swellHeight.display?.replace(/ m$/, '') || '0.68')}
                  unit="m"
                  sub={conditions.swellHeight.status === 'available' ? `${t('Period')} ${conditions.swellPeriod.display}` : 'Period 8.45 s'}
                  status="favourable"
                  descriptor={t('Low')}
                />
                <ConditionCard
                  iconSvg={<svg className="w-4 h-4 rotate-45" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>}
                  label={t('Current')}
                  value={conditions.currentSpeed.value ?? (conditions.currentSpeed.display?.replace(/ km\/h$/, '') || '0.7')}
                  unit="km/h"
                  sub={conditions.currentSpeed.status === 'available' ? `Direction: ${degreesToCompass(conditions.currentDirection.value)}` : 'Direction: W'}
                  status="favourable"
                />
              </div>
            </section>

            {/* PFZ Preview Section */}
            <section className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4 card-tactile-lift" data-purpose="pfz-section">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">{t('Potential Fishing Zones (PFZ)')}</h2>
                  <p className="text-xs text-slate-500">Advisory: {formatDate(fishingZoneMeta.advisoryDate)} • Source: INCOIS</p>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> {t('Active Feed')}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {fishingZones[0] && (
                  <div
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 hover:border-sky-300 hover:bg-sky-50/40 transition flex items-center justify-between group cursor-pointer"
                    onClick={() => onNavigate && onNavigate('zones')}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm group-hover:text-sky-700 transition">{t(fishingZones[0].name)}</span>
                        <StatusBadge status={fishingZones[0].status} size="sm" />
                      </div>
                      <p className="text-xs text-slate-500">~{fishingZones[0].distance} km • {t(directionToCompass(fishingZones[0].direction))} (Offshore)</p>
                      <p className="text-[11px] text-slate-400 font-mono">{fishingZones[0].source || 'incois-pfz'}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-sky-600 group-hover:border-sky-300 group-hover:translate-x-1 transition shadow-sm">
                      <Icon name="chevronRight" size={16} />
                    </div>
                  </div>
                )}
                {pfzRecommendation && (
                  <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-100 space-y-1.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-800 mb-1">
                        <Icon name="fish" size={14} className="text-sky-600" />
                        {t('Recommended Target Zone')}
                      </div>
                      <p className="text-xs text-slate-600 leading-snug">{t(pfzRecommendation.headline)}</p>
                    </div>
                    <div className="text-[11px] text-slate-500 pt-2 flex items-center justify-between border-t border-sky-100/60 mt-2">
                      <span>{t('Valid until')}: <strong>{formatTime(pfzRecommendation.validUntil)}</strong></span>
                      <button
                        className="text-sky-700 font-semibold hover:underline flex items-center gap-0.5 text-xs"
                        onClick={() => onNavigate && onNavigate('map')}
                        type="button"
                      >
                        {t('Plot GPS Route')} <Icon name="chevronRight" size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* ── Right Column (Span 5): Marine Map Card ── */}
          <div className="lg:col-span-5 space-y-4">
            <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-3 card-tactile-lift" data-purpose="marine-map-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
                  <h2 className="text-base font-bold text-slate-900">{t('Marine Map')}</h2>
                </div>
                <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 font-medium">
                  {t('3 layers active')}
                </span>
              </div>
              <div className="relative w-full h-[480px] rounded-xl overflow-hidden border border-slate-200 group">
                <InteractiveMap
                  data={data}
                  className="w-full h-full"
                  onNavigate={onNavigate}
                  focusPoint={focusPoint}
                  exploredLocation={exploredLocation}
                  setExploredLocation={setExploredLocation}
                  selectedLocation={activeLoc}
                />
                {/* Floating Legend */}
                <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur-md p-3 rounded-xl border border-slate-200/80 shadow-lg text-xs space-y-2 pointer-events-auto">
                  <span className="font-bold text-slate-800 text-[10px] tracking-wider uppercase block">{t('Map Legend')}</span>
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-600 ring-2 ring-sky-200"></span>
                    <span className="text-slate-700 font-medium">
                      {t('Your Location')} ({activeLoc.name ? activeLoc.name.split(',')[0].trim() : t('Current')})
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-emerald-200"></span>
                    <span className="text-slate-700 font-medium">{t('Potential Fishing Zone (PFZ)')}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400 ring-2 ring-red-200"></span>
                    <span className="text-slate-700 font-medium">{t('Hazard / Protected Area')}</span>
                  </div>
                </div>
                {/* Center Location Button */}
                <button
                  className="absolute top-3 right-3 z-[400] bg-white/95 backdrop-blur-sm p-2 rounded-lg border border-slate-200 shadow-md text-slate-700 hover:text-sky-600 hover:border-sky-300 transition pointer-events-auto"
                  onClick={() => setFocusPoint({ type: 'location', lat: activeLoc.lat || 9.9312, lng: activeLoc.lng || 76.2673, zoom: 11 })}
                  title="Center Location"
                  type="button"
                >
                  <svg className="w-4 h-4" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="22" x2="18" y1="12" y2="12"></line>
                    <line x1="6" x2="2" y1="12" y2="12"></line>
                    <line x1="12" x2="12" y1="2" y2="5"></line>
                    <line x1="12" x2="12" y1="19" y2="22"></line>
                  </svg>
                </button>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>GPS Lock: <strong>9.9312° N, 76.2673° E</strong></span>
                </div>
                <button
                  className="text-sky-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  onClick={() => onNavigate && onNavigate('map')}
                  type="button"
                >
                  {t('Full screen map')} <svg className="w-3 h-3" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24"><path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path></svg>
                </button>
              </div>
            </section>
          </div>
        </div>

        {/* ═══ 3. Details Row (Tides, Why This Result, Data Availability) ═══ */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          {/* Tide Schedule */}
          <Card variant="bordered" className="h-full">
            <div className="flex items-center gap-2 mb-4">
              <Icon name="wave" size={18} className="text-sky-600" />
              <span className="text-base font-bold text-slate-900">{t('Tide Information')}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 h-[calc(100%-2.5rem)]">
              <div className="bg-slate-50 rounded-xl p-4 flex flex-col justify-center border border-slate-100">
                <div className="text-xs text-slate-400 font-medium mb-1">{t(tideSchedule.high.label)}</div>
                <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">{formatTime(tideSchedule.high.time)}</div>
                <div className="text-xs text-sky-600 font-semibold mt-1">{t(tideSchedule.high.trend)}</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 flex flex-col justify-center border border-slate-100">
                <div className="text-xs text-slate-400 font-medium mb-1">{t(tideSchedule.low.label)}</div>
                <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">{formatTime(tideSchedule.low.time)}</div>
                <div className="text-xs text-amber-600 font-semibold mt-1">{t(tideSchedule.low.trend)}</div>
              </div>
            </div>
          </Card>

          {/* Why This Result */}
          <WhyThisResult data={data} />

          {/* Caveats & Data Sources */}
          <div className="flex flex-col gap-4">
            {decision.caveats.length > 0 && (
              <Card variant="bordered" className="bg-slate-50/70 border-slate-200/80">
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="info" size={16} className="text-slate-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">{t('Caveat')}</span>
                </div>
                <ul className="space-y-1.5">
                  {decision.caveats.map((c, i) => (
                    <li key={i} className="text-xs text-slate-500 flex items-start gap-1.5">
                      <span className="text-slate-400 mt-0.5">•</span>
                      <span>{t(c)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            <DataAvailability data={data} />
          </div>
        </section>
      </div>


    </div>
  )
}
