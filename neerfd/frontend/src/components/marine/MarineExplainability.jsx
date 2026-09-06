import React from 'react'
import { Icon } from '../../icons/index.js'
import { explainability } from '../../data/mock/marineData.js'
import { useTranslation } from '../../i18n/translations.js';

export default function MarineExplainability() {
  const { t } = useTranslation()

  return (
    <div className="bg-white rounded-2xl border border-neer-border overflow-hidden">
      <div className="p-4 border-b border-neer-border bg-slate-50">
        <h3 className="font-bold text-neer-navy-900 text-lg flex items-center gap-2">
          <Icon name="helpCircle" size={20} className="text-neer-ocean-600" />
          {t('Why is this route flagged?')}
        </h3>
      </div>
      
      <div className="p-4 md:p-5">
        <div className="mb-6">
          <h4 className="text-sm font-bold text-neer-navy-900 mb-3 uppercase tracking-wider">{t('Assessment Process')}</h4>
          <ul className="space-y-3 relative before:absolute before:inset-y-0 before:left-3 before:w-px before:bg-neer-border ml-1">
            {explainability.steps.map((step, idx) => (
              <li key={idx} className="flex gap-3 relative">
                <div className="w-6 h-6 rounded-full bg-neer-ocean-100 border-2 border-white flex items-center justify-center shrink-0 z-10 text-neer-ocean-600">
                  <Icon name="check" size={12} />
                </div>
                <div className="pt-0.5 text-sm text-neer-navy-800">
                  {t(step.label)}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold text-neer-navy-900 mb-3 uppercase tracking-wider">{t('Main Finding')}</h4>
          {explainability.findings.map(finding => (
            <div key={finding.id} className="bg-amber-50 rounded-xl p-4 border border-amber-100">
              <h5 className="font-bold text-amber-900 mb-2">{t(finding.title)}</h5>
              <div className="space-y-2 text-sm text-amber-800">
                <p><span className="font-semibold">{t('Observation:')}</span> {t(finding.observation)}</p>
                <p><span className="font-semibold">{t('Impact:')}</span> {t(finding.impact)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
