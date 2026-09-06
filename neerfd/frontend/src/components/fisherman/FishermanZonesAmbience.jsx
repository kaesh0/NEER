import React from 'react'
import { useTranslation } from '../../i18n/translations.js';

export default function FishermanZonesAmbience() {
  const { t } = useTranslation()

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none bg-sky-50/30">
      {/* Soft natural ocean gradient */}
      <div className="absolute inset-0 opacity-[0.4]" style={{ background: 'linear-gradient(to bottom right, #f0f9ff, #e0f2fe, #bae6fd)' }} />
      
      {/* Subtle topographic / zone contour lines */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
        <path d="M -100 300 Q 200 100, 500 400 T 1200 200" fill="none" stroke="#0284c7" strokeWidth="1" />
        <path d="M -50 400 Q 250 200, 550 500 T 1300 300" fill="none" stroke="#0284c7" strokeWidth="0.5" strokeDasharray="4 4" />
        <path d="M 0 500 Q 300 300, 600 600 T 1400 400" fill="none" stroke="#0284c7" strokeWidth="1" />
      </svg>
      
      {/* Abstract subtle nets/coastal markers feel */}
      <div 
        className="absolute inset-0 opacity-[0.02]" 
        style={{ backgroundImage: 'repeating-linear-gradient(45deg, #0284c7 0, #0284c7 1px, transparent 1px, transparent 10px), repeating-linear-gradient(-45deg, #0284c7 0, #0284c7 1px, transparent 1px, transparent 10px)', backgroundSize: '40px 40px' }}
      />
    </div>
  )
}
