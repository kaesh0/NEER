export default function MapAmbience() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden bg-neer-surface-alt/30" aria-hidden="true">
      <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
        {/* Subtle grid lines for a cartographic feel */}
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#000" strokeWidth="0.5" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#grid)" />
        {/* Soft radial gradient to draw focus to the center */}
        <radialGradient id="oceanGrad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.2" />
        </radialGradient>
        <rect width="100%" height="100%" fill="url(#oceanGrad)" />
        {/* Subtle contour lines */}
        <path d="M 0,200 Q 150,150 300,200 T 600,100 T 900,150 T 1200,200" fill="none" stroke="#0ea5e9" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
        <path d="M 0,400 Q 200,300 400,450 T 800,200 T 1200,300" fill="none" stroke="#0ea5e9" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.3" />
      </svg>
    </div>
  )
}
