import { Icon } from '../../icons/index.js'
import SectionHeader from '../../components/layout/SectionHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import FishermanAlertsAmbience from '../../components/fisherman/FishermanAlertsAmbience.jsx'
import { getHazards, getTimeWindow, getMapData, formatDate } from '../../data/mock/fishermanData.js'
import { useTranslation } from '../../i18n/translations.js'
import LoadingState from '../../components/ui/LoadingState.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'

export default function FishermanAlerts({ data, loading, error, onRetry, onNavigate }) {
  const { t } = useTranslation()

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={onRetry} />

  const hazards = getHazards(data)
  const timeWindow = getTimeWindow(data)
  const mapData = getMapData(data)

  return (
    <div className="relative flex flex-col min-h-[calc(100vh-4.5rem)] pb-4 md:pb-8 max-w-[1440px] mx-auto w-full px-4 pt-6">
      <FishermanAlertsAmbience />
      <div className="relative z-10 w-full">
        <SectionHeader 
          title={t('Active Alerts')} 
          subtitle={`${t('Updated') || 'Updated'}: ${formatDate(timeWindow.start)}`} 
          badge={<StatusBadge status={hazards.length > 0 ? 'caution' : 'favourable'} size="sm" />}
        />
        
        {hazards.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center p-12 text-center bg-white border border-neer-border rounded-2xl shadow-sm">
            <div className="w-16 h-16 rounded-full bg-neer-favourable/15 flex items-center justify-center mb-4">
              <Icon name="checkCircle" size={32} className="text-neer-favourable" />
            </div>
            <h2 className="text-xl font-bold text-neer-ink mb-2">{t('No data available')}</h2>
            <p className="text-neer-ink-secondary max-w-md">{t('The marine conditions are currently stable. No significant hazards or warnings have been issued for your area.')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {hazards.map((hazard, index) => {
              // Creating a mock coordinate for map navigation (matching InteractiveMap logic)
              const mockLat = (mapData.center?.[1] || 9.9312) - 0.2 - (index * 0.1)
              const mockLng = (mapData.center?.[0] || 76.2673) - 0.2 - (index * 0.1)
              
              return (
                <Card key={hazard.id} variant="bordered" className="flex flex-col bg-neer-caution/5 hover:-translate-y-0.5 hover:shadow-neer-md transition-all border-l-[4px] border-l-neer-caution">
                  <div className="p-5 md:p-6 flex-1">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                          <Icon name="alertTriangle" size={24} className="text-neer-caution" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-neer-xs font-bold uppercase tracking-wider text-neer-caution">{t('Hazard Warning')}</span>
                            <span className="text-neer-xs text-neer-ink-muted">· {t(hazard.source)}</span>
                          </div>
                          <h3 className="text-xl font-bold text-neer-ink">{t(hazard.title)}</h3>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-neer-base text-neer-ink-secondary mb-5 leading-relaxed">
                      {t(hazard.message)}
                    </p>
                    
                    <div className="flex flex-wrap gap-4 text-neer-sm p-4 bg-white/60 rounded-xl border border-neer-caution/20">
                      <div>
                        <div className="text-neer-xs text-neer-ink-muted mb-0.5">{t('Affected Area')}</div>
                        <div className="font-semibold text-neer-ink">{t('Coastal/Offshore')}</div>
                      </div>
                      <div>
                        <div className="text-neer-xs text-neer-ink-muted mb-0.5">{t('Action')}</div>
                        <div className="font-semibold text-neer-ink">{t('Caution')}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t border-neer-caution/20 p-4 bg-white/40 flex justify-end">
                    <button 
                      onClick={() => onNavigate && onNavigate('map', { type: 'hazard', id: hazard.id, lat: mockLat, lng: mockLng })}
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
        )}
      </div>
    </div>
  )
}
