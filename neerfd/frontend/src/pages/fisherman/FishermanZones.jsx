import { Icon } from '../../icons/index.js'
import SectionHeader from '../../components/layout/SectionHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import { getFishingZones, getFishingZoneMeta, getPfzRecommendation, directionToCompass, formatTime, formatDate } from '../../data/mock/fishermanData.js'
import FishermanZonesAmbience from '../../components/fisherman/FishermanZonesAmbience.jsx'
import { useTranslation } from '../../i18n/translations.js';
import LoadingState from '../../components/ui/LoadingState.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'

export default function FishermanZones({ data, loading, error, onRetry, onNavigate }) {
  const { t } = useTranslation()

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={onRetry} />

  const fishingZones = getFishingZones(data)
  const fishingZoneMeta = getFishingZoneMeta(data)
  const pfzRecommendation = getPfzRecommendation(data)

  return (
    <div className="relative flex flex-col min-h-[calc(100vh-4.5rem)] pb-4 md:pb-8 max-w-[1440px] mx-auto w-full px-4 pt-6">
      <FishermanZonesAmbience />
      <div className="relative z-10 w-full">
        <SectionHeader 
          title={t('Potential Fishing Zones')} 
          subtitle={`Advisory: ${formatDate(fishingZoneMeta.advisoryDate)}`} 
          badge={<StatusBadge status={fishingZoneMeta.status === 'available' ? 'favourable' : 'unavailable'} size="sm" />}
        />
        
        {pfzRecommendation && (
          <div className="mt-6 mb-8">
            <Card variant="bordered" className="bg-neer-ocean-50/50 hover:shadow-neer-md transition-shadow">
              <div className="p-4 md:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="fish" size={20} className="text-neer-ocean-600" />
                  <span className="text-neer-lg font-bold text-neer-ink">{t('Recommended Zone')}</span>
                </div>
                <p className="text-neer-base text-neer-ink-secondary mb-4">{t(pfzRecommendation.summary || pfzRecommendation.headline)}</p>
                
                <div className="flex flex-wrap gap-4 text-neer-sm">
                  <div className="flex items-center gap-2">
                    <Icon name="compass" size={16} className="text-neer-ink-muted" />
                    <span className="text-neer-ink-secondary">{t('Distance')}: ~{pfzRecommendation.distance} km</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon name="clock" size={16} className="text-neer-ink-muted" />
                    <span className="text-neer-ink-secondary">{t('Valid Until')}: {formatTime(pfzRecommendation.validUntil)}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {fishingZones.map((zone) => {
            const compass = directionToCompass(zone.direction)
            return (
              <Card key={zone.id} variant="bordered" className="hover:-translate-y-0.5 hover:shadow-neer-md transition-all flex flex-col h-full">
                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-neer-ocean-50 flex items-center justify-center">
                        <Icon name="fish" size={16} className="text-neer-ocean-600" />
                      </div>
                      <h3 className="text-neer-lg font-bold text-neer-ink">{t(zone.name)}</h3>
                    </div>
                    <StatusBadge status={zone.status} size="sm" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-3 mb-4 text-neer-sm">
                    <div>
                      <div className="text-neer-xs text-neer-ink-muted mb-0.5">{t('Distance')}</div>
                      <div className="font-semibold text-neer-ink">~{zone.distance} km</div>
                    </div>
                    <div>
                      <div className="text-neer-xs text-neer-ink-muted mb-0.5">{t('Direction') || 'Direction'}</div>
                      <div className="font-semibold text-neer-ink">{t(compass)}</div>
                    </div>
                  </div>
                  
                  <div className="text-neer-xs text-neer-ink-muted border-t border-neer-border pt-3">
                    {t('Source')}: {t(zone.source)}
                  </div>
                </div>
                
                <div className="border-t border-neer-border p-3 bg-neer-surface-alt/30">
                  <button 
                    onClick={() => onNavigate && onNavigate('map', { type: 'zone', id: zone.id, lat: zone.lat, lng: zone.lng })}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-neer-sm font-bold text-neer-ink hover:text-neer-ocean-600 border border-neer-border hover:border-neer-ocean-200 rounded-lg shadow-sm transition-all hover:shadow-md"
                  >
                    <Icon name="map" size={16} />
                    {t('View on map') || 'View on Map'}
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
