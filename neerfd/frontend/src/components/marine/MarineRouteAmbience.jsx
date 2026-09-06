import React from 'react'
import { useTranslation } from '../../i18n/translations.js';

export default function MarineRouteAmbience() {
  const { t } = useTranslation()

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none bg-slate-50">
      {/* Soft gradient base */}
      <div className="absolute inset-0 opacity-[0.2]" style={{ background: 'linear-gradient(to bottom right, #f8fafc, #e0f2fe, #f1f5f9)' }} />
      
      {/* Nautical route/navigation inspiration - faint dashed arcs/lines */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.15]" xmlns="http://www.w3.org/2000/svg">
        <path d="M -100 200 C 200 -50, 600 400, 1200 100" fill="none" stroke="#0284c7" strokeWidth="2" strokeDasharray="8 12" />
        <path d="M -200 600 C 300 200, 700 800, 1400 300" fill="none" stroke="#0284c7" strokeWidth="1" strokeDasharray="4 8" />
        
        {/* Subtle compass rose accent top right */}
        <g transform="translate(calc(100% - 150), 100) scale(0.8)">
          <circle cx="0" cy="0" r="80" fill="none" stroke="#0284c7" strokeWidth="0.5" strokeDasharray="2 4" />
          <circle cx="0" cy="0" r="70" fill="none" stroke="#0f172a" strokeWidth="0.2" />
          <path d="M 0 -85 L 5 -20 L 85 0 L 5 20 L 0 85 L -5 20 L -85 0 L -5 -20 Z" fill="none" stroke="#0284c7" strokeWidth="0.5" />
        </g>
      </svg>
      
      {/* Light texture mask */}
      <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px]" />
    </div>
  )
}
