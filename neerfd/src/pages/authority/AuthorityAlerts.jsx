import React from 'react'
import { Icon } from '../../icons/index.js'
import SectionHeader from '../../components/layout/SectionHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import AuthorityAlertsAmbience from '../../components/authority/AuthorityAlertsAmbience.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import { getHazards, getDraftWarning, getStatusColor } from '../../data/mock/authorityData.js'
import { useTranslation } from '../../i18n/translations.js';

export default function AuthorityAlerts({ data, loading, error, onRetry }) {
  const { t } = useTranslation()

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={onRetry} />

  const hazards = getHazards(data)
  const draftWarning = getDraftWarning(data)

  return (
    <div className="relative animate-fade-in min-h-[calc(100vh-4.5rem)] pb-8 pt-6">
      <AuthorityAlertsAmbience />
      
      <div className="relative z-10 max-w-[1440px] mx-auto w-full px-4">
        <SectionHeader title={t('Maritime Warning & Response')} subtitle={t('Review generated advisories and active hazards')} />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2">
            <h3 className="font-bold text-neer-navy-900 mb-4 tracking-tight text-xl">{t('Draft Warning Workflow')}</h3>
            <Card variant="bordered" className="border-l-4 border-l-neer-caution bg-white shadow-md">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider rounded">{t('Draft')}</span>
                  <span className="text-sm font-medium text-slate-500 font-mono">ID: warning-ernakulam-001</span>
                </div>
                <div className="text-sm text-slate-500">
                  {t('Target:')} {draftWarning.targetAudience.map(aud => t(aud)).join(', ')}
                </div>
              </div>
              
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-neer-navy-900 mb-2">{t(draftWarning.title)}</h2>
                <p className="text-neer-ink text-lg leading-relaxed">{t(draftWarning.message)}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{t('Valid From')}</div>
                  <div className="font-medium text-neer-navy-900">{new Date(draftWarning.validFrom).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short'})}</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{t('Valid Until')}</div>
                  <div className="font-medium text-neer-navy-900">{new Date(draftWarning.validUntil).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short'})}</div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{t('Target Areas')}</div>
                <div className="flex gap-2">
                  {draftWarning.targetAreas.map((area, i) => (
                    <span key={i} className="px-3 py-1 bg-white border border-slate-300 rounded-full text-sm font-medium text-slate-700">
                      {t(area)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 flex items-start gap-3 mb-6">
                <Icon name="info" size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800 font-medium">
                  {t(draftWarning.disclaimer)}
                </p>
              </div>

              <div className="flex items-center gap-3 border-t border-slate-100 pt-6">
                <button className="px-6 py-2.5 bg-neer-ocean-600 text-white font-semibold rounded-lg hover:bg-neer-ocean-700 transition-colors shadow-sm" disabled>
                  {t('Review Draft')}
                </button>
                <span className="text-sm text-slate-500 italic">{t('Workflow actions (Approve/Publish) are not implemented in MVP.')}</span>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <h3 className="font-bold text-neer-navy-900 mb-4 tracking-tight text-xl">{t('Active Hazards')}</h3>
            <div className="flex flex-col gap-4">
              {hazards.map(h => (
                <Card key={h.id} variant="bordered" className={`border-l-4 ${h.severity === 'watch' ? 'border-l-neer-caution bg-amber-50/30' : 'border-l-neer-ocean-600 bg-slate-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="alertTriangle" size={16} className={h.severity === 'watch' ? 'text-neer-caution' : 'text-neer-ocean-600'} />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">{t(h.severity)}</span>
                  </div>
                  <h4 className="font-bold text-neer-navy-900 mb-1">{t(h.title)}</h4>
                  <p className="text-sm text-neer-ink-secondary mb-3">{t(h.message)}</p>
                  <div className="text-xs text-slate-500 font-mono">{t('Source:')} {h.sourceRef}</div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
