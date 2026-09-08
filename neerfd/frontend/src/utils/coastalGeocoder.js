/**
 * Fast client-side coastal reverse geocoder for Indian waters.
 * Resolves (lat, lng) to the nearest Indian coastal port, town, or coastal water sector in < 0.1ms.
 */

export const INDIAN_COASTAL_PLACES = [
  // West Coast - Gujarat
  { name: 'Dwarka', admin: 'Gujarat', lat: 22.2394, lng: 68.9678 },
  { name: 'Porbandar', admin: 'Gujarat', lat: 21.6417, lng: 69.6293 },
  { name: 'Veraval', admin: 'Gujarat', lat: 20.9071, lng: 70.3632 },
  { name: 'Diu', admin: 'Daman & Diu', lat: 20.7141, lng: 70.9822 },
  { name: 'Daman', admin: 'Daman & Diu', lat: 20.3974, lng: 72.8328 },
  { name: 'Surat Coast', admin: 'Gujarat', lat: 21.1702, lng: 72.8311 },
  // West Coast - Maharashtra
  { name: 'Mumbai', admin: 'Maharashtra', lat: 18.9667, lng: 72.8333 },
  { name: 'Alibag', admin: 'Maharashtra', lat: 18.6414, lng: 72.8722 },
  { name: 'Ratnagiri', admin: 'Maharashtra', lat: 16.9902, lng: 73.3120 },
  { name: 'Malvan', admin: 'Maharashtra', lat: 16.0617, lng: 73.4686 },
  // West Coast - Goa
  { name: 'Panaji', admin: 'Goa', lat: 15.4909, lng: 73.8278 },
  { name: 'Mormugao', admin: 'Goa', lat: 15.4167, lng: 73.8000 },
  // West Coast - Karnataka
  { name: 'Karwar', admin: 'Karnataka', lat: 14.8136, lng: 74.1298 },
  { name: 'Bhatkal', admin: 'Karnataka', lat: 13.9772, lng: 74.5511 },
  { name: 'Udupi / Malpe', admin: 'Karnataka', lat: 13.3409, lng: 74.7421 },
  { name: 'Mangalore', admin: 'Karnataka', lat: 12.8698, lng: 74.8426 },
  // West Coast - Kerala
  { name: 'Kannur', admin: 'Kerala', lat: 11.8745, lng: 75.3704 },
  { name: 'Kozhikode', admin: 'Kerala', lat: 11.2588, lng: 75.7804 },
  { name: 'Ponnani', admin: 'Kerala', lat: 10.7719, lng: 75.9252 },
  { name: 'Kochi', admin: 'Kerala', lat: 9.9312, lng: 76.2673 },
  { name: 'Alappuzha', admin: 'Kerala', lat: 9.4981, lng: 76.3388 },
  { name: 'Kollam', admin: 'Kerala', lat: 8.8932, lng: 76.6141 },
  { name: 'Vizhinjam', admin: 'Kerala', lat: 8.3820, lng: 76.9916 },
  // South Tip & East Coast - Tamil Nadu
  { name: 'Kanyakumari', admin: 'Tamil Nadu', lat: 8.0883, lng: 77.5385 },
  { name: 'Thoothukudi', admin: 'Tamil Nadu', lat: 8.7642, lng: 78.1348 },
  { name: 'Rameswaram', admin: 'Tamil Nadu', lat: 9.2876, lng: 79.3129 },
  { name: 'Nagapattinam', admin: 'Tamil Nadu', lat: 10.7672, lng: 79.8424 },
  { name: 'Puducherry', admin: 'Puducherry', lat: 11.9416, lng: 79.8083 },
  { name: 'Cuddalore', admin: 'Tamil Nadu', lat: 11.7480, lng: 79.7714 },
  { name: 'Chennai', admin: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
  // East Coast - Andhra Pradesh
  { name: 'Krishnapatnam', admin: 'Andhra Pradesh', lat: 14.2500, lng: 80.1167 },
  { name: 'Machilipatnam', admin: 'Andhra Pradesh', lat: 16.1875, lng: 81.1389 },
  { name: 'Kakinada', admin: 'Andhra Pradesh', lat: 16.9891, lng: 82.2475 },
  { name: 'Visakhapatnam', admin: 'Andhra Pradesh', lat: 17.6868, lng: 83.2185 },
  // East Coast - Odisha
  { name: 'Gopalpur', admin: 'Odisha', lat: 19.2600, lng: 84.9100 },
  { name: 'Puri', admin: 'Odisha', lat: 19.8133, lng: 85.8315 },
  { name: 'Paradip', admin: 'Odisha', lat: 20.3167, lng: 86.6167 },
  { name: 'Dhamra', admin: 'Odisha', lat: 20.7950, lng: 86.9650 },
  // East Coast - West Bengal
  { name: 'Digha', admin: 'West Bengal', lat: 21.6266, lng: 87.5074 },
  { name: 'Haldia', admin: 'West Bengal', lat: 22.0667, lng: 88.0694 },
  { name: 'Fraserganj', admin: 'West Bengal', lat: 21.5833, lng: 88.2500 },
  // Island Territories
  { name: 'Kavaratti', admin: 'Lakshadweep', lat: 10.5669, lng: 72.6420 },
  { name: 'Agatti', admin: 'Lakshadweep', lat: 10.8533, lng: 72.1931 },
  { name: 'Andrott', admin: 'Lakshadweep', lat: 10.8250, lng: 73.6667 },
  { name: 'Minicoy', admin: 'Lakshadweep', lat: 8.2833, lng: 73.0500 },
  { name: 'Port Blair', admin: 'Andaman & Nicobar', lat: 11.6233, lng: 92.7265 },
  { name: 'Car Nicobar', admin: 'Andaman & Nicobar', lat: 9.1500, lng: 92.8167 },
]

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371.0
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function findNearestCoastalPlace(lat, lng) {
  if (lat == null || lng == null) return null
  let closest = null
  let minDistance = Infinity
  for (const place of INDIAN_COASTAL_PLACES) {
    const dist = haversineKm(lat, lng, place.lat, place.lng)
    if (dist < minDistance) {
      minDistance = dist
      closest = place
    }
  }
  return closest
}

export function getCoastalPlaceName(lat, lng) {
  if (lat == null || lng == null) return 'Coastal Waters'

  let closest = null
  let minDistance = Infinity

  for (const place of INDIAN_COASTAL_PLACES) {
    const dist = haversineKm(lat, lng, place.lat, place.lng)
    if (dist < minDistance) {
      minDistance = dist
      closest = place
    }
  }

  if (!closest) {
    return `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`
  }

  const cityName = closest.name.split('/')[0].trim()
  const admin = closest.admin

  if (minDistance <= 8.0) {
    return `${closest.name}, ${admin}`
  } else if (minDistance <= 45.0) {
    return `Off ${cityName} Coast, ${admin}`
  } else {
    return `Off ${cityName} Coast (~${Math.round(minDistance)} km), ${admin}`
  }
}

/**
 * Authentic regional cultural greetings mapped to Indian coastal states & territories.
 */
export const COASTAL_GREETINGS = {
  'West Bengal': {
    salutation: 'Nomoshkar!',
    salutationHi: 'नमस्कार!',
    languageName: 'Bengali',
  },
  'Gujarat': {
    salutation: 'Namaste!',
    salutationHi: 'नमस्ते!',
    languageName: 'Gujarati',
  },
  'Daman & Diu': {
    salutation: 'Namaste!',
    salutationHi: 'नमस्ते!',
    languageName: 'Gujarati',
  },
  'Maharashtra': {
    salutation: 'Namaskar!',
    salutationHi: 'नमस्कार!',
    languageName: 'Marathi',
  },
  'Goa': {
    salutation: 'Namaskar!',
    salutationHi: 'नमस्कार!',
    languageName: 'Konkani',
  },
  'Karnataka': {
    salutation: 'Namaskara!',
    salutationHi: 'नमस्कार!',
    languageName: 'Kannada',
  },
  'Kerala': {
    salutation: 'Namaskaram!',
    salutationHi: 'नमस्कारम!',
    languageName: 'Malayalam',
  },
  'Tamil Nadu': {
    salutation: 'Vanakkam!',
    salutationHi: 'वणक्कम!',
    languageName: 'Tamil',
  },
  'Puducherry': {
    salutation: 'Vanakkam!',
    salutationHi: 'वणक्कम!',
    languageName: 'Tamil',
  },
  'Andhra Pradesh': {
    salutation: 'Namaskaram!',
    salutationHi: 'नमस्कारम!',
    languageName: 'Telugu',
  },
  'Odisha': {
    salutation: 'Namaskar!',
    salutationHi: 'नमस्कार!',
    languageName: 'Odia',
  },
  'Lakshadweep': {
    salutation: 'Namaskaram!',
    salutationHi: 'नमस्कारम!',
    languageName: 'Malayalam / Mahl',
  },
  'Andaman & Nicobar': {
    salutation: 'Namaste!',
    salutationHi: 'नमस्ते!',
    languageName: 'Hindi / Bengali',
  },
}

/**
 * Resolves location string or coordinates into culturally authentic regional greeting information.
 * Supports Digha/West Bengal ("Nomoshkar!"), Gujarat ("Namaste!"), Maharashtra/Goa/Odisha ("Namaskar!"),
 * Tamil Nadu ("Vanakkam!"), Kerala/Andhra Pradesh ("Namaskaram!"), Karnataka ("Namaskara!").
 */
export function getRegionalGreetingInfo(locationInput, lat, lng) {
  let matchedPlace = null
  let matchedAdmin = null

  // 1. Try finding by coordinates if valid numbers
  if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
    matchedPlace = findNearestCoastalPlace(lat, lng)
    if (matchedPlace) {
      matchedAdmin = matchedPlace.admin
    }
  }

  // 2. Try matching from locationInput string
  const locStr = typeof locationInput === 'string'
    ? locationInput
    : (locationInput?.name || locationInput?.label || '')

  if (!matchedPlace && locStr) {
    const lower = locStr.toLowerCase()
    matchedPlace = INDIAN_COASTAL_PLACES.find((p) =>
      lower.includes(p.name.toLowerCase()) ||
      p.name.toLowerCase().includes(lower.split(',')[0].trim())
    )
    if (matchedPlace) {
      matchedAdmin = matchedPlace.admin
    } else {
      for (const place of INDIAN_COASTAL_PLACES) {
        if (lower.includes(place.admin.toLowerCase())) {
          matchedAdmin = place.admin
          matchedPlace = place
          break
        }
      }
    }
  }

  // Admin fallback mapping
  const lowerStr = locStr.toLowerCase()
  const admin = matchedAdmin || (
    lowerStr.includes('bengal') || lowerStr.includes('digha') || lowerStr.includes('haldia') ? 'West Bengal'
    : lowerStr.includes('gujarat') || lowerStr.includes('veraval') || lowerStr.includes('porbandar') || lowerStr.includes('dwarka') ? 'Gujarat'
    : lowerStr.includes('tamil') || lowerStr.includes('chennai') || lowerStr.includes('tuticorin') || lowerStr.includes('rameswaram') ? 'Tamil Nadu'
    : lowerStr.includes('maharashtra') || lowerStr.includes('mumbai') ? 'Maharashtra'
    : lowerStr.includes('andhra') || lowerStr.includes('visakhapatnam') || lowerStr.includes('vizag') ? 'Andhra Pradesh'
    : lowerStr.includes('odisha') || lowerStr.includes('orissa') || lowerStr.includes('paradip') ? 'Odisha'
    : lowerStr.includes('goa') || lowerStr.includes('panaji') ? 'Goa'
    : lowerStr.includes('karnataka') || lowerStr.includes('mangalore') || lowerStr.includes('mangaluru') ? 'Karnataka'
    : lowerStr.includes('kerala') || lowerStr.includes('kochi') || lowerStr.includes('cochin') ? 'Kerala'
    : 'Kerala'
  )

  const greetingConfig = COASTAL_GREETINGS[admin] || {
    salutation: 'Namaste!',
    salutationHi: 'नमस्ते!',
    languageName: 'General',
  }

  const finalLat = (typeof lat === 'number' && !isNaN(lat))
    ? lat
    : (matchedPlace?.lat ?? (admin === 'West Bengal' ? 21.6266 : admin === 'Gujarat' ? 20.9071 : 9.9312))

  const finalLng = (typeof lng === 'number' && !isNaN(lng))
    ? lng
    : (matchedPlace?.lng ?? (admin === 'West Bengal' ? 87.5074 : admin === 'Gujarat' ? 70.3632 : 76.2673))

  const coordsFormatted = `${Math.abs(finalLat).toFixed(4)}° ${finalLat >= 0 ? 'N' : 'S'}, ${Math.abs(finalLng).toFixed(4)}° ${finalLng >= 0 ? 'E' : 'W'}`

  const placeLabel = matchedPlace
    ? `${matchedPlace.name}, ${matchedPlace.admin}`
    : (locStr || `${admin} Coastal Waters`)

  return {
    salutation: greetingConfig.salutation,
    salutationHi: greetingConfig.salutationHi,
    admin,
    languageName: greetingConfig.languageName,
    placeLabel,
    lat: finalLat,
    lng: finalLng,
    coordinatesStr: coordsFormatted,
  }
}

