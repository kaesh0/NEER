import React from 'react'
import { useTranslation } from '../../i18n/translations.js';

export default function MarineAlertsAmbience() {
  const { t } = useTranslation()

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none bg-slate-50">
      {/* Subtle warning glow */}
      <div className="absolute top-[10%] left-[10%] w-[80%] h-[40%] bg-amber-200/10 blur-[120px] rounded-full mix-blend-multiply" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-slate-300/20 blur-[100px] rounded-full mix-blend-multiply" />
      
      {/* Monitoring radar / pulse texture */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] opacity-[0.02]">
        <div className="absolute inset-0 rounded-full border border-slate-900 scale-50" />
        <div className="absolute inset-0 rounded-full border border-slate-900 scale-75" />
        <div className="absolute inset-0 rounded-full border border-slate-900 scale-100" />
      </div>
      
      {/* Diagonal scanline texture */}
      <div 
        className="absolute inset-0 opacity-[0.015]" 
        style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000, #000 1px, transparent 1px, transparent 10px)' }}
      />
    </div>
  )
}
