export default function AlertsAmbience() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden bg-neer-surface-alt/30" aria-hidden="true">
      <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="alertGrad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          <pattern id="dotGrid" width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="#64748b" opacity="0.4" />
          </pattern>
        </defs>
        {/* Monitoring grid */}
        <rect width="100%" height="100%" fill="url(#dotGrid)" />
        {/* Faint awareness rings */}
        <circle cx="50%" cy="50%" r="400" fill="none" stroke="url(#alertGrad)" strokeWidth="1" strokeDasharray="10 15" opacity="0.5" />
        <circle cx="50%" cy="50%" r="600" fill="none" stroke="url(#alertGrad)" strokeWidth="0.5" strokeDasharray="5 10" opacity="0.3" />
        <circle cx="90%" cy="10%" r="200" fill="url(#alertGrad)" opacity="0.4" />
      </svg>
    </div>
  )
}
