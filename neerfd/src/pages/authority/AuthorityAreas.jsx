import React, { useState, useEffect } from 'react'
import { Icon } from '../../icons/index.js'
import SectionHeader from '../../components/layout/SectionHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import AuthorityAreasAmbience from '../../components/authority/AuthorityAreasAmbience.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import { getAreaPriorities, getRegions, getStatusColor, getStatusBg } from '../../data/mock/authorityData.js'
import { useTranslation } from '../../i18n/translations.js';

function AreaCard({ area, isSelected, onClick }) {
  const { t } = useTranslation()
  return (
    <Card 
      variant="bordered" 
      className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-neer-ocean-600 bg-slate-50' : 'bg-white'}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-neer-navy-900">{t(area.label)}</h3>
        <StatusBadge status={area.status} size="sm" />
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-neer-xs font-bold uppercase tracking-wider ${getStatusColor(area.status)}`}>
          {t(area.priority)} {t('Priority')}
        </span>
      </div>
      <div className="text-xs text-slate-500 mt-2">
        {area.reasons.length} {t(area.reasons.length !== 1 ? 'risk factors' : 'risk factor')}
      </div>
    </Card>
  )
}

export default function AuthorityAreas({ data, loading, error, onRetry, focusPoint, setFocusPoint, onNavigate }) {
  const { t } = useTranslation()

  const [selectedAreaId, setSelectedAreaId] = useState(null)

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={onRetry} />

  const areaPriorities = getAreaPriorities(data)
  const regions = getRegions(data)
  
  const currentAreaId = selectedAreaId || (areaPriorities.length > 0 ? areaPriorities[0].areaId : null)

  // Auto-select area if navigated from map
  useEffect(() => {
    if (focusPoint && focusPoint.type === 'area' && focusPoint.id) {
      setSelectedAreaId(focusPoint.id)
    }
  }, [focusPoint])

  const selectedArea = areaPriorities.find(a => a.areaId === currentAreaId) || areaPriorities[0]
  const regionDetails = regions.find(r => r.id === currentAreaId)
  
  return (
    <div className="relative animate-fade-in min-h-[calc(100vh-4.5rem)] pb-8 pt-6">
      <AuthorityAreasAmbience />
      
      <div className="relative z-10 max-w-[1440px] mx-auto w-full px-4">
        <SectionHeader title={t('Regional Priority Analysis')} subtitle={t('Detailed area assessments')} />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Areas List */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            {areaPriorities.map(area => (
              <AreaCard 
                key={area.areaId} 
                area={area} 
                isSelected={currentAreaId === area.areaId}
                onClick={() => setSelectedAreaId(area.areaId)} 
              />
            ))}
          </div>

          {/* Area Details Panel */}
          <div className="lg:col-span-2">
            {selectedArea && regionDetails ? (
              <Card variant="bordered" className={`h-full min-h-[400px] border-t-4 ${selectedArea.status === 'caution' ? 'border-t-neer-caution' : 'border-t-neer-favourable'}`}>
                <div className="p-2">
                  <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-neer-navy-900 mb-2">{t(selectedArea.label)}</h2>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-bold uppercase tracking-wider px-2 py-1 rounded bg-slate-100 ${getStatusColor(selectedArea.status)}`}>
                          {t(selectedArea.priority)} {t('Priority')}
                        </span>
                        <StatusBadge status={selectedArea.status} />
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigate('map', { type: 'area', id: selectedArea.areaId, lat: 9.85, lng: 76.35 })}
                      className="flex items-center gap-2 text-sm font-medium text-neer-ocean-600 hover:text-neer-ocean-700 hover:bg-slate-50 px-3 py-2 rounded-lg transition-colors"
                    >
                      <Icon name="map" size={16} />
                      {t('View on Map')}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-8">
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                      <div className="flex items-center gap-2 mb-3 text-slate-500">
                        <Icon name="wave" size={18} />
                        <span className="font-semibold text-sm uppercase tracking-wider">{t('Forecast Wave')}</span>
                      </div>
                      <div className="text-3xl font-bold text-neer-navy-900">
                        {regionDetails.conditions.waveHeight.value} {regionDetails.conditions.waveHeight.unit}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                      <div className="flex items-center gap-2 mb-3 text-slate-500">
                        <Icon name="wind" size={18} />
                        <span className="font-semibold text-sm uppercase tracking-wider">{t('Forecast Wind')}</span>
                      </div>
                      <div className="text-3xl font-bold text-neer-navy-900">
                        {regionDetails.conditions.windSpeed.value} {regionDetails.conditions.windSpeed.unit}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-neer-navy-900 mb-3 flex items-center gap-2">
                      <Icon name="info" size={18} />
                      {t('Risk Factors & Reasons')}
                    </h4>
                    <ul className="space-y-3">
                      {selectedArea.reasons.map((r, i) => (
                        <li key={i} className="flex items-start gap-3 bg-white p-3 rounded-lg border border-slate-200">
                          <Icon name="alertTriangle" size={18} className={getStatusColor(selectedArea.status)} />
                          <span className="text-neer-ink font-medium">{t(r)}</span>
                        </li>
                      ))}
                      {selectedArea.reasons.length === 0 && (
                        <li className="flex items-start gap-3 bg-white p-3 rounded-lg border border-slate-200">
                          <Icon name="checkCircle" size={18} className="text-neer-favourable" />
                          <span className="text-neer-ink font-medium">{t('Conditions within normal range')}</span>
                        </li>
                      )}
                    </ul>
                  </div>
                  
                  {selectedArea.hazardIds.length > 0 && (
                    <div className="mt-8">
                      <h4 className="font-bold text-neer-navy-900 mb-3 flex items-center gap-2">
                        <Icon name="alertTriangle" size={18} />
                        {t('Active Hazards')}
                      </h4>
                      {selectedArea.hazardIds.map(hId => (
                        <div key={hId} className="flex items-center justify-between bg-neer-caution/10 p-4 rounded-lg border border-neer-caution/30">
                          <span className="font-semibold text-neer-caution font-mono text-sm">{hId}</span>
                          <button
                            onClick={() => onNavigate('alerts')}
                            className="text-sm font-medium text-neer-ocean-600 hover:underline"
                          >
                            {t('View Warning Draft')}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
