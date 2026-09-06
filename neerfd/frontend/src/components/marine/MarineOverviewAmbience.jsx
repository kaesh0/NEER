import React from 'react'
import { useTranslation } from '../../i18n/translations.js';

export default function MarineOverviewAmbience() {
  const { t } = useTranslation()

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none bg-slate-50">
      {/* Soft ocean depth gradient */}
      <div className="absolute inset-0 opacity-[0.15]" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #f8fafc 40%, #dbeafe 100%)' }} />
      
      {/* Deep sea accent glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[70%] bg-sky-300/20 blur-[120px] rounded-full mix-blend-multiply" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[60%] bg-blue-300/15 blur-[100px] rounded-full mix-blend-multiply" />
      
      {/* Very faint nautical/bathymetry line texture */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="marine-topo" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
            <path d="M 0 50 Q 25 25, 50 50 T 100 50" fill="none" stroke="currentColor" strokeWidth="0.5" />
            <path d="M 0 70 Q 25 45, 50 70 T 100 70" fill="none" stroke="currentColor" strokeWidth="0.25" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="url(#marine-topo)" />
      </svg>
      
      {/* Subtle grid pattern to reinforce professional intelligence feel */}
      <div 
        className="absolute inset-0 opacity-[0.02]" 
        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #0f172a 1px, transparent 0)', backgroundSize: '48px 48px' }}
      />
    </div>
  )
}
