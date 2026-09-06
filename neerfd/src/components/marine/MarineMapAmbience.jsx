import React from 'react'
import { useTranslation } from '../../i18n/translations.js';

export default function MarineMapAmbience() {
  const { t } = useTranslation()

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none bg-slate-100">
      {/* Deeper ocean tone for the map backdrop framing */}
      <div className="absolute inset-0 opacity-[0.1]" style={{ background: 'radial-gradient(circle at center, #bae6fd 0%, #cbd5e1 100%)' }} />
      
      {/* Subtle cartographic grid frame */}
      <div 
        className="absolute inset-0 opacity-[0.04]" 
        style={{ backgroundImage: 'linear-gradient(#0ea5e9 1px, transparent 1px), linear-gradient(90deg, #0ea5e9 1px, transparent 1px)', backgroundSize: '100px 100px', backgroundPosition: 'center center' }}
      />
      
      {/* Map interface corner brackets */}
      <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-slate-400 opacity-30" />
      <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-slate-400 opacity-30" />
      <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-slate-400 opacity-30" />
      <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-slate-400 opacity-30" />
    </div>
  )
}
