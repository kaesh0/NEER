import { Icon } from '../../icons/index.js'
import { getDataAvailability } from '../../data/mock/fishermanData.js'
import { useTranslation } from '../../i18n/translations.js'

/**
 * DataAvailability — subtle indicator showing data freshness per source.
 * Displays at the bottom of the dashboard to communicate transparency.
 */
export default function DataAvailability({ data, className = '' }) {
  const { t } = useTranslation()
  if (!data) return null
  const dataAvailability = getDataAvailability(data)

  const items = [
    { label: t('Weather') || 'Weather', status: dataAvailability.weather },
    { label: t('PFZ') || 'PFZ', status: dataAvailability.pfz },
    { label: t('Hazards') || 'Hazards', status: dataAvailability.hazards },
    { label: t('Current') || 'Currents', status: dataAvailability.currents },
    { label: 'SST', status: dataAvailability.sst },
  ]

  const statusColors = {
    live: 'text-neer-favourable',
    cached: 'text-neer-caution',
    fallback: 'text-amber-400',
    unavailable: 'text-neer-unavailable',
  }

  const statusDots = {
    live: 'bg-neer-favourable',
    cached: 'bg-neer-caution',
    fallback: 'bg-amber-400',
    unavailable: 'bg-neer-unavailable',
  }

  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-neer-xs text-neer-ink-muted ${className}`}>
      <span className="font-medium text-neer-ink-secondary">{t('Data Availability')}:</span>
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${statusDots[item.status]}`} />
          <span>{item.label}</span>
          <span className={`capitalize ${statusColors[item.status]}`}>{t(item.status) || item.status}</span>
        </span>
      ))}
    </div>
  )
}
