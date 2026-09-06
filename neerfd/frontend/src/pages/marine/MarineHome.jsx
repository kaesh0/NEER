import React from 'react'
import MarineOverviewAmbience from '../../components/marine/MarineOverviewAmbience.jsx'
import MarineDataStatus from '../../components/marine/MarineDataStatus.jsx'
import MarineSegmentCard from '../../components/marine/MarineSegmentCard.jsx'
import Button from '../../components/ui/Button.jsx'
import { Icon } from '../../icons/index.js'
import { overallConditions, routeRecommendation, segments, formatTime, context } from '../../data/mock/marineData.js'
import { useTranslation } from '../../i18n/translations.js';

export default function MarineHome({ onNavigate }) {
  const { t } = useTranslation()

  const segment3 = segments.find(s => s.id === 'segment-3')
  const isCaution = routeRecommendation.routeStatus === 'caution'

  return (
    <div className="relative min-h-full bg-slate-50 overflow-y-auto">
      <MarineOverviewAmbience />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neer-navy-900 mb-2 tracking-tight">{t('Voyage Overview')}</h1>
          <div className="flex items-center gap-3 text-neer-ink-secondary">
            <span className="font-semibold text-neer-navy-800">{t(context.origin.label)}</span>
            <Icon name="arrowRight" size={16} />
            <span className="font-semibold text-neer-navy-800">{t(context.destination.label)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content Column */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Top Status Card */}
            <div className={`p-6 rounded-2xl border ${isCaution ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'} shadow-sm`}>
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${isCaution ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                  <Icon name={isCaution ? 'alertTriangle' : 'checkCircle'} size={32} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-neer-navy-900 mb-1 uppercase tracking-wider">{t(isCaution ? 'Caution' : 'Favourable')}</h2>
                  <p className="text-neer-navy-800 font-medium">{t('Route is passable with caution; one segment needs review.')}</p>
                </div>
              </div>
            </div>

            {/* Voyage Details */}
            <div className="bg-white rounded-2xl border border-neer-border p-6 shadow-sm">
              <h3 className="font-bold text-neer-navy-900 mb-4 text-lg">{t('Voyage Details')}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="text-xs text-neer-ink-muted mb-1 flex items-center gap-1.5"><Icon name="clock" size={14}/> {t('Departure')}</div>
                  <div className="font-bold text-neer-navy-900">{formatTime(routeRecommendation.recommendedDepartureTime)} IST</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="text-xs text-neer-ink-muted mb-1 flex items-center gap-1.5"><Icon name="clock" size={14}/> {t('Arrival Window')}</div>
                  <div className="font-bold text-neer-navy-900">{formatTime(context.timeWindow.start)}–{formatTime(context.timeWindow.end)}</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="text-xs text-neer-ink-muted mb-1 flex items-center gap-1.5"><Icon name="wave" size={14}/> {t('Max Wave')}</div>
                  <div className="font-bold text-neer-navy-900">{overallConditions.waveHeight.display}</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="text-xs text-neer-ink-muted mb-1 flex items-center gap-1.5"><Icon name="wind" size={14}/> {t('Max Wind')}</div>
                  <div className="font-bold text-neer-navy-900">{overallConditions.windSpeed.display}</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-neer-border flex items-center gap-2 text-sm text-neer-ink-secondary">
                <span className="font-medium text-neer-navy-800">{t('Vessel:')}</span> {t('Mid-size vessel')}
              </div>
            </div>

            {/* Segment Highlight */}
            {segment3 && (
              <div>
                <h3 className="font-bold text-neer-navy-900 mb-4 text-lg flex items-center gap-2">
                  {t('Segment Requiring Review')}
                  <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-800">10:00–12:00</span>
                </h3>
                <MarineSegmentCard segment={segment3} isActive={true} />
              </div>
            )}
          </div>

          {/* Sidebar Column */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Map Preview */}
            <div className="bg-white rounded-2xl border border-neer-border overflow-hidden shadow-sm flex flex-col h-[300px]">
              <div className="p-4 border-b border-neer-border bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-neer-navy-900 flex items-center gap-2"><Icon name="map" size={18}/> {t('Route Map')}</h3>
              </div>
              <div className="flex-1 bg-blue-50 relative flex items-center justify-center p-6 text-center group cursor-pointer" onClick={() => onNavigate('map')}>
                 {/* Fake map aesthetic for preview (since real map will be on the Map tab) */}
                 <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #0369a1 1px, transparent 0)', backgroundSize: '16px 16px' }} />
                 <div className="relative z-10 flex flex-col items-center gap-3">
                   <div className="w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center text-neer-ocean-600 group-hover:scale-110 transition-transform">
                     <Icon name="map" size={24} />
                   </div>
                   <div className="text-sm font-semibold text-neer-navy-900">{t('Open full map')}</div>
                 </div>
              </div>
            </div>

            {/* Data Status */}
            <MarineDataStatus />

          </div>
        </div>
      </div>
    </div>
  )
}
