import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { getMapData, getAreaPriorities, getHazards } from '../../data/mock/authorityData.js'
import StatusBadge from '../ui/StatusBadge.jsx'
import { useTranslation } from '../../i18n/translations.js';

// Fix Leaflet's default icon path issues in React/Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const getPriorityColor = (priority) => {
  switch (priority) {
    case 'high': return '#ef4444' // red
    case 'medium': return '#f59e0b' // amber
    case 'low': return '#10b981' // green
    default: return '#64748b' // slate
  }
}

const authorityIcon = (color) => {
  return new L.DivIcon({
    className: 'bg-transparent',
    html: `<div style="background-color: ${color}; width: 18px; height: 18px; border-radius: 4px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); transition: all 0.2s;"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

function MapFocusController({ focusPoint }) {
  const { t } = useTranslation()

  const map = useMap()

  useEffect(() => {
    if (focusPoint) {
      if (focusPoint.type === 'area') {
        map.flyTo([focusPoint.lat, focusPoint.lng], 10, { animate: true, duration: 1.5 })
      } else if (focusPoint.type === 'hazard') {
        map.flyTo([focusPoint.lat, focusPoint.lng], 11, { animate: true, duration: 1.5 })
      } else if (focusPoint.type === 'region') {
        map.flyTo([focusPoint.lat, focusPoint.lng], 8, { animate: true, duration: 1.5 })
      }
    }
  }, [focusPoint, map])

  return null
}

function MapInteractionHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng)
    }
  })
  return null
}

export default function AuthorityInteractiveMap({ data, height = '100%', className = '', focusPoint = null, onNavigate, setExploredLocation }) {
  const { t } = useTranslation()

  const [clickedPoint, setClickedPoint] = useState(null)

  if (!data) return null;

  const mapData = getMapData(data)
  const areaPriorities = getAreaPriorities(data)
  const hazards = getHazards(data)

  const centerLat = mapData.viewport.center[0] || 76.35
  const centerLng = mapData.viewport.center[1] || 9.85
  // Leaflet uses [lat, lng], but the JSON provided center as [76.35, 9.85] which looks like [Lng, Lat] for Kerala (approx 9.85 N, 76.35 E).
  // So let's flip it for Leaflet.
  const mapCenter = [mapData.viewport.center[1], mapData.viewport.center[0]]

  // Since we don't have polygons in the mock, we'll place markers for the priority areas.
  // Approximate coordinates for the coasts:
  const areaCoords = {
    'ernakulam-coast': [10.0, 76.2],
    'alappuzha-coast': [9.5, 76.3],
    'thrissur-coast': [10.5, 76.1]
  }

  const handleInspectLocation = () => {

    if (clickedPoint && setExploredLocation) {
      setExploredLocation({ lat: clickedPoint.lat, lng: clickedPoint.lng })
      setClickedPoint(null)
    }
  }

  return (
    <div className={`relative rounded-xl overflow-hidden border border-neer-border z-0 ${className}`} style={{ height: height === '100%' ? '100%' : height, minHeight: '400px', width: '100%' }}>
      <MapContainer
        center={mapCenter}
        zoom={mapData.viewport.zoom || 8}
        scrollWheelZoom={false}
        className="z-0"
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="opacity-80 grayscale-[50%]"
        />

        <MapFocusController focusPoint={focusPoint} />
        <MapInteractionHandler onMapClick={setClickedPoint} />

        {/* Selected Point Marker */}
        {clickedPoint && (
          <Marker position={clickedPoint} icon={authorityIcon('#3b82f6')}>
            <Popup className="neer-popup" autoPan={false}>
              <div className="font-bold text-slate-500 text-xs mb-1 uppercase tracking-widest">{t('Selected Location')}</div>
              <div className="text-neer-navy-900 font-bold mb-3 font-mono">
                {clickedPoint.lat.toFixed(4)}° N<br/>{clickedPoint.lng.toFixed(4)}° E
              </div>
              <button
                onClick={handleInspectLocation}
                className="w-full py-2 bg-slate-800 text-white text-xs font-semibold rounded hover:bg-slate-700 transition-colors"
              >
                {t('Inspect this location')}
              </button>
            </Popup>
          </Marker>
        )}

        {/* Priority Areas */}
        {areaPriorities.map((area) => {
          const coords = areaCoords[area.areaId]
          if (!coords) return null
          
          return (
            <Marker key={area.areaId} position={coords} icon={authorityIcon(getPriorityColor(area.priority))}>
              <Popup className="neer-popup">
                <div className="font-bold text-neer-navy-900 mb-1">{t(area.label)}</div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold tracking-wider uppercase text-neer-ink-secondary">{t('Priority')}: {t(area.priority)}</span>
                </div>
                <StatusBadge status={area.status} size="sm" />
                <div className="mt-3">
                  <button
                    onClick={() => onNavigate && onNavigate('areas', { type: 'area', id: area.areaId, lat: coords[0], lng: coords[1] })}
                    className="text-neer-xs font-semibold text-neer-ocean-600 hover:underline transition-all"
                  >
                    {t('View Details')}
                  </button>
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* Hazards */}
        {hazards.map((h, i) => {
          // Approximate locations for watch areas
          let hCoords = mapCenter
          if (h.id.includes('ernakulam')) hCoords = [10.0, 75.9]
          if (h.id.includes('alappuzha')) hCoords = [9.5, 76.0]

          return (
            <Circle
              key={`h-${h.id}`}
              center={hCoords}
              radius={12000}
              pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.1, dashArray: '4, 4' }}
            >
              <Popup>
                <div className="font-bold text-neer-caution mb-1">{t(h.title)}</div>
                <div className="text-neer-xs text-neer-ink-secondary mb-2">{t(h.message)}</div>
                <div className="text-[10px] text-neer-ink-muted uppercase tracking-wider mb-2">{t(h.severity)}</div>
                <button
                  onClick={() => onNavigate && onNavigate('alerts', { type: 'hazard', id: h.id, lat: hCoords[0], lng: hCoords[1] })}
                  className="text-neer-xs font-semibold text-neer-ocean-600 hover:underline transition-all"
                >
                  {t('View Details')}
                </button>
              </Popup>
            </Circle>
          )
        })}

      </MapContainer>

      {/* Authority Map Legend */}
      <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur px-4 py-3 rounded-xl shadow-neer-md border border-neer-border z-[400] text-neer-xs pointer-events-none">
        <div className="font-bold text-neer-navy-900 mb-2 tracking-wider uppercase text-[10px]">{t('Regional Priority')}</div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-[#ef4444] border border-white shadow-sm" />
            <span className="text-neer-ink font-medium">{t('High')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-[#f59e0b] border border-white shadow-sm" />
            <span className="text-neer-ink font-medium">{t('Medium')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-[#10b981] border border-white shadow-sm" />
            <span className="text-neer-ink font-medium">{t('Low')}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-3 h-3 rounded-full border-2 border-dashed border-[#f59e0b] bg-[#f59e0b]/10" />
            <span className="text-neer-ink-secondary">{t('Hazard Watch Area')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
