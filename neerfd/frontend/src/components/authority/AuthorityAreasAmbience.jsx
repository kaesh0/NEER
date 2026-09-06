import React from 'react'
import { useTranslation } from '../../i18n/translations.js';

export default function AuthorityAreasAmbience() {
  const { t } = useTranslation()

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none bg-slate-50">
      {/* Professional government decision-support aesthetic - clean map grid */}
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '64px 64px' }}
      />
      
      {/* Subtle regional boundaries / coastal outline inspiration */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.02]" xmlns="http://www.w3.org/2000/svg">
        <path d="M 100 0 L 150 200 L 80 400 L 200 600 L 150 800" fill="none" stroke="#0f172a" strokeWidth="4" strokeLinejoin="round" />
        <path d="M 80 0 L 130 200 L 60 400 L 180 600 L 130 800" fill="none" stroke="#0f172a" strokeWidth="1" strokeLinejoin="round" />
        <rect x="300" y="200" width="400" height="300" fill="none" stroke="#0f172a" strokeWidth="1" strokeDasharray="8 8" />
      </svg>
      
      {/* Analytical crosshairs / monitoring points */}
      <div className="absolute top-[30%] left-[40%] w-4 h-4 opacity-[0.1]">
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-slate-900" />
        <div className="absolute top-0 left-1/2 w-[1px] h-full bg-slate-900" />
        <div className="absolute inset-0 border border-slate-900 rounded-full scale-150" />
      </div>
      
      {/* Soft overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent" />
    </div>
  )
}
