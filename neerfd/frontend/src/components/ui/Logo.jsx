import React from 'react'

export function LogoIcon({ size = 28, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="NEER Logo"
    >
      <defs>
        <linearGradient id="neerWaveGrad" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="50%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="neerDeepGrad" x1="8" y1="20" x2="32" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0369a1" />
          <stop offset="100%" stopColor="#0c4a6e" />
        </linearGradient>
      </defs>

      {/* Outer Radar / Nautical Ring */}
      <circle cx="20" cy="20" r="18" stroke="url(#neerWaveGrad)" strokeWidth="2" strokeDasharray="4 2" opacity="0.4" />

      {/* Deep Ocean Crest (Back Wave) */}
      <path
        d="M6 25C10 21 14 20 18 22C22 24 25 27 30 25C33 23.8 35.5 22 37 20C36 29 29 36 20 36C13.5 36 7.8 31.8 6 25Z"
        fill="url(#neerDeepGrad)"
      />

      {/* Primary Crest Wave */}
      <path
        d="M4 21C8 15 13 13 18 16C23 19 27 21 31 17C33.5 14.5 35 11 35 11C37 14 38 17.5 38 21C38 29.8366 30.8366 37 22 37C14.5 37 8.2 31.8 6.5 24.5C5.5 23.5 4.5 22.2 4 21Z"
        fill="url(#neerWaveGrad)"
        fillOpacity="0.85"
      />

      {/* Compass Star / Maritime Beacon */}
      <polygon points="20,5 22.5,15 32,17.5 22.5,20 20,30 17.5,20 8,17.5 17.5,15" fill="#ffffff" />
      <polygon points="20,8 21.8,15.5 29,17.5 21.8,19.5 20,27 18.2,19.5 11,17.5 18.2,15.5" fill="#0284c7" opacity="0.75" />
      <circle cx="20" cy="17.5" r="2.2" fill="#ffffff" />
      <circle cx="20" cy="17.5" r="1.2" fill="#0369a1" />
    </svg>
  )
}

export default function Logo({ size = 32, showWordmark = true, kicker = '', className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoIcon size={size} className="flex-shrink-0 transition-transform duration-200 group-hover:scale-105" />
      {showWordmark && (
        <div className="flex flex-col justify-center select-none">
          {kicker && (
            <span className="text-[0.6rem] font-extrabold uppercase tracking-[0.16em] text-neer-ocean-600 leading-none mb-0.5">
              {kicker}
            </span>
          )}
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black tracking-tight text-neer-navy-900 font-sans">
              NEER
            </span>
            <span className="text-[0.65rem] font-bold text-neer-ocean-600 uppercase tracking-wider bg-neer-ocean-50 border border-neer-ocean-200 px-1.5 py-0.5 rounded-full">
              Marine
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
