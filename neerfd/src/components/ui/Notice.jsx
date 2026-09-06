import { Icon } from '../../icons/index.js'

/**
 * Notice — inline alert banner.
 */
export default function Notice({
  variant = 'info',
  title,
  children,
  icon,
  dismissible = false,
  onDismiss,
  className = '',
}) {
  const defaultIcons = {
    info: 'info',
    favourable: 'checkCircle',
    caution: 'alertTriangle',
    unfavourable: 'xCircle',
  }

  const variants = {
    info: 'bg-neer-info-light text-neer-info border-neer-info-border',
    favourable: 'bg-neer-favourable-light text-neer-favourable border-neer-favourable-border',
    caution: 'bg-neer-caution-light text-neer-caution border-neer-caution-border',
    unfavourable: 'bg-neer-unfavourable-light text-neer-unfavourable border-neer-unfavourable-border',
  }

  return (
    <div
      className={`flex items-start gap-3 p-3 px-4 rounded-[0.625rem] text-neer-sm border ${variants[variant] || variants.info} ${className}`}
      role="status"
    >
      <Icon
        name={icon || defaultIcons[variant] || 'info'}
        size={18}
        className="flex-shrink-0 mt-px"
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        {title && <div className="font-semibold mb-1">{title}</div>}
        <div className="opacity-90 leading-relaxed">{children}</div>
      </div>
      {dismissible && (
        <button
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-xl opacity-60 hover:opacity-100 transition-opacity"
          onClick={onDismiss}
          aria-label="Dismiss"
          type="button"
        >
          ×
        </button>
      )}
    </div>
  )
}
