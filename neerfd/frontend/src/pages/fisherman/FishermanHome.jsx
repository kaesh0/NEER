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

function ConditionCard({ icon, label, value, sub, status, descriptor }) {
  const isUnavailable = !value || value === 'Unavailable'
  return (
    <div className="flex items-start gap-3 p-4 bg-white rounded-[0.875rem] border border-neer-border">
      <div className="w-10 h-10 rounded-full bg-neer-ocean-50 flex items-center justify-center flex-shrink-0">
        <Icon name={icon} size={18} className="text-neer-ocean-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-neer-xs font-medium text-neer-ink-secondary mb-0.5">{label}</div>
        <div className={`text-2xl font-bold tracking-tight tabular-nums ${isUnavailable ? 'text-neer-ink-muted' : 'text-neer-ink'}`}>
          {value || 'Unavailable'}
        </div>
        {sub && <div className="text-neer-xs text-neer-ink-muted mt-1">{sub}</div>}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {status && <StatusBadge status={status} size="sm" />}
          {descriptor && <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-neer-xs font-medium ${
            isUnavailable ? 'bg-neer-surface-sunken text-neer-ink-muted' : 'bg-neer-ocean-50 text-neer-ocean-700'
          }`}>
            {descriptor}
          </span>}
        </div>
      </div>
    </div>
  )
}

function ZoneCard({ zone, onNavigate }) {
  const { t } = useTranslation()

  const compass = directionToCompass(zone.direction)
  return (
    <div className="flex items-start gap-3 p-4 bg-white rounded-[0.875rem] border border-neer-border hover:shadow-neer-sm transition-all h-full">
      <div className="w-10 h-10 rounded-full bg-neer-ocean-50 flex items-center justify-center flex-shrink-0">
        <Icon name="fish" size={18} className="text-neer-ocean-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-neer-md font-semibold text-neer-ink">{t(zone.name)}</div>
            <div className="flex items-center gap-1.5 mt-0.5 text-neer-xs text-neer-ink-muted">
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
                const zLat = 9.9312 + ((zone.distance / 111) * Math.cos(brgRad))
                const zLng = 76.2673 + ((zone.distance / 111) * Math.sin(brgRad))
                onNavigate && onNavigate('map', { type: 'zone', id: zone.id, lat: zLat, lng: zLng })
              }}
              className="w-8 h-8 flex items-center justify-center rounded-full text-neer-ink-muted hover:text-neer-ocean-600 hover:bg-neer-ocean-50 transition-colors" aria-label="View zone details">
              <Icon name="chevronRight" size={16} />
            </button>
          </div>
        </div>
        <p className="text-neer-xs text-neer-ink-muted mt-1.5">{zone.source}</p>
      </div>
    </div>
  )
}

export default function FishermanHome({ data, loading, error, onRetry, chatOpen = false, setChatOpen = () => {}, onNavigate, exploredLocation, setExploredLocation, focusPoint }) {
  const { t } = useTranslation()

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={onRetry} />

  const location = getLocation(data)
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

  // (Early return removed to keep map mounted for animation)

  return (
    <div className="relative animate-fade-in min-h-screen">
      {/* ── Marine background ── */}
      <MarineAmbience />

      {/* Explored Location overlay moved to FishermanMap */}

      <div className={`relative z-10 w-full transition-opacity duration-300`}>
        {/* ═══ Welcome / Location ═══ */}
        <section className="mb-8">
          <div className="text-neer-xs font-semibold tracking-[0.06em] uppercase text-neer-ocean-600 mb-1">
            {t(getGreeting())} 👋
          </div>
          <h1 className="text-neer-2xl md:text-3xl lg:text-4xl font-bold text-neer-ink">
            {t('Stay informed. Fish smarter.')}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-3 text-neer-sm text-neer-ink-secondary">
            <Icon name="location" size={16} className="text-neer-ocean-600" />
            <span className="font-medium">{t(location.name)} ({t('Default')})</span>
            <span className="text-neer-ink-muted">·</span>
            <span>{t(timeWindow.label)}</span>
            <span className="hidden md:inline text-neer-ink-muted">·</span>
            <span className="hidden md:inline">{t('Today')} · {formatDate(timeWindow.start)}</span>
            <span className="hidden md:inline text-neer-ink-muted">·</span>
            <span className="hidden md:inline">{t(vessel.label)}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-neer-xs text-neer-ink-muted md:hidden">
            <Icon name="calendar" size={14} />
            <span>{t('Today')} · {formatDate(timeWindow.start)}</span>
            <span className="text-neer-ink-muted">·</span>
            <span>{t(vessel.label)}</span>
          </div>
        </section>

        {/* ═══ Top Section Grid (Decision & Map) ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Primary Decision Status */}
            <Card variant="bordered" className={`bg-white border-l-[4px] shadow-neer-sm transition-all hover:-translate-y-0.5 ${decision.status === 'favourable' ? 'border-l-neer-favourable' : decision.status === 'caution' ? 'border-l-neer-caution' : 'border-l-neer-unfavourable'}`}>
              <div className="flex items-start gap-4 p-5 md:p-6">
                <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center flex-shrink-0 ${decision.status === 'favourable' ? 'bg-neer-favourable/15' : decision.status === 'caution' ? 'bg-neer-caution/15' : 'bg-neer-unavailable/15'}`}>
                  <Icon name={statusIcon[decision.status] || 'xCircle'} size={32} className={decision.status === 'favourable' ? 'text-neer-favourable' : decision.status === 'caution' ? 'text-neer-caution' : 'text-neer-unavailable'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <StatusBadge status={decision.status} />
                  </div>
                  <p className="text-lg md:text-xl font-bold text-neer-ink">{t(decision.headline)}</p>
                  <p className="text-neer-base text-neer-ink-secondary mt-1">{t(decision.summary)}</p>
                </div>
              </div>
            </Card>

            {/* Recommended Actions */}
            {decision.recommendedActions.length > 0 && (
              <Card variant="bordered" className="bg-neer-ocean-50/50 transition-all hover:shadow-neer-md">
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="info" size={18} className="text-neer-ocean-600" />
                  <span className="text-neer-base font-semibold text-neer-ink">{t('Recommended Actions')}</span>
                </div>
                <ul className="space-y-2">
                  {decision.recommendedActions.map((action, i) => (
                    <li key={i} className="flex items-start gap-2 text-neer-sm md:text-neer-base text-neer-ink-secondary">
                      <span className="text-neer-ocean-600 mt-0.5">→</span>
                      <span>{t(action)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
          
          <div className="lg:col-span-1 h-full min-h-[300px] cursor-pointer group" onClick={() => onNavigate && onNavigate('map')}>
            <div className="flex items-center justify-between">
              <SectionHeader title={t('Marine Map')} />
              <Icon name="chevronRight" size={16} className="text-neer-ocean-600 opacity-0 group-hover:opacity-100 transition-opacity translate-y-[-8px]" />
            </div>
            <div className="h-[calc(100%-2rem)] transition-all group-hover:shadow-neer-md rounded-[0.875rem]">
              {/* Replacing placeholder with the real map */}
              <InteractiveMap data={data} className="pointer-events-none" onNavigate={onNavigate} focusPoint={focusPoint} exploredLocation={exploredLocation} setExploredLocation={setExploredLocation} />
            </div>
          </div>
        </div>
        {/* ═══ Sea Conditions ═══ */}
        <section className="mb-8">
          <SectionHeader title={t('Sea Conditions')} subtitle={`${t(timeWindow.label)} · ${t(location.name)}`} />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-4 md:gap-6">
            <ConditionCard
              icon="wave"
              label={t('Waves')}
              value={conditions.waveHeight.display}
              sub={conditions.waveHeight.status === 'available' ? `${t('Period')} ${conditions.wavePeriod.display}` : null}
              status={conditions.waveHeight.status === 'available' ? (conditions.waveHeight.value > 1.5 ? 'caution' : 'favourable') : 'unavailable'}
              descriptor={conditions.waveHeight.status === 'available' ? (conditions.waveHeight.value <= 1 ? t('Smooth') : conditions.waveHeight.value <= 1.5 ? t('Moderate') : t('Rough')) : undefined}
            />
            <ConditionCard
              icon="wind"
              label={t('Wind')}
              value={conditions.windSpeed.display}
              sub={conditions.windSpeed.status === 'available' ? degreesToCompass(conditions.windDirection.value) : null}
              status={conditions.windSpeed.status === 'available' ? (conditions.windSpeed.value > 20 ? 'caution' : 'favourable') : 'unavailable'}
              descriptor={conditions.windSpeed.status === 'available' ? (conditions.windSpeed.value < 15 ? t('Light') : conditions.windSpeed.value < 25 ? t('Moderate') : t('Fresh')) : undefined}
            />
            <ConditionCard
              icon="sun"
              label={t('Swell')}
              value={conditions.swellHeight.display}
              sub={conditions.swellHeight.status === 'available' ? `${t('Period')} ${conditions.swellPeriod.display}` : null}
              status={conditions.swellHeight.status === 'available' ? 'favourable' : 'unavailable'}
              descriptor={conditions.swellHeight.status === 'available' ? t('Low') : undefined}
            />
            <ConditionCard
              icon="waves"
              label={t('Current')}
              value={conditions.currentSpeed.display}
              sub={conditions.currentSpeed.status === 'available' ? degreesToCompass(conditions.currentDirection.value) : null}
              status={conditions.currentSpeed.status === 'available' ? 'favourable' : 'unavailable'}
              descriptor={undefined}
            />
          </div>
        </section>

        {/* ═══ Hazard Advisory ═══ */}
        {hazards.length > 0 && (
          <section className="mb-8">
            <div className="flex items-start gap-4 p-5 bg-neer-caution/10 rounded-2xl border border-neer-caution-border">
              <div className="w-12 h-12 rounded-full bg-neer-caution/15 flex items-center justify-center flex-shrink-0">
                <Icon name="alertTriangle" size={24} className="text-neer-caution" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                  <div className="flex items-center gap-3">
                    <StatusBadge status="caution" />
                    <span className="text-neer-base font-bold text-neer-ink">{t(hazards[0].title)}</span>
                  </div>
                </div>
                <p className="text-neer-base text-neer-ink-secondary">{t(hazards[0].message)}</p>
              </div>
            </div>
          </section>
        )}

        {/* ═══ Fishing Zones ═══ */}
        <section className="mb-8">
          <SectionHeader
            title={t('Potential Fishing Zones')}
            subtitle={`Advisory: ${formatDate(fishingZoneMeta.advisoryDate)}`}
            badge={<StatusBadge status={fishingZoneMeta.status === 'available' ? 'favourable' : 'unavailable'} size="sm" />}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {fishingZones.map((zone) => (
              <ZoneCard key={zone.id} zone={zone} onNavigate={onNavigate} />
            ))}
            {pfzRecommendation && (
              <div className="md:col-span-2 lg:col-span-1 xl:col-span-2 h-full cursor-pointer" onClick={() => onNavigate && onNavigate('zones')}>
                <Card variant="bordered" className="bg-neer-ocean-50/50 h-full flex flex-col justify-center hover:shadow-neer-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="fish" size={16} className="text-neer-ocean-600" />
                    <span className="text-neer-base font-semibold text-neer-ink">{t('Recommended Zone')}</span>
                  </div>
                  <p className="text-neer-sm text-neer-ink-secondary">{t(pfzRecommendation.headline)}</p>
                  <div className="flex items-center gap-3 mt-3 text-neer-xs text-neer-ink-muted">
                    <span>{t('Valid Until')}: {formatTime(pfzRecommendation.validUntil)}</span>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </section>

        {/* ═══ Details Grid ═══ */}
        <section className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tide Schedule */}
              <Card variant="bordered" className="h-full">
                <div className="flex items-center gap-2 mb-4">
                  <Icon name="wave" size={18} className="text-neer-ocean-600" />
                  <span className="text-neer-base font-semibold text-neer-ink">{t('Tide Information')}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 h-[calc(100%-2.5rem)]">
                  <div className="bg-neer-surface-alt rounded-xl p-4 flex flex-col justify-center">
                    <div className="text-neer-xs text-neer-ink-muted mb-1.5">{t(tideSchedule.high.label)}</div>
                    <div className="text-2xl font-bold text-neer-ink tabular-nums">{formatTime(tideSchedule.high.time)}</div>
                    <div className="text-neer-sm text-neer-ocean-600 font-medium mt-1">{t(tideSchedule.high.trend)}</div>
                  </div>
                  <div className="bg-neer-surface-alt rounded-xl p-4 flex flex-col justify-center">
                    <div className="text-neer-xs text-neer-ink-muted mb-1.5">{t(tideSchedule.low.label)}</div>
                    <div className="text-2xl font-bold text-neer-ink tabular-nums">{formatTime(tideSchedule.low.time)}</div>
                    <div className="text-neer-sm text-neer-caution font-medium mt-1">{t(tideSchedule.low.trend)}</div>
                  </div>
                </div>
              </Card>

              {/* Assessment Reasons */}
              <div className="flex flex-col h-full">
                <WhyThisResult data={data} />
              </div>
            </div>

            {/* Caveats & Data Sources */}
            <div className="flex flex-col gap-6">
              {decision.caveats.length > 0 && (
                <Card variant="bordered" className="bg-neer-surface-alt/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon name="info" size={18} className="text-neer-ink-muted" />
                    <span className="text-neer-sm font-semibold text-neer-ink-secondary">{t('Caveat')}</span>
                  </div>
                  <ul className="space-y-2">
                    {decision.caveats.map((c, i) => (
                      <li key={i} className="text-neer-xs text-neer-ink-muted flex items-start gap-2">
                        <span className="mt-0.5">•</span>
                        <span>{t(c)}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
              
              <DataAvailability data={data} />
            </div>
          </div>
        </section>
      </div>


    </div>
  )
}
