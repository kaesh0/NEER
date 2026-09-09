import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../../icons/index.js';
import { useTranslation } from '../../i18n/translations.js';
import { INDIAN_COASTAL_PLACES, findNearestCoastalPlace, classifyLocation, detectUserCurrentLocation } from '../../utils/coastalGeocoder.js';

export const PRESET_LOCATIONS = [
  { name: 'Kochi, Kerala', lat: 9.9312, lng: 76.2673, label: 'Kochi, Kerala', state: 'Kerala' },
  { name: 'Digha, West Bengal', lat: 21.6266, lng: 87.5074, label: 'Digha, West Bengal', state: 'West Bengal' },
  { name: 'Veraval, Gujarat', lat: 20.9071, lng: 70.3632, label: 'Veraval, Gujarat', state: 'Gujarat' },
  { name: 'Porbandar, Gujarat', lat: 21.6417, lng: 69.6293, label: 'Porbandar, Gujarat', state: 'Gujarat' },
  { name: 'Visakhapatnam, Andhra Pradesh', lat: 17.6868, lng: 83.2185, label: 'Visakhapatnam (Vizag), AP', state: 'Andhra Pradesh' },
  { name: 'Mumbai, Maharashtra', lat: 18.9220, lng: 72.8347, label: 'Mumbai, Maharashtra', state: 'Maharashtra' },
  { name: 'Chennai, Tamil Nadu', lat: 13.0827, lng: 80.2707, label: 'Chennai, Tamil Nadu', state: 'Tamil Nadu' },
  { name: 'Mangalore, Karnataka', lat: 12.9141, lng: 74.8560, label: 'Mangaluru, Karnataka', state: 'Karnataka' },
  { name: 'Panaji, Goa', lat: 15.4909, lng: 73.8278, label: 'Panaji / Mormugao, Goa', state: 'Goa' },
  { name: 'Paradip, Odisha', lat: 20.3167, lng: 86.6167, label: 'Paradip, Odisha', state: 'Odisha' },
  { name: 'Alappuzha, Kerala', lat: 9.4981, lng: 76.3388, label: 'Alappuzha, Kerala', state: 'Kerala' },
  { name: 'Kozhikode, Kerala', lat: 11.2588, lng: 75.7804, label: 'Kozhikode, Kerala', state: 'Kerala' },
  { name: 'Kavaratti, Lakshadweep', lat: 10.5669, lng: 72.6420, label: 'Kavaratti, Lakshadweep', state: 'Lakshadweep' },
  { name: 'Port Blair, Andaman', lat: 11.6234, lng: 92.7265, label: 'Port Blair, Andaman & Nicobar', state: 'Andaman & Nicobar' },
];

export const MARITIME_CORRIDORS = [
  { name: 'Kochi Port · Lakshadweep', lat: 9.9312, lng: 76.2673, label: 'Kochi → Lakshadweep Passage' },
  { name: 'Mumbai · Goa Passage', lat: 18.9220, lng: 72.8347, label: 'Mumbai → Goa Coastal Fairway' },
  { name: 'Chennai · Port Blair Corridor', lat: 13.0827, lng: 80.2707, label: 'Chennai → Port Blair Deep Sea' },
  { name: 'Visakhapatnam · Paradip Fairway', lat: 17.6868, lng: 83.2185, label: 'Vizag → Paradip Bay Transit' },
];

