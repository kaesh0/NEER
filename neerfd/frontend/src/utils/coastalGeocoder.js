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

export const INDIAN_INLAND_PLACES = [
  { name: 'New Delhi', admin: 'Delhi', lat: 28.6139, lng: 77.2090 },
  { name: 'Delhi', admin: 'Delhi', lat: 28.7041, lng: 77.1025 },
  { name: 'Noida', admin: 'Uttar Pradesh', lat: 28.5355, lng: 77.3910 },
  { name: 'Gurugram', admin: 'Haryana', lat: 28.4595, lng: 77.0266 },
  { name: 'Faridabad', admin: 'Haryana', lat: 28.4089, lng: 77.3178 },
  { name: 'Bengaluru', admin: 'Karnataka', lat: 12.9716, lng: 77.5946 },
  { name: 'Bangalore', admin: 'Karnataka', lat: 12.9716, lng: 77.5946 },
  { name: 'Hyderabad', admin: 'Telangana', lat: 17.3850, lng: 78.4867 },
  { name: 'Secunderabad', admin: 'Telangana', lat: 17.4399, lng: 78.4983 },
  { name: 'Jaipur', admin: 'Rajasthan', lat: 26.9124, lng: 75.7873 },
  { name: 'Jodhpur', admin: 'Rajasthan', lat: 26.2389, lng: 73.0243 },
  { name: 'Udaipur', admin: 'Rajasthan', lat: 24.5854, lng: 73.7125 },
  { name: 'Lucknow', admin: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462 },
  { name: 'Kanpur', admin: 'Uttar Pradesh', lat: 26.4499, lng: 80.3319 },
  { name: 'Varanasi', admin: 'Uttar Pradesh', lat: 25.3176, lng: 82.9739 },
  { name: 'Agra', admin: 'Uttar Pradesh', lat: 27.1767, lng: 78.0081 },
  { name: 'Prayagraj', admin: 'Uttar Pradesh', lat: 25.4358, lng: 81.8463 },
  { name: 'Pune', admin: 'Maharashtra', lat: 18.5204, lng: 73.8567 },
  { name: 'Nagpur', admin: 'Maharashtra', lat: 21.1458, lng: 79.0882 },
  { name: 'Nashik', admin: 'Maharashtra', lat: 19.9975, lng: 73.7898 },
  { name: 'Ahmedabad', admin: 'Gujarat', lat: 23.0225, lng: 72.5714 },
  { name: 'Bhopal', admin: 'Madhya Pradesh', lat: 23.2599, lng: 77.4126 },
  { name: 'Indore', admin: 'Madhya Pradesh', lat: 22.7196, lng: 75.8577 },
  { name: 'Gwalior', admin: 'Madhya Pradesh', lat: 26.2183, lng: 78.1828 },
  { name: 'Jabalpur', admin: 'Madhya Pradesh', lat: 23.1815, lng: 79.9864 },
  { name: 'Patna', admin: 'Bihar', lat: 25.5941, lng: 85.1376 },
  { name: 'Gaya', admin: 'Bihar', lat: 24.7914, lng: 85.0002 },
  { name: 'Ranchi', admin: 'Jharkhand', lat: 23.3441, lng: 85.3096 },
  { name: 'Jamshedpur', admin: 'Jharkhand', lat: 22.8046, lng: 86.2029 },
  { name: 'Raipur', admin: 'Chhattisgarh', lat: 21.2514, lng: 81.6296 },
  { name: 'Bilaspur', admin: 'Chhattisgarh', lat: 22.0797, lng: 82.1409 },
  { name: 'Chandigarh', admin: 'Chandigarh', lat: 30.7333, lng: 76.7794 },
  { name: 'Ludhiana', admin: 'Punjab', lat: 30.9010, lng: 75.8573 },
  { name: 'Amritsar', admin: 'Punjab', lat: 31.6340, lng: 74.8723 },
  { name: 'Jalandhar', admin: 'Punjab', lat: 31.3260, lng: 75.5762 },
  { name: 'Dehradun', admin: 'Uttarakhand', lat: 30.3165, lng: 78.0322 },
  { name: 'Shimla', admin: 'Himachal Pradesh', lat: 31.1048, lng: 77.1734 },
  { name: 'Srinagar', admin: 'Jammu and Kashmir', lat: 34.0837, lng: 74.7973 },
  { name: 'Jammu', admin: 'Jammu and Kashmir', lat: 32.7266, lng: 74.8570 },
  { name: 'Guwahati', admin: 'Assam', lat: 26.1445, lng: 91.7362 },
]

