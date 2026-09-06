import { Icon } from '../../icons/index.js'
import { useTranslation } from '../../i18n/translations.js'

/**
 * FallbackNotice — clear, prominent banner displayed whenever the application
 * is presenting fallback mock data rather than live marine intelligence.
 *
 * Ensures users never mistake offline/cached demo data for live conditions.
 */
export default function FallbackNotice({ onRetry, className = '', compact = false }) {
  const { t } = useTranslation()

  if (compact) {
    return (
      <div className={`p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2 ${className}`}>
        <Icon name="alertTriangle" className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium leading-relaxed">
            {t('Showing example data — live service temporarily unavailable, please try again shortly.')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`w-full bg-amber-500/15 border-b border-amber-500/30 text-amber-200 px-4 py-2.5 flex items-center justify-between text-xs md:text-sm font-medium z-20 ${className}`}>
      <div className="flex items-center gap-2.5 max-w-6xl mx-auto w-full">
        <Icon name="alertTriangle" className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="flex-1">
          {t('Showing example data — live service temporarily unavailable, please try again shortly.')}
        </span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="ml-auto underline text-amber-300 hover:text-amber-100 text-xs font-semibold px-2 py-0.5 rounded hover:bg-amber-500/20 transition-colors shrink-0"
          >
            {t('Retry')}
          </button>
        )}
      </div>
    </div>
  )
}
