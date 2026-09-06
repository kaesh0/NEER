import React, { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { context, mapData, hazards } from '../../data/mock/marineData.js'
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
      } else if (focusPoint.type === 'hazard') {
        // We do NOT invent hazard geometry, just zoom out generally
        map.flyTo([10.2, 74.5], 7, { animate: true, duration: 1.5 })
      } else if (focusPoint.type === 'poi' && focusPoint.coordinates) {
        map.flyTo(focusPoint.coordinates, 10, { animate: true, duration: 1.5 })
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

export default function MarineInteractiveMap({ height = '100%', className = '', focusPoint = null, onNavigate, setExploredLocation, exploredLocation }) {
  const { t } = useTranslation()

  const centerLat = mapData.center ? mapData.center[1] : 10.2
  const centerLng = mapData.center ? mapData.center[0] : 74.5
  const initialLat = exploredLocation ? exploredLocation.lat : centerLat
  const initialLng = exploredLocation ? exploredLocation.lng : centerLng
  
  const [clickedPoint, setClickedPoint] = useState(null)
  
  const activePoint = exploredLocation || clickedPoint

  const handleCheckLocation = () => {


    if (activePoint && setExploredLocation) {
      setExploredLocation({ lat: activePoint.lat, lng: activePoint.lng })
      setClickedPoint(null)
    }
  }

  const originCoords = context.origin.coordinates
  const destCoords = context.destination.coordinates

  return (
    <div className={`relative rounded-[0.875rem] overflow-hidden border border-neer-border z-0 ${className}`} style={{ height: height === '100%' ? '100%' : height, minHeight: '400px', width: '100%' }}>
      <MapContainer
        center={[initialLat, initialLng]}
        zoom={mapData.zoom || 7}
        scrollWheelZoom={false}
        className="z-0"
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        <MapFocusController focusPoint={focusPoint} />
        <MapInteractionHandler onMapClick={setClickedPoint} />

        {/* Origin */}
        {originCoords && (
          <Marker position={[originCoords[1], originCoords[0]]} icon={customIcon('#0ea5e9')}>
            <Popup className="neer-popup">
              <div className="font-bold text-neer-navy-900 mb-1">{t(context.origin.label)}</div>
              <div className="text-neer-xs text-neer-ink-secondary">{t('Voyage Origin')}</div>
            </Popup>
          </Marker>
        )}

        {/* Destination */}
        {destCoords && (
          <Marker position={[destCoords[1], destCoords[0]]} icon={customIcon('#10b981')}>
            <Popup className="neer-popup">
              <div className="font-bold text-neer-navy-900 mb-1">{t(context.destination.label)}</div>
              <div className="text-neer-xs text-neer-ink-secondary">{t('Voyage Destination')}</div>
            </Popup>
          </Marker>
        )}
        
        {/* Note: NO fake route line is drawn as route line geometry is EMPTY */}
        
        {/* Explored Location Click Marker */}
        {activePoint && (
          <Marker position={[activePoint.lat, activePoint.lng]} icon={pulseIcon}>
            <Popup autoPan={false}>
              <div className="flex flex-col gap-2 min-w-[200px] p-1">
                <div>
                  <div className="font-bold text-neer-navy-900 text-sm">{t('Selected Location')}</div>
                  <div className="text-[10px] text-neer-ink-secondary mt-0.5 font-mono">
                    {activePoint.lat.toFixed(4)}° N, {activePoint.lng.toFixed(4)}° E
                  </div>
                </div>
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

      {/* Map Target / Hazard Info Panel Overlay */}
      {focusPoint && focusPoint.type === 'hazard' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur px-4 py-3 rounded-xl shadow-neer-lg border border-neer-border z-[400] text-sm pointer-events-auto max-w-sm w-full text-center">
          <div className="font-bold text-amber-700 mb-1">{t('Active Hazard: Swell-Surge')}</div>
          <div className="text-neer-ink-secondary text-xs mb-2">{t('Exact segment geometry is unavailable')}</div>
          <p className="text-neer-navy-800 text-xs">{t('Review conditions before transiting this segment.')}</p>
        </div>
      )}

      {/* Custom Map Legend */}
      <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur px-3 py-2 rounded-lg shadow-neer-md border border-neer-border z-[400] text-neer-xs pointer-events-none">
        <div className="font-semibold text-neer-ink mb-1.5 border-b border-neer-border pb-1">{t('Legend')}</div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#0ea5e9] border border-white shadow-sm" />
            <span className="text-neer-ink-secondary">{t('Origin')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#10b981] border border-white shadow-sm" />
            <span className="text-neer-ink-secondary">{t('Destination')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
