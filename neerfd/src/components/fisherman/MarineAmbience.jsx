import { useTranslation } from '../../i18n/translations.js';
/**
 * MarineAmbience — refined: predominantly light ocean atmosphere.
 *
 * Background is clean and light, but fish are now clearly visible
 * while remaining behind the UI.
 */
export default function MarineAmbience({ className = '' }) {
  const { t } = useTranslation()

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden z-0 ${className}`}
      aria-hidden="true"
    >
      {/* ── Soft light gradient: predominantly white/aqua ── */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #f4f9fb 0%, #e6eff4 40%, #d8e8f0 70%, #cae0eb 100%)',
        }}
      />

      {/* ── Very subtle water texture patches ── */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
        <ellipse cx="180" cy="120" rx="100" ry="50" fill="#add0e6" opacity="0.15" />
        <ellipse cx="620" cy="180" rx="80" ry="40" fill="#a4cadf" opacity="0.12" />
        <ellipse cx="400" cy="350" rx="120" ry="55" fill="#9bc4d8" opacity="0.10" />
        <ellipse cx="300" cy="500" rx="90" ry="40" fill="#92bed1" opacity="0.08" />
      </svg>

      {/* ── Subtle wave lines ── */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
        <path d="M0 480 Q100 470 200 480 T400 480 T600 480 T800 480" fill="none" stroke="#92b8d0" strokeWidth="1.5" opacity="0.2" />
        <path d="M0 520 Q150 510 300 520 T600 520 T800 520" fill="none" stroke="#87afc8" strokeWidth="1.5" opacity="0.15" />
      </svg>

      {/* ── Fish — now clearly visible but still elegant ── */}

      {/* Fish 1 — top right corner, facing right */}
      <svg
        className="absolute"
        style={{ top: '6%', right: '10%', width: '1.6rem', opacity: 0.25, animation: 'neer-drift-x 24s ease-in-out infinite alternate' }}
        viewBox="0 0 32 16" fill="none"
      >
        <path d="M2 8 C6 4 12 4 16 8 C12 12 6 12 2 8Z" fill="#2f6294" />
        <path d="M20 8 L28 4 V12Z" fill="#2f6294" />
      </svg>

      {/* Fish 2 — bottom left, facing left */}
      <svg
        className="absolute"
        style={{ bottom: '15%', left: '6%', width: '1.8rem', opacity: 0.3, animation: 'neer-drift-x 28s ease-in-out infinite alternate-reverse' }}
        viewBox="0 0 32 16" fill="none"
      >
        <path d="M30 8 C26 4 18 4 12 8 C18 12 26 12 30 8Z" fill="#1d4d7e" />
        <path d="M12 8 L4 4 V12Z" fill="#1d4d7e" />
      </svg>

      {/* Fish 3 — bottom right, facing right */}
      <svg
        className="absolute"
        style={{ bottom: '10%', right: '12%', width: '1.4rem', opacity: 0.25, animation: 'neer-drift-x 22s ease-in-out infinite alternate' }}
        viewBox="0 0 32 16" fill="none"
      >
        <path d="M2 8 C6 4 12 4 16 8 C12 12 6 12 2 8Z" fill="#2f6294" />
        <path d="M20 8 L28 4 V12Z" fill="#2f6294" />
      </svg>

      {/* Fish 4 — mid left edge */}
      <svg
        className="absolute"
        style={{ top: '45%', left: '3%', width: '1.5rem', opacity: 0.2, animation: 'neer-drift-x 30s ease-in-out infinite alternate-reverse' }}
        viewBox="0 0 32 16" fill="none"
      >
        <path d="M30 8 C26 4 18 4 12 8 C18 12 26 12 30 8Z" fill="#5d89b6" />
        <path d="M12 8 L4 4 V12Z" fill="#5d89b6" />
      </svg>

      {/* Fish 5 — top left area */}
      <svg
        className="absolute"
        style={{ top: '12%', left: '25%', width: '1.3rem', opacity: 0.18, animation: 'neer-drift-x 26s ease-in-out infinite alternate' }}
        viewBox="0 0 32 16" fill="none"
      >
        <path d="M2 8 C6 4 12 4 16 8 C12 12 6 12 2 8Z" fill="#5d89b6" />
        <path d="M20 8 L28 4 V12Z" fill="#5d89b6" />
      </svg>

      {/* ── Very subtle bubble dots near bottom ── */}
      <svg className="absolute bottom-12 right-[20%] w-2 h-2 opacity-20" viewBox="0 0 12 12">
        <circle cx="6" cy="6" r="5" fill="none" stroke="#75a5c0" strokeWidth="1.5" />
      </svg>
      <svg className="absolute bottom-18 left-[30%] w-3 h-3 opacity-15" viewBox="0 0 12 12">
        <circle cx="6" cy="6" r="5" fill="none" stroke="#75a5c0" strokeWidth="1.5" />
      </svg>
    </div>
  )
}
