import { Icon } from '../../icons/index.js'
import Button from './Button.jsx'

/**
 * EmptyState — shown when there is no data to display.
 */
export default function EmptyState({
  icon = 'layers',
  title = 'Nothing here yet',
  message,
  action,
  tone = 'default',
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-12 px-6 gap-3 ${className}`}>
      <div className={`mb-2 ${tone === 'unavailable' ? 'text-neer-unavailable' : 'text-neer-ink-muted'}`}>
        <Icon name={icon} size={48} aria-hidden="true" />
      </div>
      <h3 className="text-neer-lg font-bold text-neer-ink m-0">{title}</h3>
      {message && <p className="max-w-md text-neer-base text-neer-ink-secondary">{message}</p>}
      {action && (
        <Button variant="secondary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
