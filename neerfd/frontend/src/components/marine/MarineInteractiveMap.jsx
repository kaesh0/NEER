import React, { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { context, mapData, hazards } from '../../data/mock/marineData.js'
import { useTranslation } from '../../i18n/translations.js'
import { getCoastalPlaceName } from '../../utils/coastalGeocoder.js'

// Fix Leaflet's default icon path issues in React/Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const dotIcon = (color, size = 14) => {
  return new L.DivIcon({
    className: 'bg-transparent',
    html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); transition: all 0.2s;"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

const pulseIcon = new L.DivIcon({
  className: 'bg-transparent',
  html: `<div class="relative w-5 h-5 flex items-center justify-center">
          <div class="absolute inset-0 bg-amber-500 rounded-full animate-ping opacity-75"></div>
          <div class="relative w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-white shadow-md"></div>
         </div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

// Route waypoints: Kochi Port -> Lakshadweep Kavaratti
export const MARITIME_ROUTE_COORDS = [
  [9.9312, 76.2673],  // Kochi Port
  [10.02, 75.85],     // Segment 1: Channel exit
  [10.12, 75.10],     // Segment 2: Continental Shelf Edge
  [10.25, 74.20],     // Segment 3: Swell Surge Corridor
  [10.42, 73.40],     // Segment 4: Archipelago Approach
  [10.56, 72.64],     // Lakshadweep (Kavaratti Pier)
]

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
      if (focusPoint.type === 'location') {
        map.flyTo([focusPoint.lat, focusPoint.lng], focusPoint.zoom || 11, { animate: true, duration: 1.5 })
      } else if (focusPoint.type === 'hazard') {
        map.flyTo([10.25, 74.20], 8, { animate: true, duration: 1.5 })
      } else if (focusPoint.type === 'segment') {
        map.flyTo([focusPoint.lat || 10.25, focusPoint.lng || 74.20], 9, { animate: true, duration: 1.5 })
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

export default function MarineInteractiveMap({
  height = '100%',
  className = '',
  focusPoint = null,
  onNavigate,
  setExploredLocation,
  exploredLocation,
  showLegend = true,
  showRecenter = true,
  selectedLocation,
}) {
  const { t } = useTranslation()
  const mapInstanceRef = useRef(null)
  const [clickedPoint, setClickedPoint] = useState(null)

  const isKerala = !selectedLocation?.name || selectedLocation.name.toLowerCase().includes('kerala') || selectedLocation.name.toLowerCase().includes('kochi')
  const originLat = selectedLocation?.lat ?? 9.9312
  const originLng = selectedLocation?.lng ?? 76.2673
  const originName = selectedLocation?.name || 'Kochi Port'
  const originShortName = originName.split(',')[0].trim()

  const isBayOfBengal = originLng > 80

  const routeWaypoints = isKerala ? MARITIME_ROUTE_COORDS : [
    [originLat, originLng],
    [originLat + (isBayOfBengal ? -0.15 : -0.12), originLng + (isBayOfBengal ? 0.35 : -0.35)],
    [originLat + (isBayOfBengal ? -0.35 : -0.28), originLng + (isBayOfBengal ? 0.75 : -0.75)],
    [originLat + (isBayOfBengal ? -0.60 : -0.45), originLng + (isBayOfBengal ? 1.25 : -1.25)],
    [originLat + (isBayOfBengal ? -0.85 : -0.65), originLng + (isBayOfBengal ? 1.75 : -1.75)],
    [originLat + (isBayOfBengal ? -1.15 : -0.88), originLng + (isBayOfBengal ? 2.25 : -2.25)],
  ]

  const mapCenter = isKerala ? [10.25, 74.45] : routeWaypoints[2]
  const cautionCenter = isKerala ? [10.25, 74.20] : routeWaypoints[3]
  const destCoords = isKerala ? [10.56, 72.64] : routeWaypoints[5]
  const destName = isKerala ? 'Lakshadweep (Kavaratti)' : `${originShortName} Deepwater Fairway`

  const activePoint = exploredLocation || clickedPoint

  const handleCheckLocation = () => {
    if (activePoint && setExploredLocation) {
      setExploredLocation({ lat: activePoint.lat, lng: activePoint.lng })
      setClickedPoint(null)
    }
  }

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(mapCenter, isKerala ? 7 : 8, { animate: true, duration: 0.8 })
    }
  }

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border border-slate-200 z-0 ${className}`}
      style={{ height: height === '100%' ? '100%' : height, minHeight: '320px', width: '100%' }}
    >
      <MapContainer
        center={mapCenter}
        zoom={isKerala ? 7 : 8}
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

        {/* Primary Voyage Navigational Fairway Route */}
        <Polyline
          positions={routeWaypoints}
          pathOptions={{
            color: '#0284c7',
            weight: 3.5,
            opacity: 0.85,
            dashArray: '6, 6',
          }}
        />

        {/* Segment 3 Swell Caution Zone Area */}
        <Circle
          center={cautionCenter}
          radius={28000}
          pathOptions={{
            color: '#f59e0b',
            fillColor: '#f59e0b',
            fillOpacity: 0.18,
            weight: 2,
            dashArray: '4, 4',
          }}
        >
          <Popup className="neer-popup">
            <div className="font-bold text-amber-700 text-xs">{t('Segment 3: Swell Surge Advisory')}</div>
            <div className="text-[11px] text-slate-600 mt-1">{t('Wave heights up to 1.9m with 11.4s period')}</div>
            <div className="text-[10px] text-amber-800 font-semibold mt-1">{t('Action: Reduce speed to 12 knots')}</div>
          </Popup>
        </Circle>

        {/* Origin Port */}
        <Marker position={[originLat, originLng]} icon={dotIcon('#0284c7', 16)}>
          <Popup className="neer-popup">
            <div className="font-bold text-slate-900 text-sm">{t('Origin')}: {originName}</div>
            <div className="text-xs text-slate-500 font-mono mt-0.5">{originLat.toFixed(4)}° N, {originLng.toFixed(4)}° E</div>
            <div className="text-xs text-sky-700 font-semibold mt-1">{t('Departure: 06:00 IST')} ({originShortName} {t('Berth')})</div>
          </Popup>
        </Marker>

        {/* Intermediate Waypoints */}
        <Marker position={routeWaypoints[1]} icon={dotIcon('#94a3b8', 10)}>
          <Popup className="neer-popup">
            <div className="font-bold text-slate-800 text-xs">Waypoint MP-01</div>
            <div className="text-[10px] text-slate-500">Segment 1 Exit (Channel)</div>
          </Popup>
        </Marker>

        <Marker position={routeWaypoints[2]} icon={dotIcon('#94a3b8', 10)}>
          <Popup className="neer-popup">
            <div className="font-bold text-slate-800 text-xs">Waypoint MP-02</div>
            <div className="text-[10px] text-slate-500">Continental Shelf Edge</div>
          </Popup>
        </Marker>

        {/* Caution Waypoint MP-03 */}
        <Marker position={cautionCenter} icon={pulseIcon}>
          <Popup className="neer-popup">
            <div className="font-bold text-amber-700 text-xs">⚠️ Waypoint MP-03 (Segment 3)</div>
            <div className="text-[11px] text-slate-600 mt-0.5">Wave: 1.9m • Swell surge active</div>
          </Popup>
        </Marker>

        <Marker position={routeWaypoints[4]} icon={dotIcon('#94a3b8', 10)}>
          <Popup className="neer-popup">
            <div className="font-bold text-slate-800 text-xs">Waypoint MP-04</div>
            <div className="text-[10px] text-slate-500">Deepwater Approach Corridor</div>
          </Popup>
        </Marker>

        {/* Destination */}
        <Marker position={destCoords} icon={dotIcon('#10b981', 16)}>
          <Popup className="neer-popup">
            <div className="font-bold text-slate-900 text-sm">{t('Destination')}: {destName}</div>
            <div className="text-xs text-slate-500 font-mono mt-0.5">{destCoords[0].toFixed(4)}° N, {destCoords[1].toFixed(4)}° E</div>
            <div className="text-xs text-emerald-700 font-semibold mt-1">Arrival: 14:30 IST (Fairway Mark)</div>
          </Popup>
        </Marker>

        {/* Selected Explored Point */}
        {activePoint && (
          <Marker position={[activePoint.lat, activePoint.lng]} icon={dotIcon('#6366f1', 16)}>
            <Popup autoPan={false}>
              <div className="flex flex-col gap-2 min-w-[200px] p-1">
                <div>
                  <div className="font-bold text-slate-900 text-sm">
                    {getCoastalPlaceName(activePoint.lat, activePoint.lng)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                    {activePoint.lat.toFixed(4)}° N, {activePoint.lng.toFixed(4)}° E
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleCheckLocation}
                    className="flex-1 py-1.5 bg-sky-600 text-white text-xs font-semibold rounded-lg hover:bg-sky-700 transition-colors"
                    type="button"
                  >
                    {t('Check this location')}
                  </button>
                  <button
                    onClick={() => {
                      setClickedPoint(null)
                      if (setExploredLocation) setExploredLocation(null)
                    }}
                    className="flex-1 py-1.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-white transition-colors"
                    type="button"
                  >
                    {t('Cancel')}
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Recenter Button */}
      {showRecenter && (
        <button
          onClick={handleRecenter}
          className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur hover:bg-slate-100 p-2 rounded-lg border border-slate-200 shadow-sm text-slate-700 transition"
          title={t('Recenter Voyage Track')}
          type="button"
        >
          <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="7" strokeWidth="2" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
          </svg>
        </button>
      )}

      {/* Cartography Legend matching code.html */}
      {showLegend && (
        <div className="absolute bottom-28 right-4 md:bottom-32 md:right-6 bg-white/95 backdrop-blur-md border border-slate-200 p-3.5 rounded-xl shadow-lg w-64 text-xs font-medium z-[1000] pointer-events-none space-y-2 transition-all">
          <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-500 block mb-1">
            {t('Cartography Legend')}
          </span>
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-sky-600 ring-2 ring-sky-200" />
            <span className="text-slate-800 font-semibold">{t('Origin')} ({originShortName})</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
            <span className="text-slate-800 font-semibold">{t('Destination')} ({isKerala ? 'Lakshadweep' : `${originShortName} Fairway`})</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 ring-2 ring-amber-200" />
            <span className="text-slate-800 font-semibold">{t('Caution Swell Zone (Segment 3)')}</span>
          </div>
        </div>
      )}
    </div>
  )
}
