import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, Polygon, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { getMapData, getAreaPriorities, getHazards } from '../../data/mock/authorityData.js'
import StatusBadge from '../ui/StatusBadge.jsx'
import { useTranslation } from '../../i18n/translations.js'
import { getCoastalPlaceName } from '../../utils/coastalGeocoder.js'

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

const pulsingRadarIcon = new L.DivIcon({
  className: 'custom-radar-marker',
  html: `
    <div class="relative flex items-center justify-center w-12 h-12 -ml-6 -mt-6">
      <div class="absolute w-10 h-10 rounded-full border-2 border-dashed border-amber-500 bg-amber-400/20 animate-radar"></div>
      <div class="relative w-5 h-5 rounded-full bg-amber-500/80 border-2 border-white shadow-md flex items-center justify-center">
        <span class="w-2 h-2 rounded-full bg-white"></span>
      </div>
    </div>
  `,
  iconSize: [0, 0],
})

// Kerala Maritime Zone EEZ Boundary line matching code.html
const KERALA_COASTAL_BOUNDARY = [
  [11.8745, 75.3704],
  [11.2588, 75.6804],
  [10.5, 75.8],
  [9.9312, 76.0],
  [9.4981, 76.2],
  [8.5241, 76.7],
  [8.0883, 77.4],
]

// Marine Protected Area geofence
const PROTECTED_ZONE = [
  [10.05, 76.15],
  [10.05, 76.32],
  [9.85, 76.32],
  [9.85, 76.15],
]

// Strict bounding box for the Indian subcontinent, coastal maritime waters
const INDIA_BOUNDS = [
  [4.0, 65.0],
  [38.0, 98.5],
]

function MapFocusController({ focusPoint, center, mapRef }) {
  const map = useMap()

  useEffect(() => {
    if (mapRef) {
      mapRef.current = map
    }
    const timer = setTimeout(() => {
      map.invalidateSize()
    }, 150)
    return () => clearTimeout(timer)
  }, [map, mapRef])

  useEffect(() => {
    if (focusPoint) {
      if (focusPoint.type === 'area') {
        map.flyTo([focusPoint.lat, focusPoint.lng], 10, { animate: true, duration: 1.5 })
      } else if (focusPoint.type === 'hazard') {
        map.flyTo([focusPoint.lat, focusPoint.lng], 11, { animate: true, duration: 1.5 })
      } else if (focusPoint.type === 'region') {
        map.flyTo([focusPoint.lat, focusPoint.lng], 8, { animate: true, duration: 1.5 })
      }
    } else if (center && center[0] != null && center[1] != null) {
      map.flyTo(center, map.getZoom(), { animate: true, duration: 1.0 })
    }
  }, [focusPoint, center?.[0], center?.[1], map])

  return null
}

function MapInteractionHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng)
    },
  })
  return null
}

