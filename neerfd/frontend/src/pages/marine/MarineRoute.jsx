import React from 'react'
import MarineRouteAmbience from '../../components/marine/MarineRouteAmbience.jsx'
import MarineSegmentCard from '../../components/marine/MarineSegmentCard.jsx'
import MarineRouteRecommendation from '../../components/marine/MarineRouteRecommendation.jsx'
import MarineExplainability from '../../components/marine/MarineExplainability.jsx'
import Button from '../../components/ui/Button.jsx'
import { Icon } from '../../icons/index.js'
import { segments, context } from '../../data/mock/marineData.js'
import { useTranslation } from '../../i18n/translations.js'

export default function MarineRoute({ onNavigate }) {
  const { t } = useTranslation()

  return (
    <div className="relative min-h-full bg-slate-50 overflow-y-auto">
      <MarineRouteAmbience />
      
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col items-center justify-center text-center">
          <h1 className="text-3xl font-bold text-neer-navy-900 mb-4 tracking-tight">{t('Route Plan')}</h1>
          
          <div className="inline-flex items-center gap-4 bg-white px-6 py-3 rounded-full border border-neer-border shadow-sm">
            <div className="flex items-center gap-2">
              <Icon name="mapPin" size={18} className="text-neer-ocean-600" />
              <span className="font-bold text-neer-navy-900">{t(context.origin.label)}</span>
            </div>
            <div className="flex-1 w-16 h-px bg-neer-border relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2">
                <Icon name="arrowRight" size={16} className="text-neer-ink-muted" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Icon name="mapPin" size={18} className="text-neer-ocean-600" />
              <span className="font-bold text-neer-navy-900">{t(context.destination.label)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 flex flex-col gap-6">
            <h2 className="text-xl font-bold text-neer-navy-900 uppercase tracking-wider">{t('Segments Timeline')}</h2>
            
            <div className="space-y-4 relative before:absolute before:inset-y-4 before:left-4 before:w-px before:bg-neer-border">
              {segments.map((segment, idx) => (
                <div key={segment.id} className="relative pl-10">
                  <div className={`absolute left-[0.875rem] top-6 w-2.5 h-2.5 rounded-full -translate-x-1/2 z-10 border-2 border-white ${segment.status === 'caution' ? 'bg-amber-500' : 'bg-green-500'}`} />
                  <MarineSegmentCard segment={segment} isActive={segment.status === 'caution'} />
                </div>
              ))}
            </div>

            <div className="mt-4">
              <Button variant="secondary" icon="map" className="w-full justify-center" onClick={() => onNavigate('map')}>
                {t('View Route on Map')}
              </Button>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-6">
            <MarineRouteRecommendation />
            <MarineExplainability />
          </div>
        </div>
      </div>
    </div>
  )
}
