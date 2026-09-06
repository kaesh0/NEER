import React from 'react'
import { useTranslation } from '../../i18n/translations.js';

export default function AuthorityOverviewAmbience() {
  const { t } = useTranslation()

  return (
    <div className="fixed inset-0 pointer-events-none -z-10 bg-[#f4f7fb] overflow-hidden">
      {/* Subtle regional monitoring / data grid motifs */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#475569 1px, transparent 1px), linear-gradient(90deg, #475569 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      {/* Soft oceanographic contour lines */}
      <svg className="absolute w-full h-full opacity-10 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
        <path d="M-200,300 C150,100 400,600 800,200 S1200,800 1600,400" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="5,5" />
        <path d="M-100,500 C250,300 500,800 900,400 S1300,1000 1700,600" fill="none" stroke="currentColor" strokeWidth="0.5" />
        <circle cx="800" cy="200" r="150" fill="none" stroke="currentColor" strokeWidth="0.5" />
        <circle cx="800" cy="200" r="250" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4,4" />
      </svg>
      {/* Coastal surveillance gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#eef2f6]" />
    </div>
  )
}
