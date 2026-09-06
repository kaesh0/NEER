import React from 'react'
import { useTranslation } from '../../i18n/translations.js';

export default function FishermanAlertsAmbience() {
  const { t } = useTranslation()

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none bg-slate-50">
      {/* Light ocean background */}
      <div className="absolute inset-0 opacity-[0.2]" style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)' }} />
      
      {/* Restrained monitoring/radar waves */}
      <div className="absolute top-[10%] right-[10%] w-[600px] h-[600px] opacity-[0.03]">
        <div className="absolute inset-0 rounded-full border-2 border-slate-700 scale-25" />
        <div className="absolute inset-0 rounded-full border border-slate-700 scale-50" />
        <div className="absolute inset-0 rounded-full border border-slate-700 scale-75" />
        <div className="absolute inset-0 rounded-full border border-slate-700 scale-100" />
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-slate-700" />
        <div className="absolute top-0 left-1/2 w-[1px] h-full bg-slate-700" />
      </div>
      
      {/* Subtle calm warning gradient without turning the page red */}
      <div className="absolute bottom-0 left-0 w-full h-[40%] bg-gradient-to-t from-slate-200/40 to-transparent" />
    </div>
  )
}
