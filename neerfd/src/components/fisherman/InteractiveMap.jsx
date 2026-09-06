import React, { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet'
import { AdaptiveTileLayer } from '../../lib/mapTiles.jsx';
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { getLocation, getFishingZones, getHazards, getMapData } from '../../data/mock/fishermanData.js'
import StatusBadge from '../ui/StatusBadge.jsx'
import { useTranslation } from '../../i18n/translations.js';

// Fix Leaflet's default icon path issues in React/Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const customIcon = (color) => {
  return new L.DivIcon({
    className: 'bg-transparent',
    html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); transition: all 0.2s;"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

const pulseIcon = new L.DivIcon({
  className: 'bg-transparent',
  html: `<div class="relative w-4 h-4">
          <div class="absolute inset-0 bg-neer-ocean-600 rounded-full"></div>
          <div class="absolute inset-0 bg-neer-ocean-600 rounded-full animate-ping opacity-75"></div>
          <div class="absolute inset-0 border-2 border-white rounded-full"></div>
         </div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

function MapFocusController({ focusPoint }) {
  const { t } = useTranslation()

  const map = useMap()

  useEffect(() => {
    // Fix leafet container sizing bug on mount/flex-grow
    const timer = setTimeout(() => {
      map.invalidateSize()
    }, 150)
    return () => clearTimeout(timer)
  }, [map])

  useEffect(() => {
    if (focusPoint) {
      if (focusPoint.type === 'location') {
        map.flyTo([focusPoint.lat, focusPoint.lng], focusPoint.zoom || 12, { animate: true, duration: 1.5 })
      } else if (focusPoint.type === 'zone') {
        map.flyTo([focusPoint.lat, focusPoint.lng], 11, { animate: true, duration: 1.5 })
      } else if (focusPoint.type === 'hazard') {
        map.flyTo([focusPoint.lat, focusPoint.lng], 10, { animate: true, duration: 1.5 })
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

export default function InteractiveMap({ data, height = '100%', className = '', focusPoint = null, onNavigate, setExploredLocation, exploredLocation }) {
  const { t } = useTranslation()
  const [clickedPoint, setClickedPoint] = useState(null)
  
  // Refs for programmatic popup opening
  const zoneRefs = useRef({})
  const hazardRefs = useRef({})

  useEffect(() => {
    if (focusPoint) {
      if (focusPoint.type === 'zone' && focusPoint.id && zoneRefs.current[focusPoint.id]) {
        setTimeout(() => zoneRefs.current[focusPoint.id].openPopup(), 1500)
      } else if (focusPoint.type === 'hazard' && focusPoint.id && hazardRefs.current[focusPoint.id]) {
        setTimeout(() => hazardRefs.current[focusPoint.id].openPopup(), 1500)
      }
    }
  }, [focusPoint])

  if (!data) return null

  const location = getLocation(data)
  const fishingZones = getFishingZones(data)
  const hazards = getHazards(data)
  const mapData = getMapData(data)

  const centerLat = Array.isArray(mapData.center) ? mapData.center[1] : (mapData.center?.lat || 9.9312)
  const centerLng = Array.isArray(mapData.center) ? mapData.center[0] : (mapData.center?.lng || 76.2673)
  const initialLat = exploredLocation ? exploredLocation.lat : (location.lat || centerLat)
  const initialLng = exploredLocation ? exploredLocation.lng : (location.lng || centerLng)
  
  const activePoint = exploredLocation || clickedPoint

  const handleCheckLocation = () => {
    if (activePoint && setExploredLocation) {
      setExploredLocation({ lat: activePoint.lat, lng: activePoint.lng })
      setClickedPoint(null)
      // DO NOT call onNavigate('home') - stay on map
    }
  }

  return (
    <div className={`relative rounded-[0.875rem] overflow-hidden border border-neer-border z-0 ${className}`} style={{ height: height === '100%' ? '100%' : height, minHeight: '400px', width: '100%' }}>
      <MapContainer
        center={[initialLat, initialLng]}
        zoom={mapData.zoom || 10}
        scrollWheelZoom={false}
        className="z-0"
        style={{ height: '100%', width: '100%' }}
      >
        <AdaptiveTileLayer />

        <MapFocusController focusPoint={focusPoint} />
        <MapInteractionHandler onMapClick={setClickedPoint} />

        {/* User Location */}
        {location.lat && location.lng && (
          <Marker position={[location.lat, location.lng]} icon={customIcon('#0284c7')}>
            <Popup className="neer-popup">
              <div className="font-bold text-neer-navy-900 mb-1">{t(location.name)}</div>
              <div className="text-neer-xs text-neer-ink-secondary">{t('Current Location')}</div>
            </Popup>
          </Marker>
        )}

        {/* Hazards */}
        {hazards.map((h, i) => {
          // If hazard has coordinates we'd plot it. Mocking coordinates slightly off coast for demo if not in JSON.
          const hazardLat = centerLat - 0.2 - (i * 0.1)
          const hazardLng = centerLng - 0.2 - (i * 0.1)
          return (
            <Circle
              key={`h-${h.id}`}
              center={[hazardLat, hazardLng]}
              radius={8000}
              pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.2 }}
              ref={(r) => { if(r) hazardRefs.current[h.id] = r }}
            >
              <Popup>
                <div className="font-bold text-neer-caution mb-1">{t(h.title)}</div>
                <div className="text-neer-xs text-neer-ink-secondary mb-2">{t(h.message)}</div>
                <button
                  onClick={() => onNavigate && onNavigate('alerts')}
                  className="text-neer-xs font-semibold text-neer-ocean-600 hover:underline transition-all"
                >
                  {t('View Details')}
                </button>
              </Popup>
            </Circle>
          )
        })}

        {/* PFZ Zones */}
        {fishingZones.map((z, i) => {
          const zLat = z.lat || centerLat + ((z.distance / 111) * Math.cos((z.bearing || 0) * (Math.PI / 180)))
          const zLng = z.lng || centerLng + ((z.distance / 111) * Math.sin((z.bearing || 0) * (Math.PI / 180)))

          return (
            <Marker key={z.id} position={[zLat, zLng]} icon={customIcon('#0f766e')} ref={(r) => { if(r) zoneRefs.current[z.id] = r }}>
              <Popup>
                <div className="font-bold text-neer-navy-900 mb-1">{t(z.name)}</div>
                <div className="text-neer-xs text-neer-ink-secondary mb-2">
                  ~{z.distance} km · {t(z.direction)}
                </div>
                <StatusBadge status={z.status} size="sm" />
                <div className="mt-2">
                  <button
                    onClick={() => onNavigate && onNavigate('zones')}
                    className="text-neer-xs font-semibold text-neer-ocean-600 hover:underline transition-all"
                  >
                    {t('View Details')}
                  </button>
                </div>
              </Popup>
            </Marker>
          )
        })}
        
        {/* Explored Location Click Marker */}
        {activePoint && (
          <Marker position={[activePoint.lat, activePoint.lng]} icon={pulseIcon}>
            <Popup autoPan={false}>
              <div className="flex flex-col gap-2 min-w-[200px] p-1">
                <div>
                  <div className="font-bold text-neer-navy-900 text-sm">{t('Explore this location')}</div>
                  <div className="text-[10px] text-neer-ink-secondary mt-0.5 font-mono">
                    {activePoint.lat.toFixed(4)}° N, {activePoint.lng.toFixed(4)}° E
                  </div>
                </div>
                <p className="text-xs text-neer-ink-muted">
                  {t('Would you like to check marine conditions for this location?')}
                </p>
                <div className="flex gap-2 mt-2">
                  <button 
                    onClick={handleCheckLocation}
                    className="flex-1 py-1.5 bg-neer-ocean-600 text-white text-xs font-semibold rounded hover:bg-neer-ocean-700 hover:-translate-y-0.5 transition-all"
                  >
                    {t('Check this location')}
                  </button>
                  <button 
                    onClick={() => {
                      setClickedPoint(null)
                      if (setExploredLocation) setExploredLocation(null)
                    }}
                    className="flex-1 py-1.5 bg-neer-surface-alt text-neer-ink-secondary text-xs font-semibold rounded border border-neer-border hover:bg-white transition-all"
                  >
                    {t('Cancel')}
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Custom Map Legend */}
      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur px-3 py-2 rounded-lg shadow-neer-md border border-neer-border z-[400] text-neer-xs pointer-events-none">
        <div className="font-semibold text-neer-ink mb-1.5 border-b border-neer-border pb-1">{t('Legend')}</div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#0284c7] border border-white shadow-sm" />
            <span className="text-neer-ink-secondary">{t('Your Location')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#0f766e] border border-white shadow-sm" />
            <span className="text-neer-ink-secondary">{t('PFZ')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#ef4444] opacity-50" />
            <span className="text-neer-ink-secondary">{t('Hazard Area')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
