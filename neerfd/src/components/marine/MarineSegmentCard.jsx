import React from 'react'
import { Icon } from '../../icons/index.js'
import { formatTime } from '../../data/mock/marineData.js'
import { useTranslation } from '../../i18n/translations.js';

export default function MarineSegmentCard({ segment, isActive = false }) {
  const { t } = useTranslation()

  const isCaution = segment.status === 'caution'
  
  return (
    <div className={`p-4 rounded-xl border ${isActive ? 'border-neer-ocean-400 bg-blue-50/50 shadow-sm' : 'border-neer-border bg-white'} transition-colors`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-bold text-neer-navy-900 text-sm">{t('Segment')} {segment.id.split('-')[1]}</h4>
          <p className="text-xs text-neer-ink-secondary">{formatTime(segment.estimatedEntryTime)} – {formatTime(segment.estimatedExitTime)}</p>
        </div>
        <div className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 ${
          isCaution ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-green-100 text-green-800 border border-green-200'
        }`}>
          <Icon name={isCaution ? 'alertTriangle' : 'check'} size={14} />
          {t(isCaution ? 'Caution' : 'Favourable')}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm mt-3">
        <div className="flex flex-col bg-slate-50 p-2 rounded-lg">
          <span className="text-xs text-neer-ink-muted">{t('Wave')}</span>
          <span className="font-medium text-neer-navy-800">{segment.conditions.waveHeight.display}</span>
        </div>
        <div className="flex flex-col bg-slate-50 p-2 rounded-lg">
          <span className="text-xs text-neer-ink-muted">{t('Wind')}</span>
          <span className="font-medium text-neer-navy-800">{segment.conditions.windSpeed.display}</span>
        </div>
      </div>

      {isCaution && segment.reasons.length > 0 && (
        <div className="mt-3 pt-3 border-t border-amber-100">
          <ul className="text-xs text-amber-800 space-y-1">
            {segment.reasons.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <Icon name="info" size={14} className="mt-0.5 shrink-0 opacity-70" />
                <span>{t(reason)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
