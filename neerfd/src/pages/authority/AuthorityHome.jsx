import React, { useState } from 'react'
import { Icon } from '../../icons/index.js'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import Card from '../../components/ui/Card.jsx'
import SectionHeader from '../../components/layout/SectionHeader.jsx'
import AuthorityHomeAmbience from '../../components/authority/AuthorityHomeAmbience.jsx'
import AuthorityInteractiveMap from '../../components/authority/AuthorityInteractiveMap.jsx'
import { useTranslation } from '../../i18n/translations.js';
import LoadingState from '../../components/ui/LoadingState.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import {
  getRequest,
  getTimeWindow,
  getDecision,
  getAreaPriorities,
  getExplainability,
  getProvenance,
  getStatusColor,
  getStatusBg
} from '../../data/mock/authorityData.js'

function PriorityAreaCard({ area, onClick }) {
  const { t } = useTranslation()
  return (
    <Card variant="bordered" className={`hover:-translate-y-0.5 transition-all cursor-pointer ${getStatusBg(area.status)}`} onClick={onClick}>
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-bold text-neer-navy-900">{t(area.label)}</h3>
        <StatusBadge status={area.status} size="sm" />
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-neer-xs font-bold uppercase tracking-wider ${getStatusColor(area.status)}`}>
          {t(area.priority)} {t('Priority')}
        </span>
      </div>
      <ul className="space-y-1">
        {area.reasons.map((r, i) => (
          <li key={i} className="text-neer-sm text-neer-ink-secondary flex items-start gap-1.5">
            <span className={`${getStatusColor(area.status)} mt-0.5`}>•</span>
            <span>{t(r)}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export default function AuthorityHome({ data, loading, error, onRetry, onNavigate, chatOpen, setChatOpen }) {
  const { t } = useTranslation()

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={onRetry} />

  const request = getRequest(data)
  const timeWindow = getTimeWindow(data)
  const decision = getDecision(data)
  const areaPriorities = getAreaPriorities(data)
  const explainability = getExplainability(data)
  const provenance = getProvenance(data)

  return (
    <div className="relative animate-fade-in min-h-screen">
      <AuthorityHomeAmbience />
      
      <div className="relative z-10 w-full max-w-[1440px] mx-auto pb-8">
        <section className="mb-8">
          <div className="text-neer-xs font-bold tracking-widest uppercase text-slate-500 mb-2">
            {t('Regional risk and coastal monitoring')}
          </div>
          <h1 className="text-neer-3xl md:text-4xl font-bold text-neer-navy-900 tracking-tight">
            {t('Regional Overview')}
          </h1>
          <div className="flex items-center gap-3 mt-3 text-neer-sm text-neer-ink-secondary">
            <span className="font-semibold text-neer-ink">{t(request.geometry.label)}</span>
            <span>·</span>
            <span>{t(timeWindow.label)}</span>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card variant="bordered" className="bg-white border-l-4 border-l-neer-caution shadow-neer-sm">
              <div className="flex items-start gap-4 p-6">
                <div className="w-16 h-16 rounded-full bg-neer-caution/15 flex items-center justify-center flex-shrink-0">
                  <Icon name="alertTriangle" size={32} className="text-neer-caution" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-neer-xs font-bold uppercase tracking-wider text-slate-500">{t('Status') || 'Status'}</span>
                    <StatusBadge status={decision.status} />
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-neer-navy-900">{t(decision.headline)}</h2>
                  <p className="text-neer-base text-neer-ink-secondary mt-2">{t(decision.summary)}</p>
                </div>
              </div>
            </Card>

            <Card variant="bordered" className="bg-slate-50 border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <Icon name="info" size={18} className="text-slate-600" />
                <span className="font-semibold text-neer-navy-900">{t('Recommended Actions')}</span>
              </div>
              <ul className="space-y-2">
                {decision.recommendedActions.map((action, i) => (
                  <li key={i} className="flex items-start gap-2 text-neer-base text-neer-ink-secondary">
                    <span className="text-slate-400 mt-0.5">→</span>
                    <span>{t(action)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <div className="lg:col-span-1 h-full min-h-[300px] cursor-pointer group" onClick={() => onNavigate('map')}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-neer-navy-900">{t('Regional Priority Map')}</h3>
              <Icon name="chevronRight" size={16} className="text-slate-400 group-hover:text-neer-ocean-600 transition-colors" />
            </div>
            <div className="h-[calc(100%-2rem)] transition-shadow group-hover:shadow-md rounded-xl overflow-hidden border border-neer-border">
              <AuthorityInteractiveMap className="pointer-events-none" data={data} />
            </div>
          </div>
        </div>

        <section className="mb-8">
          <SectionHeader title={t('Area Priority')} subtitle={t('Detailed area assessments')} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {areaPriorities.map(area => (
              <PriorityAreaCard key={area.areaId} area={area} onClick={() => onNavigate('areas', area.areaId)} />
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card variant="bordered">
            <h3 className="font-bold text-neer-navy-900 mb-4 flex items-center gap-2">
              <Icon name="info" size={18} />
              {t('Why this assessment?')}
            </h3>
            <p className="text-neer-base text-neer-ink-secondary mb-4">{t(explainability.summary)}</p>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h4 className="font-semibold text-neer-navy-900 mb-2">{t(explainability.findings[0].title)}</h4>
              <p className="text-sm text-slate-600 mb-2"><span className="font-medium text-slate-700">{t('Observation:')}</span> {t(explainability.findings[0].observation)}</p>
              <p className="text-sm text-slate-600"><span className="font-medium text-slate-700">{t('Impact:')}</span> {t(explainability.findings[0].impact)}</p>
            </div>
          </Card>

          <Card variant="bordered">
            <h3 className="font-bold text-neer-navy-900 mb-4 flex items-center gap-2">
              <Icon name="database" size={18} />
              {t('Data Sources & Status')}
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Weather')}</span>
                  <StatusBadge status={provenance.availability.weather === 'live' ? 'favourable' : 'unavailable'} label={t(provenance.availability.weather)} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Hazards')}</span>
                  <StatusBadge status={provenance.availability.hazards === 'live' ? 'favourable' : 'unavailable'} label={t(provenance.availability.hazards)} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">SST</span>
                  <StatusBadge status="unavailable" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Currents')}</span>
                  <StatusBadge status="unavailable" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-500">{t(decision.caveats[1])}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
