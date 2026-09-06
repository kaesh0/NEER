import { useState } from 'react'
import { Icon } from '../../icons/index.js'
import { getExplainability } from '../../data/mock/fishermanData.js'

import { useTranslation } from '../../i18n/translations.js'

/**
 * WhyThisResult — expandable section explaining the assessment reasoning.
 * Uses only data from the fisherman JSON.
 */
export default function WhyThisResult({ data, className = '' }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  if (!data) return null
  const explainability = getExplainability(data)

  return (
    <div className={`border border-neer-border rounded-[0.875rem] overflow-hidden ${className}`}>
      <button
        className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-neer-surface-alt transition-colors"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <Icon name="info" size={18} className="text-neer-ocean-600" />
          <span className="text-neer-sm font-semibold text-neer-ink">{t('Why this result?')}</span>
        </div>
        <Icon
          name="chevronDown"
          size={16}
          className={`text-neer-ink-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-neer-border">
          {/* Summary */}
          <p className="text-neer-sm text-neer-ink-secondary mt-3 leading-relaxed">
            {t(explainability.summary)}
          </p>

          {/* Findings */}
          {explainability.findings.length > 0 && (
            <div className="mt-3 space-y-2">
              {explainability.findings.map((f) => (
                <div key={f.id} className="flex items-start gap-2">
                  <Icon name="alertTriangle" size={14} className="text-neer-caution mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-neer-xs font-semibold text-neer-ink">{t(f.title)}</div>
                    <div className="text-neer-xs text-neer-ink-secondary mt-0.5">{t(f.observation)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Limitations */}
          {explainability.limitations.length > 0 && (
            <div className="mt-3 pt-3 border-t border-neer-border">
              <div className="text-neer-xs font-medium text-neer-ink-secondary mb-1">{t('Limitations')}</div>
              {explainability.limitations.map((lim, i) => (
                <div key={i} className="text-neer-xs text-neer-ink-muted mt-1 flex items-start gap-1.5">
                  <span className="text-neer-ink-muted">·</span>
                  <span>{t(lim.message)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
