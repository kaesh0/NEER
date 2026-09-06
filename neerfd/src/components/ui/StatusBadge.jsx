import { Icon } from '../../icons/index.js'
import { STATUS } from '../../theme/index.js'
import { useTranslation } from '../../i18n/translations.js'

/**
 * StatusBadge — semantic status pill with dot, label and optional icon.
 */
export default function StatusBadge({
  status = 'info',
  size = 'md',
  dot = true,
  icon = false,
  label,
  animated = false,
  className = '',
}) {
  const { t } = useTranslation()
  const meta = STATUS[status] || STATUS.info
  const displayLabel = label || meta.label

  const sizes = {
    sm: 'text-neer-xs px-2 py-0.5',
    md: 'text-neer-sm px-2.5 py-0.75',
  }

  const variants = {
    favourable: 'bg-neer-favourable-light text-neer-favourable border border-neer-favourable-border',
    caution: 'bg-neer-caution-light text-neer-caution border border-neer-caution-border',
    unfavourable: 'bg-neer-unfavourable-light text-neer-unfavourable border border-neer-unfavourable-border',
    unavailable: 'bg-neer-unavailable-light text-neer-unavailable border border-neer-unavailable-border',
    info: 'bg-neer-info-light text-neer-info border border-neer-info-border',
  }

  return (
    <span
      className={`inline-flex items-center gap-2 font-medium whitespace-nowrap rounded-full transition-colors duration-neer-base ease-neer-out ${sizes[size]} ${variants[status] || variants.info} ${className}`}
      role="status"
    >
      {dot && (
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-neer-slow ease-neer-out ${animated ? 'animate-neer-breathe' : ''}`}
          style={{ backgroundColor: meta.dotColor }}
          aria-hidden="true"
        />
      )}
      {icon && <Icon name={meta.icon} size={size === 'sm' ? 12 : 14} aria-hidden="true" />}
      <span className="leading-none">{t(displayLabel) || displayLabel}</span>
    </span>
  )
}