export default function LocationSelector({
  currentLocation,
  onLocationChange,
  persona,
  locationName = '',
  className = '',
}) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('location_open') === 'true'
    }
    return false
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const dropdownRef = useRef(null);

  const isMarine = persona === 'marine' || persona === 'maritime_operator';
  const displayLocation = locationName || currentLocation?.name || (currentLocation?.isDetecting ? t('Detecting Location...') : (isMarine ? t('Coastal Fairway') : t('Select Location')));

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setGeoError(null);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectLocation = (loc) => {
    if (onLocationChange) {
      onLocationChange(loc);
    }
    setIsOpen(false);
    setGeoError(null);
    setSearchQuery('');
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    const classified = classifyLocation({ name: query });
    if (classified) {
      handleSelectLocation(classified);
    } else {
      handleSelectLocation({ name: query, isCoastal: false });
    }
  };

  const handleUseMyLocation = async () => {
    setGeoLoading(true);
    setGeoError(null);

    const detected = await detectUserCurrentLocation({ timeoutMs: 8000 });
    setGeoLoading(false);

    if (detected) {
      handleSelectLocation(detected);
    } else {
      setGeoError(t('Unable to retrieve your current location. Please choose a location from the list.'));
    }
  };

  const suggestions = isMarine ? MARITIME_CORRIDORS : PRESET_LOCATIONS;
  const filteredSuggestions = searchQuery.trim()
    ? (isMarine
        ? MARITIME_CORRIDORS.filter(
            (c) =>
              c.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
              c.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : INDIAN_COASTAL_PLACES.filter(
            (p) =>
              p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              p.admin.toLowerCase().includes(searchQuery.toLowerCase())
          ).slice(0, 6).map((p) => ({
            name: `${p.name}, ${p.admin}`,
            label: `${p.name}, ${p.admin}`,
            lat: p.lat,
            lng: p.lng,
          })))
    : suggestions;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button Matching code.html Style */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setGeoError(null);
        }}
        className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 bg-white text-slate-700 rounded-full text-xs font-medium border border-slate-200/80 shadow-sm hover:border-slate-300 hover:bg-slate-50 transition cursor-pointer"
        title={t('Click to change location or use GPS')}
        type="button"
        aria-expanded={isOpen}
      >
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
        <svg
          className="w-3.5 h-3.5 text-sky-600"
          fill="none"
          height="24"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="24"
        >
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span className="font-medium text-slate-800 truncate max-w-[140px] md:max-w-[200px]">
          {displayLocation}
        </span>
        <svg
          className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-[500] p-4 animate-in fade-in zoom-in-95 duration-150">
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                <svg className="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  {isMarine ? t('Select Maritime Corridor') : t('Select Coastal Location')}
                </h4>
                <p className="text-[10px] text-slate-400 font-mono">
                  INCOIS &amp; GIS Calibrated
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              aria-label="Close"
              type="button"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search Input Bar */}
          <form onSubmit={handleCustomSubmit} className="mb-3">
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isMarine ? t('Filter corridor or transit...') : t('Search port, town (e.g. Mumbai, Vizag)...')}
                className="w-full text-xs pl-8 pr-14 py-2 border border-slate-200 rounded-xl outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-slate-800 placeholder-slate-400 font-medium"
                autoFocus
              />
              <svg
                className="w-4 h-4 absolute left-2.5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" strokeWidth="2" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {searchQuery.trim() && (
                <button
                  type="submit"
                  className="absolute right-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#0284c7] hover:bg-sky-700 text-white transition shadow-sm cursor-pointer"
                >
                  {t('Go')}
                </button>
              )}
            </div>
          </form>

          {/* Locations / Ports List */}
          <div className="space-y-1 mb-3 max-h-52 overflow-y-auto neer-scroll">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 pb-1">
              {isMarine ? t('Available Passages') : t('Quick-Select Major Ports')}
            </div>
            {filteredSuggestions.map((loc) => {
              const isSelected =
                displayLocation.toLowerCase().includes(loc.name.toLowerCase()) ||
                loc.name.toLowerCase().includes(displayLocation.toLowerCase()) ||
                (currentLocation?.lat === loc.lat && currentLocation?.lng === loc.lng);

              return (
                <button
                  key={loc.name}
                  onClick={() => handleSelectLocation(loc)}
                  type="button"
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition cursor-pointer ${
                    isSelected
                      ? 'bg-sky-50 text-sky-800 font-bold border border-sky-200 shadow-2xs'
                      : 'hover:bg-slate-50 text-slate-700 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-sky-600' : 'bg-slate-300'}`} />
                    <span className="truncate">{loc.label || loc.name}</span>
                  </div>
                  {isSelected ? (
                    <svg className="w-4 h-4 text-sky-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    loc.lat != null && (
                      <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                        {loc.lat.toFixed(1)}°N, {loc.lng.toFixed(1)}°E
                      </span>
                    )
                  )}
                </button>
              );
            })}
            {filteredSuggestions.length === 0 && (
              <button
                type="button"
                onClick={handleCustomSubmit}
                className="w-full text-left p-3 rounded-xl bg-sky-50 text-sky-700 text-xs font-semibold hover:bg-sky-100 transition"
              >
                {t('Analyze custom location')}: "{searchQuery.trim()}" →
              </button>
            )}
          </div>

          {/* GPS Current Location Detection Button */}
          {!isMarine && (
            <div className="pt-2.5 border-t border-slate-100">
              <button
                onClick={handleUseMyLocation}
                disabled={geoLoading}
                type="button"
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl transition disabled:opacity-50 cursor-pointer shadow-2xs"
              >
                <svg
                  className={`w-3.5 h-3.5 text-sky-600 ${geoLoading ? 'animate-spin' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <polygon points="3 11 22 2 13 21 11 13 3 11" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{geoLoading ? t('Acquiring GPS coordinates...') : t('Use My Current GPS Location')}</span>
              </button>

              {geoError && (
                <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-700 leading-tight flex items-start gap-1.5">
                  <Icon name="alertTriangle" size={14} className="flex-shrink-0 mt-0.5" />
                  <span className="flex-1">{geoError}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
