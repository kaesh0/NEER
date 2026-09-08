import React from 'react'
import { useTranslation } from '../../i18n/translations.js'
import StatusBadge from './StatusBadge.jsx'

/**
 * StructuredLocationCard
 * 
 * Renders distinct, domain-tailored intelligence for map-click locations:
 * - Fisherman: Fishing safety, PFZ zone, SST, wave/period, current drift
 * - Authority: Coastal threat level, flood/cyclone warning triggers, SAR drift, active alerts
 * - Maritime Operator: Fairway navigability, swell roll risk, ocean currents & drift, SST
 */
export default function StructuredLocationCard({ locData, persona = 'fisherman', className = '' }) {
  const { t } = useTranslation()

  if (!locData) return null

  const locDecision = locData.decisionOutput || locData.decision || {}
  const locConditions =
    locData.marineSituation?.conditions ||
    locData.conditionsSnapshot ||
    locData.conditions ||
    locData.regions?.[0]?.conditions ||
    {}

  const pfzDistance =
    locDecision.pfzRecommendation?.distanceKm ??
    locData.marineSituation?.fishingZones?.zones?.[0]?.distanceKm ??
    locData.fishingZones?.[0]?.distance ??
    null

  const pfzDirection =
    locDecision.pfzRecommendation?.direction ??
    locData.marineSituation?.fishingZones?.zones?.[0]?.direction ??
    ''

  const status =
    locDecision.status ||
    locDecision.actionLevel ||
    locDecision.priority ||
    locData.routeRecommendation?.routeStatus ||
    'favourable'

  const isAuthority = persona === 'authority'
  const isMarine = persona === 'marine' || persona === 'maritime_operator'

  // ── Stakeholder-Tailored Metric Configurations ─────────────────────────────
  let items = []
  let headerLabel = t('Safety Assessment')

  if (isAuthority) {
    headerLabel = t('Coastal Threat Assessment')
    items = [
      {
        label: t('Significant Waves'),
        value: locConditions.waveHeight?.value,
        unit: locConditions.waveHeight?.unit || 'm',
        status: locConditions.waveHeight?.status,
        note: (locConditions.waveHeight?.value || 0) > 1.8 ? t('Elevated') : t('Normal'),
      },
      {
        label: t('Sustained Wind'),
        value: locConditions.windSpeed?.value,
        unit: locConditions.windSpeed?.unit || 'km/h',
        status: locConditions.windSpeed?.status,
        note: (locConditions.windSpeed?.value || 0) > 30 ? t('Strong') : t('Moderate'),
      },
      {
        label: t('SST (Cyclone Potential)'),
        value: locConditions.seaSurfaceTemperature?.value,
        unit: locConditions.seaSurfaceTemperature?.unit || '°C',
        status: locConditions.seaSurfaceTemperature?.status,
        note: (locConditions.seaSurfaceTemperature?.value || 0) >= 26.5 ? t('Tropical Fuel') : t('Stable'),
      },
      {
        label: t('Surface Drift (SAR Vector)'),
        value: locConditions.currentSpeed?.value,
        unit: locConditions.currentSpeed?.unit || 'km/h',
        status: locConditions.currentSpeed?.status,
        note: t('Runoff Drift'),
      },
      {
        label: t('Active Hazards'),
        value: locData.marineSituation?.hazards?.length || 0,
        unit: t('Alerts'),
        status: locData.marineSituation?.hazards?.length ? 'caution' : 'favourable',
        note: locData.marineSituation?.hazards?.[0]?.title || t('No Warning'),
      },
      {
        label: t('Alert Draft Status'),
        value: locData.alertWorkflow?.status === 'draft' ? t('Draft Ready') : t('Monitoring'),
        unit: '',
        status: 'live',
        note: t('Disaster Ops'),
      },
    ]
  } else if (isMarine) {
    headerLabel = t('Corridor Navigability & Transit')
    items = [
      {
        label: t('Fairway Wave Height'),
        value: locConditions.waveHeight?.value,
        unit: locConditions.waveHeight?.unit || 'm',
        status: locConditions.waveHeight?.status,
        note: (locConditions.waveHeight?.value || 0) > 1.6 ? t('Elevated Swell') : t('Smooth'),
      },
      {
        label: t('Crosswind & Speed'),
        value: locConditions.windSpeed?.value,
        unit: locConditions.windSpeed?.unit || 'km/h',
        status: locConditions.windSpeed?.status,
        note: t('Surface Flow'),
      },
      {
        label: t('Ocean Currents & Drift'),
        value: locConditions.currentSpeed?.value,
        unit: locConditions.currentSpeed?.unit || 'km/h',
        status: locConditions.currentSpeed?.status,
        note: t('Fuel / Steer Vector'),
      },
      {
        label: t('Swell Period (Roll Risk)'),
        value: locConditions.swellPeriod?.value,
        unit: locConditions.swellPeriod?.unit || 's',
        status: locConditions.swellPeriod?.status,
        note: (locConditions.swellPeriod?.value || 0) >= 10 ? t('High Roll Risk') : t('Low Roll'),
      },
      {
        label: t('Sea Surface Temp'),
        value: locConditions.seaSurfaceTemperature?.value,
        unit: locConditions.seaSurfaceTemperature?.unit || '°C',
        status: locConditions.seaSurfaceTemperature?.status,
        note: t('Cooling & Fog Risk'),
      },
      {
        label: t('Transit Feasibility'),
        value: status === 'caution' ? t('Review Window') : t('Passable'),
        unit: '',
        status: status === 'caution' ? 'caution' : 'favourable',
        note: t('Vessel Safe'),
      },
    ]
  } else {
    // Fisherman
    headerLabel = t('Trip Safety & Fishing Feasibility')
    items = [
      {
        label: t('Wave Height'),
        value: locConditions.waveHeight?.value,
        unit: locConditions.waveHeight?.unit || 'm',
        status: locConditions.waveHeight?.status,
        note: (locConditions.waveHeight?.value || 0) > 1.5 ? t('Rough Sea') : t('Calm Waters'),
      },
      {
        label: t('Wind Speed'),
        value: locConditions.windSpeed?.value,
        unit: locConditions.windSpeed?.unit || 'km/h',
        status: locConditions.windSpeed?.status,
        note: t('Coastal Wind'),
      },
      {
        label: t('Nearest PFZ Zone'),
        value: pfzDistance !== null ? `${pfzDistance}` : null,
        unit: pfzDistance !== null ? `km ${pfzDirection}` : '',
        status: pfzDistance !== null ? 'favourable' : 'unavailable',
        note: pfzDistance !== null ? t('Active School') : t('No school'),
      },
      {
        label: t('Sea Surface Temp'),
        value: locConditions.seaSurfaceTemperature?.value,
        unit: locConditions.seaSurfaceTemperature?.unit || '°C',
        status: locConditions.seaSurfaceTemperature?.status,
        note: t('Thermal Front'),
      },
      {
        label: t('Swell Period'),
        value: locConditions.swellPeriod?.value,
        unit: locConditions.swellPeriod?.unit || 's',
        status: locConditions.swellPeriod?.status,
        note: t('Wave Interval'),
      },
      {
        label: t('Current Speed'),
        value: locConditions.currentSpeed?.value,
        unit: locConditions.currentSpeed?.unit || 'km/h',
        status: locConditions.currentSpeed?.status,
        note: t('Drift Vector'),
      },
    ]
  }

  const headline = locDecision.headline || locDecision.summary || (isAuthority ? t('Regional priority surveillance active.') : isMarine ? t('Route corridor conditions monitored.') : t('Marine conditions assessed for small craft.'))

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Assessment Status Header */}
      <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200/80 shadow-sm">
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
          {headerLabel}
        </span>
        <StatusBadge status={status} />
      </div>

      {/* Brief Operational Verdict */}
      {headline && (
        <div className="p-2.5 rounded-xl bg-blue-50/50 border border-blue-100 text-xs text-slate-700 font-medium leading-relaxed">
          {headline}
        </div>
      )}

      {/* Structured Metrics Grid */}
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => {
          const isAvailable =
            item.value !== null &&
            item.value !== undefined &&
            item.status !== 'unavailable'

          return (
            <div
              key={item.label}
              className="p-2.5 bg-white rounded-xl border border-slate-200/90 shadow-sm hover:border-slate-300 transition-colors flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-slate-500 truncate" title={item.label}>
                  {item.label}
                </span>
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ml-1 ${
                    isAvailable ? (item.status === 'caution' ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-slate-300'
                  }`}
                />
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span
                  className={`text-sm font-bold font-mono ${
                    isAvailable ? 'text-slate-900' : 'text-slate-400 font-normal italic'
                  }`}
                >
                  {isAvailable ? `${item.value} ${item.unit}`.trim() : t('Unavailable')}
                </span>
                {item.note && (
                  <span className="text-[10px] text-slate-400 font-medium truncate max-w-[80px]">
                    {item.note}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
