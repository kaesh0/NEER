export default function ZonesAmbience() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden bg-neer-surface-alt/30" aria-hidden="true">
      <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="radar" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.1" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Soft underwater circular motifs */}
        <circle cx="20%" cy="40%" r="300" fill="url(#radar)" />
        <circle cx="80%" cy="70%" r="400" fill="url(#radar)" opacity="0.6" />
        {/* Bathymetry patterns */}
        <path d="M 0,600 Q 300,500 600,600 T 1200,500 T 1800,600" fill="none" stroke="#0284c7" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3" />
        <path d="M -100,550 Q 250,450 550,550 T 1150,450 T 1750,550" fill="none" stroke="#0284c7" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.2" />
      </svg>
    </div>
  )
}
