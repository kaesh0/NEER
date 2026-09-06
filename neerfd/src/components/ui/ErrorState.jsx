import { Icon } from '../../icons/index.js'
import Button from './Button.jsx'

/**
 * ErrorState — shown when something goes wrong.
 */
export default function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again',
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-12 px-6 gap-3 ${className}`}>
      <div className="mb-2 text-neer-unfavourable">
        <Icon name="xCircle" size={48} aria-hidden="true" />
      </div>
      <h3 className="text-neer-lg font-bold text-neer-ink m-0">{title}</h3>
      {message && <p className="max-w-md text-neer-base text-neer-ink-secondary">{message}</p>}
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} icon="refresh">
          {retryLabel}
        </Button>
      )}
    </div>
  )
}