export function haversineKm(lat1, lon1, lat2, lon2) {
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

export function classifyLocation({ lat, lng, name }) {
  if (lat != null && lng != null) {
    const latNum = Number(lat)
    const lngNum = Number(lng)

    let nearestCoast = null
    let minCoastDist = Infinity
    for (const place of INDIAN_COASTAL_PLACES) {
      const d = haversineKm(latNum, lngNum, place.lat, place.lng)
      if (d < minCoastDist) {
        minCoastDist = d
        nearestCoast = place
      }
    }

    let nearestInland = null
    let minInlandDist = Infinity
    for (const place of INDIAN_INLAND_PLACES) {
      const d = haversineKm(latNum, lngNum, place.lat, place.lng)
      if (d < minInlandDist) {
        minInlandDist = d
        nearestInland = place
      }
    }

    // Coastal threshold: 50 km from closest coastal port/marker
    const isCoastal = minCoastDist <= 50.0

    if (isCoastal) {
      return {
        isCoastal: true,
        name: name || `${nearestCoast.name}, ${nearestCoast.admin}`,
        lat: latNum,
        lng: lngNum,
        distanceToCoastKm: Math.round(minCoastDist),
        nearestPort: nearestCoast,
      }
    } else {
      let resolvedName = name
      if (!resolvedName) {
        if (minInlandDist <= 60.0 && nearestInland) {
          resolvedName = `${nearestInland.name}, ${nearestInland.admin}`
        } else {
          resolvedName = `${latNum.toFixed(2)}° N, ${lngNum.toFixed(2)}° E`
        }
      }
      return {
        isCoastal: false,
        name: resolvedName,
        lat: latNum,
        lng: lngNum,
        distanceToCoastKm: Math.round(minCoastDist),
        nearestPort: nearestCoast,
      }
    }
  }

  if (name) {
    const clean = name.trim().toLowerCase()
    const coastalMatch = INDIAN_COASTAL_PLACES.find(
      (p) => clean.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(clean)
    )
    if (coastalMatch) {
      return {
        isCoastal: true,
        name: `${coastalMatch.name}, ${coastalMatch.admin}`,
        lat: coastalMatch.lat,
        lng: coastalMatch.lng,
        distanceToCoastKm: 0,
        nearestPort: coastalMatch,
      }
    }

    const inlandMatch = INDIAN_INLAND_PLACES.find(
      (p) => clean.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(clean)
    )
    if (inlandMatch) {
      let nearestCoast = null
      let minCoastDist = Infinity
      for (const place of INDIAN_COASTAL_PLACES) {
        const d = haversineKm(inlandMatch.lat, inlandMatch.lng, place.lat, place.lng)
        if (d < minCoastDist) {
          minCoastDist = d
          nearestCoast = place
        }
      }
      return {
        isCoastal: false,
        name: `${inlandMatch.name}, ${inlandMatch.admin}`,
        lat: inlandMatch.lat,
        lng: inlandMatch.lng,
        distanceToCoastKm: Math.round(minCoastDist),
        nearestPort: nearestCoast,
      }
    }

    // Default unknown name
    return {
      isCoastal: false,
      name: name.trim(),
      lat: null,
      lng: null,
      distanceToCoastKm: null,
      nearestPort: null,
    }
  }

  return null
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

/**
 * Detect the user's real physical location automatically:
 * 1. Attempts device GPS via navigator.geolocation.getCurrentPosition (high accuracy)
 * 2. If GPS is denied, unavailable, or times out, attempts fast IP-based geolocation (city & coordinates)
 * 3. Classifies whether the detected point is coastal or inland
 */
export async function detectUserCurrentLocation(options = {}) {
  const { timeoutMs = 6000 } = options

  // 1. Try Browser Geolocation API
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: timeoutMs,
          enableHighAccuracy: true,
          maximumAge: 30000,
        })
      })

      if (pos && pos.coords) {
        const { latitude, longitude } = pos.coords
        const classified = classifyLocation({ lat: latitude, lng: longitude })
        if (classified) {
          return { ...classified, isGps: true }
        }
        return {
          name: `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`,
          lat: latitude,
          lng: longitude,
          isCoastal: false,
          isGps: true,
        }
      }
    } catch (gpsErr) {
      console.info('Browser Geolocation declined or timed out, trying IP detection:', gpsErr?.message)
    }
  }

  // 2. Try IP-based Geolocation fallbacks
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3500) })
    if (res.ok) {
      const data = await res.json()
      if (data && data.latitude != null && data.longitude != null) {
        const placeName = data.city ? `${data.city}, ${data.region || data.country_name || ''}` : undefined
        const classified = classifyLocation({
          lat: data.latitude,
          lng: data.longitude,
          name: placeName,
        })
        if (classified) {
          return { ...classified, isIp: true }
        }
      }
    }
  } catch (e) {}

  try {
    const res = await fetch('https://freeipapi.com/api/json', { signal: AbortSignal.timeout(3500) })
    if (res.ok) {
      const data = await res.json()
      if (data && data.latitude != null && data.longitude != null) {
        const placeName = data.cityName ? `${data.cityName}, ${data.regionName || ''}` : undefined
        const classified = classifyLocation({
          lat: data.latitude,
          lng: data.longitude,
          name: placeName,
        })
        if (classified) {
          return { ...classified, isIp: true }
        }
      }
    }
  } catch (e) {}

  return null
}
