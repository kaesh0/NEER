import { Icon } from '../../icons/index.js'
import { useTranslation } from '../../i18n/translations.js';

/**
 * ChatPanel — presentational shell for the Ask NEER chat assistant.
 */
export default function ChatPanel({
  open = false,
  onClose,
  messages,
  suggestions,
  composer,
  className = '',
}) {
  const { t } = useTranslation()

  if (!open) return null

  return (
    <div className={`flex flex-col h-full bg-white border border-neer-border rounded-[0.875rem] overflow-hidden ${className}`} role="dialog" aria-label="Ask NEER chat">
      {/* Header */}
      <div className="flex items-center justify-between p-3 px-4 border-b border-neer-border bg-neer-navy-900 text-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-neer-ocean-600 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <Icon name="wave" size={20} />
          </div>
          <div>
            <div className="text-neer-base font-bold">{t('Ask NEER')}</div>
            <div className="text-neer-xs opacity-75">{t('Marine intelligence assistant')}</div>
          </div>
        </div>
        <button
          className="w-11 h-11 flex items-center justify-center rounded-[0.625rem] text-white opacity-70 hover:opacity-100 transition-opacity"
          onClick={onClose}
          aria-label="Close chat"
          type="button"
        >
          <Icon name="x" size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages}
      </div>

      {/* Suggested questions */}
      {suggestions && (
        <div className="flex gap-2 p-3 px-4 flex-wrap border-t border-neer-border">
          {suggestions}
        </div>
      )}

      {/* Composer */}
      <div className="flex items-center gap-2 p-3 px-4 border-t border-neer-border bg-neer-surface-alt">
        {composer}
      </div>

      <div className="text-center text-neer-xs text-neer-ink-muted py-2 border-t border-neer-border">
        {t('Regional languages & voice coming soon')}
      </div>
    </div>
  )
}
