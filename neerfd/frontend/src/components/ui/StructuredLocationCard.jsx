import React from 'react'
import { useTranslation } from '../../i18n/translations.js'
import StatusBadge from './StatusBadge.jsx'

/**
 * StructuredLocationCard
 * 
 * Replaces prose paragraphs (explainability.summary) for map-click locations
 * with a clean, structured layout displaying raw metrics directly from
 * marineSituation.conditions and decisionOutput / fishingZones.
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

  // Verified actual field paths for PFZ distance against live API:
  // 1. decisionOutput.pfzRecommendation.distanceKm
  // 2. marineSituation.fishingZones.zones[0].distanceKm
  // 3. fallback to fishingZones[0].distance
  const pfzDistance =
    locDecision.pfzRecommendation?.distanceKm ??
    locData.marineSituation?.fishingZones?.zones?.[0]?.distanceKm ??
    locData.fishingZones?.[0]?.distance ??
    null

  const status = locDecision.status || locDecision.actionLevel || 'unavailable'
  const isAuthority = persona === 'authority'

  const items = [
    {
      label: t('Wave Height'),
      value: locConditions.waveHeight?.value,
      unit: locConditions.waveHeight?.unit || 'm',
      status: locConditions.waveHeight?.status,
    },
    {
      label: t('Wind Speed'),
      value: locConditions.windSpeed?.value,
      unit: locConditions.windSpeed?.unit || 'km/h',
      status: locConditions.windSpeed?.status,
    },
    {
      label: t('Swell Period'),
      value: locConditions.swellPeriod?.value,
      unit: locConditions.swellPeriod?.unit || 's',
      status: locConditions.swellPeriod?.status,
    },
    {
      label: t('Sea Surface Temperature'),
      value: locConditions.seaSurfaceTemperature?.value,
      unit: locConditions.seaSurfaceTemperature?.unit || '°C',
      status: locConditions.seaSurfaceTemperature?.status,
    },
    ...(!isAuthority
      ? [
          {
            label: t('PFZ Distance'),
            value: pfzDistance,
            unit: 'km',
            status: pfzDistance !== null && pfzDistance !== undefined ? 'live' : 'unavailable',
          },
        ]
      : []),
    {
      label: t('Current Speed'),
      value: locConditions.currentSpeed?.value,
      unit: locConditions.currentSpeed?.unit || 'km/h',
      status: locConditions.currentSpeed?.status,
    },
  ]

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Assessment Status Header */}
      <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
        <span className="text-xs font-semibold text-slate-500">
          {isAuthority ? t('Priority Assessment') : t('Safety Assessment')}
        </span>
        <StatusBadge status={status} />
      </div>

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
              className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-slate-500">
                  {item.label}
                </span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isAvailable ? 'bg-neer-favourable' : 'bg-neer-unavailable'
                  }`}
                />
              </div>
              <span
                className={`text-sm font-bold ${
                  isAvailable ? 'text-slate-900' : 'text-slate-400 font-normal italic'
                }`}
              >
                {isAvailable ? `${item.value} ${item.unit}` : t('Unavailable')}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