export default function AuthorityInteractiveMap({
  data,
  height = '100%',
  className = '',
  focusPoint = null,
  onNavigate,
  setExploredLocation,
  showLegend = true,
  showRecenter = true,
}) {
  const { t } = useTranslation()
  const [clickedPoint, setClickedPoint] = useState(null)
  const mapInstanceRef = useRef(null)

  if (!data) return null

  const mapData = getMapData(data)
  const areaPriorities = getAreaPriorities(data)
  const hazards = getHazards(data)

  // Center coordinate: Kochi [9.9312, 76.2673]
  const mapCenter = [
    mapData?.viewport?.center?.[1] || 9.9312,
    mapData?.viewport?.center?.[0] || 76.2673,
  ]

  const areaCoords = {
    'ernakulam-coast': [9.9312, 76.2673],
    'alappuzha-coast': [9.4981, 76.3388],
    'thrissur-coast': [10.5276, 76.2144],
  }

  const handleInspectLocation = () => {
    if (clickedPoint && setExploredLocation) {
      setExploredLocation({ lat: clickedPoint.lat, lng: clickedPoint.lng })
      setClickedPoint(null)
    }
  }

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(mapCenter, 9, { animate: true, duration: 0.8 })
    }
  }

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border border-slate-200 z-0 ${className}`}
      style={{ height: height === '100%' ? '100%' : height, minHeight: '320px', width: '100%' }}
    >
      <MapContainer
        center={mapCenter}
        zoom={mapData.viewport.zoom || 8}
        minZoom={4}
        maxBounds={INDIA_BOUNDS}
        maxBoundsViscosity={1.0}
        scrollWheelZoom={true}
        className="z-0"
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <TileLayer
          attribution='&copy; <a href="http://www.openseamap.org">OpenSeaMap</a> contributors'
          url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
          maxZoom={18}
          opacity={0.85}
        />

        <MapFocusController focusPoint={focusPoint} center={mapCenter} mapRef={mapInstanceRef} />
        <MapInteractionHandler onMapClick={setClickedPoint} />

        {/* Coastal Maritime EEZ Boundary */}
        <Polyline
          positions={KERALA_COASTAL_BOUNDARY}
          pathOptions={{
            color: '#0369a1',
            weight: 3,
            opacity: 0.7,
            dashArray: '8, 8',
          }}
        />

        {/* Protected Zone Geofence */}
        <Polygon
          positions={PROTECTED_ZONE}
          pathOptions={{
            color: '#d97706',
            fillColor: '#f59e0b',
            fillOpacity: 0.15,
            weight: 2,
            dashArray: '4, 4',
          }}
        >
          <Popup className="neer-popup">
            <div className="font-bold text-amber-800 text-xs">Demo Marine Protected Area</div>
            <div className="text-[11px] text-slate-600 mt-0.5">Commercial fishing prohibited inside boundary</div>
          </Popup>
        </Polygon>

        {/* Pulsing Radar Marker at Kochi */}
        <Marker position={mapCenter} icon={pulsingRadarIcon}>
          <Popup className="neer-popup">
            <div className="font-bold text-slate-900 text-xs">Priority Area: Kochi, Kerala coast</div>
            <div className="text-[11px] text-amber-700 font-medium mt-0.5">Status: Caution · 2 Risk Factors</div>
          </Popup>
        </Marker>

        {/* Selected Point Marker */}
        {clickedPoint && (
          <Marker position={clickedPoint} icon={authorityIcon('#3b82f6')}>
            <Popup className="neer-popup" autoPan={false}>
              <div className="font-bold text-slate-500 text-xs mb-1 uppercase tracking-widest">{t('Selected Location')}</div>
              <div className="text-slate-900 font-bold text-sm mb-0.5">
                {getCoastalPlaceName(clickedPoint.lat, clickedPoint.lng)}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mb-3">
                {clickedPoint.lat.toFixed(4)}° N, {clickedPoint.lng.toFixed(4)}° E
              </div>
              <button
                onClick={handleInspectLocation}
                className="w-full py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-700 transition-colors"
              >
                {t('Inspect this location')}
              </button>
            </Popup>
          </Marker>
        )}

        {/* Priority Areas Markers */}
        {areaPriorities.map((area) => {
          const coords = areaCoords[area.areaId]
          if (!coords) return null

          return (
            <Marker key={area.areaId} position={coords} icon={authorityIcon(getPriorityColor(area.priority))}>
              <Popup className="neer-popup">
                <div className="font-bold text-slate-900 mb-1">{t(area.label)}</div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold tracking-wider uppercase text-slate-600">
                    {t('Priority')}: {t(area.priority)}
                  </span>
                </div>
                <StatusBadge status={area.status} size="sm" />
                <div className="mt-3">
                  <button
                    onClick={() => onNavigate && onNavigate('areas', { type: 'area', id: area.areaId, lat: coords[0], lng: coords[1] })}
                    className="text-xs font-semibold text-sky-600 hover:underline transition-all"
                  >
                    {t('View Details')}
                  </button>
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* Hazards */}
        {hazards.map((h) => {
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
              <Popup className="neer-popup">
                <div className="font-bold text-amber-600 mb-1">{t(h.title)}</div>
                <div className="text-xs text-slate-600 mb-2">{t(h.message)}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">{t(h.severity)}</div>
                <button
                  onClick={() => onNavigate && onNavigate('alerts', { type: 'hazard', id: h.id, lat: hCoords[0], lng: hCoords[1] })}
                  className="text-xs font-semibold text-sky-600 hover:underline transition-all"
                >
                  {t('View Details')}
                </button>
              </Popup>
            </Circle>
          )
        })}
      </MapContainer>

      {/* Recenter Button */}
      {showRecenter && (
        <button
          onClick={handleRecenter}
          className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur hover:bg-slate-100 p-2 rounded-lg border border-slate-200 shadow-sm text-slate-700 transition"
          title={t('Recenter on Kochi')}
          type="button"
        >
          <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="7" strokeWidth="2" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
          </svg>
        </button>
      )}

      {/* Floating Regional Priority Legend */}
      {showLegend && (
        <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur border border-slate-200/90 rounded-lg p-3 text-[11px] shadow-md z-[1000] pointer-events-none space-y-1.5">
          <div className="font-bold uppercase tracking-wider text-slate-500 text-[9px] mb-1">{t('Regional Priority')}</div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-slate-700 font-medium">{t('High')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-700 font-medium">{t('Medium')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-700 font-medium">{t('Low')}</span>
          </div>
          <div className="flex items-center gap-2 pt-0.5 border-t border-slate-200">
            <span className="w-3 h-3 rounded-full border border-dashed border-amber-500 flex items-center justify-center">
              <span className="w-1 h-1 rounded-full bg-amber-500" />
            </span>
            <span className="text-slate-700 font-medium">{t('Hazard Watch Area')}</span>
          </div>
        </div>
      )}
    </div>
  )
}
