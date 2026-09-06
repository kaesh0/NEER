import { Icon } from '../../icons/index.js'
import StatusBadge from '../ui/StatusBadge.jsx'
import { getMapData, getLocation } from '../../data/mock/fishermanData.js'
import { useTranslation } from '../../i18n/translations.js';

/**
 * MapPlaceholder — enhanced with JSON map data.
 * Shows user location marker, PFZ zone markers, and legend.
 * Ready for future Mapbox/Leaflet integration.
 */
export default function MapPlaceholder({ data, height = '16rem', className = '' }) {
  const { t } = useTranslation()

  if (!data) return null
  const mapData = getMapData(data)
  const location = getLocation(data)

  return (
    <div
      className={`relative border border-neer-border rounded-[0.875rem] overflow-hidden bg-chart-sea ${className}`}
      style={{ minHeight: height }}
      role="img"
      aria-label="Marine map showing fishing zones and your location"
    >
      {/* ── Decorative map background ── */}
      <div className="absolute inset-0" aria-hidden="true">
        <svg viewBox="0 0 400 200" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          {/* Ocean base */}
          <rect width="400" height="200" fill="#dcecf4" />
          {/* Coastline */}
          <path d="M0 120 Q50 100 100 110 T200 105 T300 95 T400 100 L400 200 L0 200Z" fill="#e9edf1" opacity="0.6" />
          <path d="M0 130 Q80 115 160 120 T320 110 T400 115 L400 200 L0 200Z" fill="#d3e3ee" opacity="0.4" />
          {/* Grid lines */}
          <line x1="100" y1="0" x2="100" y2="200" stroke="#d9e2ec" strokeWidth="0.5" strokeDasharray="4 4" />
          <line x1="200" y1="0" x2="200" y2="200" stroke="#d9e2ec" strokeWidth="0.5" strokeDasharray="4 4" />
          <line x1="300" y1="0" x2="300" y2="200" stroke="#d9e2ec" strokeWidth="0.5" strokeDasharray="4 4" />
          <line x1="0" y1="66" x2="400" y2="66" stroke="#d9e2ec" strokeWidth="0.5" strokeDasharray="4 4" />
          <line x1="0" y1="133" x2="400" y2="133" stroke="#d9e2ec" strokeWidth="0.5" strokeDasharray="4 4" />

          {/* User location marker (blue pin) */}
          <circle cx="200" cy="90" r="6" fill="#146f92" opacity="0.8" />
          <circle cx="200" cy="90" r="10" fill="#146f92" opacity="0.15" />
          <text x="200" y="80" textAnchor="middle" fontSize="8" fill="#0d345a" fontWeight="600">You</text>

          {/* PFZ Zone markers (teal circles) */}
          <circle cx="170" cy="88" r="5" fill="#0f766e" opacity="0.7" stroke="#0f766e" strokeWidth="1" strokeDasharray="2 2" />
          <text x="170" y="78" textAnchor="middle" fontSize="6" fill="#0f766e">PFZ 1</text>

          <circle cx="155" cy="105" r="5" fill="#0f766e" opacity="0.5" stroke="#0f766e" strokeWidth="1" strokeDasharray="2 2" />
          <text x="155" y="118" textAnchor="middle" fontSize="6" fill="#0f766e">PFZ 2</text>

          {/* Distance lines */}
          <line x1="200" y1="90" x2="170" y2="88" stroke="#0f766e" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.4" />
          <line x1="200" y1="90" x2="155" y2="105" stroke="#0f766e" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3" />
        </svg>
      </div>

      {/* ── Toolbar ── */}
      <div className="absolute top-3 right-3 flex flex-col gap-1 z-10" aria-hidden="true">
        <button className="flex items-center justify-center w-10 h-10 bg-white/90 border border-neer-border rounded-[0.5rem] text-neer-ink-secondary hover:bg-white transition-colors shadow-neer-xs" disabled title="Zoom in">
          <Icon name="search" size={16} />
        </button>
        <button className="flex items-center justify-center w-10 h-10 bg-white/90 border border-neer-border rounded-[0.5rem] text-neer-ink-secondary hover:bg-white transition-colors shadow-neer-xs" disabled title="Layers">
          <Icon name="layers" size={16} />
        </button>
        <button className="flex items-center justify-center w-10 h-10 bg-white/90 border border-neer-border rounded-[0.5rem] text-neer-ink-secondary hover:bg-white transition-colors shadow-neer-xs" disabled title="My location">
          <Icon name="location" size={16} />
        </button>
      </div>

      {/* ── Location label ── */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-white/90 px-2.5 py-1.5 rounded-[0.5rem] shadow-neer-xs border border-neer-border">
        <Icon name="location" size={14} className="text-neer-ocean-600" />
        <span className="text-neer-xs font-medium text-neer-ink">{location.name}</span>
      </div>

      {/* ── Legend ── */}
      <div className="absolute bottom-3 left-3 flex gap-2 flex-wrap z-10">
        <div className="flex items-center gap-1.5 bg-white/90 px-2 py-1 rounded text-neer-xs text-neer-ink-secondary shadow-neer-xs">
          <span className="w-2 h-2 rounded-full bg-neer-ocean-600" />
          You
        </div>
        <div className="flex items-center gap-1.5 bg-white/90 px-2 py-1 rounded text-neer-xs text-neer-ink-secondary shadow-neer-xs">
          <span className="w-2 h-2 rounded-full bg-neer-teal-600" />
          {t('PFZ')}
        </div>
        <StatusBadge status="favourable" size="sm" />
        <StatusBadge status="caution" size="sm" />
      </div>

      {/* ── Source tag ── */}
      <div className="absolute bottom-3 right-3 text-neer-xs text-neer-ink-muted z-10 bg-white/80 px-2 py-1 rounded">
        {mapData.layers.length} layers · {mapData.status}
      </div>
    </div>
  )
}
