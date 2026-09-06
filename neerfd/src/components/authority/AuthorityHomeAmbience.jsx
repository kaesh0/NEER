import { useTranslation } from '../../i18n/translations.js';
export default function AuthorityHomeAmbience() {
  const { t } = useTranslation()

  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] bg-[#f8fafc] overflow-hidden">
      {/* Soft regional gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-neer-surface-alt to-transparent opacity-50" />
      
      {/* Grid pattern suggesting geospatial layout */}
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{ backgroundImage: 'linear-gradient(#0f172a 1px, transparent 1px), linear-gradient(90deg, #0f172a 1px, transparent 1px)', backgroundSize: '100px 100px' }} 
      />
      
      {/* Subtle coastal curve (using an SVG path for abstract coastline) */}
      <svg className="absolute right-0 top-0 h-full w-[40%] opacity-[0.04] text-neer-navy-900" preserveAspectRatio="none" viewBox="0 0 100 100">
        <path d="M100 0 L50 0 C60 20 40 40 60 60 C80 80 50 100 70 100 L100 100 Z" fill="currentColor" />
      </svg>
      
      {/* Abstract radar/monitoring rings */}
      <div className="absolute left-[80%] top-[10%] w-[600px] h-[600px] rounded-full border border-neer-navy-900 opacity-[0.04] -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute left-[80%] top-[10%] w-[400px] h-[400px] rounded-full border border-neer-navy-900 opacity-[0.05] -translate-x-1/2 -translate-y-1/2" />
      
      <div className="absolute bottom-0 left-0 w-full h-[30%] bg-gradient-to-t from-[#f8fafc] to-transparent" />
    </div>
  )
}
