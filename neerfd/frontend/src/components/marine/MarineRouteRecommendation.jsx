import React from 'react'
import { Icon } from '../../icons/index.js'
import { routeRecommendation, decision, formatTime } from '../../data/mock/marineData.js'
import Button from '../ui/Button.jsx'
import { useTranslation } from '../../i18n/translations.js';

export default function MarineRouteRecommendation({ onNavigateToRoute }) {
  const { t } = useTranslation()

  const isCaution = routeRecommendation.routeStatus === 'caution'

  return (
    <div className="bg-white rounded-2xl border border-neer-border shadow-sm overflow-hidden flex flex-col">
      <div className={`p-4 ${isCaution ? 'bg-amber-50/50 border-b border-amber-100' : 'bg-green-50/50 border-b border-green-100'}`}>
        <div className="flex items-center gap-2 mb-2">
          <Icon name={isCaution ? 'alertTriangle' : 'checkCircle'} size={20} className={isCaution ? 'text-amber-600' : 'text-green-600'} />
          <h3 className="font-bold text-neer-navy-900 text-lg">{t('Route Recommendation')}</h3>
        </div>
        <p className="text-sm font-medium text-neer-navy-800">{t(routeRecommendation.recommendation)}</p>
      </div>
      
      <div className="p-4 md:p-5 flex-1 flex flex-col gap-4">
        <div>
          <p className="text-xs text-neer-ink-muted uppercase tracking-wider font-semibold mb-1">{t('Recommended Departure')}</p>
          <div className="flex items-center gap-2">
            <Icon name="clock" size={16} className="text-neer-ocean-600" />
            <span className="text-lg font-bold text-neer-navy-900">{formatTime(routeRecommendation.recommendedDepartureTime)} IST</span>
          </div>
        </div>

        <div>
          <p className="text-xs text-neer-ink-muted uppercase tracking-wider font-semibold mb-2">{t('Recommended Actions')}</p>
          <ul className="space-y-2">
            {decision.recommendedActions.map((action, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-neer-navy-800">
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-neer-ocean-500 shrink-0" />
                <span>{t(action)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="p-4 bg-slate-50 border-t border-neer-border">
        <div className="flex items-start gap-2 text-xs text-neer-ink-secondary mb-3">
          <Icon name="info" size={16} className="shrink-0 text-neer-ink-muted" />
          <div className="space-y-1">
            {decision.caveats.map((caveat, idx) => (
              <p key={idx}>{t(caveat)}</p>
            ))}
          </div>
        </div>
        {onNavigateToRoute && (
          <Button variant="secondary" className="w-full justify-center" onClick={onNavigateToRoute}>
            {t('View Route Details')}
          </Button>
        )}
      </div>
    </div>
  )
}
