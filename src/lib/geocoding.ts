/**
 * Geocoding Service
 *
 * Converts addresses to latitude/longitude coordinates.
 * Uses Census Geocoder (US) as primary, Nominatim (OSM) as fallback.
 */

export interface GeocodingResult {
  latitude: number
  longitude: number
  source: 'census' | 'nominatim'
  matchQuality: 'exact' | 'approximate'
  formattedAddress?: string
}

interface CensusResult {
  result: {
    addressMatches: Array<{
      coordinates: {
        x: number // longitude
        y: number // latitude
      }
      matchedAddress: string
      tigerLine: {
        side: string
        tigerLineId: string
      }
      addressComponents: {
        city: string
        state: string
        zip: string
      }
    }>
  }
}

interface NominatimResult {
  lat: string
  lon: string
  display_name: string
  class: string
  type: string
  importance: number
}

/**
 * Geocode using US Census Bureau Geocoder
 * Free, no API key required, US addresses only
 * Rate limit: No official limit but be reasonable
 */
async function geocodeWithCensus(
  address: string,
  city: string,
  state: string,
  zipCode: string
): Promise<GeocodingResult | null> {
  try {
    const fullAddress = `${address}, ${city}, ${state} ${zipCode}`
    const encodedAddress = encodeURIComponent(fullAddress)

    const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodedAddress}&benchmark=Public_AR_Current&format=json`

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      console.warn(`Census geocoder HTTP error: ${response.status}`)
      return null
    }

    const data: CensusResult = await response.json()

    if (data.result.addressMatches && data.result.addressMatches.length > 0) {
      const match = data.result.addressMatches[0]

      return {
        latitude: match.coordinates.y,
        longitude: match.coordinates.x,
        source: 'census',
        matchQuality: 'exact',
        formattedAddress: match.matchedAddress,
      }
    }

    return null
  } catch (error) {
    console.error('Census geocoding error:', error)
    return null
  }
}

/**
 * Geocode using OpenStreetMap Nominatim
 * Free, no API key required
 * Rate limit: 1 request per second
 */
async function geocodeWithNominatim(
  address: string,
  city: string,
  state: string,
  zipCode: string
): Promise<GeocodingResult | null> {
  try {
    const fullAddress = `${address}, ${city}, ${state} ${zipCode}, USA`
    const encodedAddress = encodeURIComponent(fullAddress)

    const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1&addressdetails=1`

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'HomePicker/1.0 (property-search-app)',
      },
    })

    if (!response.ok) {
      console.warn(`Nominatim geocoder HTTP error: ${response.status}`)
      return null
    }

    const data: NominatimResult[] = await response.json()

    if (data && data.length > 0) {
      const result = data[0]

      // Check if result is for a specific address (not just city/state)
      const isExact = result.type === 'house' ||
                      result.type === 'building' ||
                      result.class === 'building' ||
                      result.importance > 0.3

      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        source: 'nominatim',
        matchQuality: isExact ? 'exact' : 'approximate',
        formattedAddress: result.display_name,
      }
    }

    return null
  } catch (error) {
    console.error('Nominatim geocoding error:', error)
    return null
  }
}

/**
 * Main geocoding function
 * Tries Census first, falls back to Nominatim
 */
export async function geocodeAddress(
  address: string,
  city: string,
  state: string,
  zipCode: string
): Promise<GeocodingResult | null> {
  // Validate inputs
  if (!address || !city || !state) {
    console.warn('Geocoding: Missing required address components')
    return null
  }

  // Try Census Geocoder first (US-specific, more accurate)
  console.log(`Geocoding: Trying Census for "${address}, ${city}, ${state}"`)
  const censusResult = await geocodeWithCensus(address, city, state, zipCode)

  if (censusResult) {
    console.log(`Geocoding: Census success - ${censusResult.latitude}, ${censusResult.longitude}`)
    return censusResult
  }

  // Fallback to Nominatim
  console.log('Geocoding: Census failed, trying Nominatim...')

  // Rate limit: wait 1 second before Nominatim request
  await new Promise(resolve => setTimeout(resolve, 1000))

  const nominatimResult = await geocodeWithNominatim(address, city, state, zipCode)

  if (nominatimResult) {
    console.log(`Geocoding: Nominatim success - ${nominatimResult.latitude}, ${nominatimResult.longitude}`)
    return nominatimResult
  }

  console.warn(`Geocoding: Failed for "${address}, ${city}, ${state}"`)
  return null
}

/**
 * Batch geocode multiple addresses
 * Respects rate limits by processing sequentially
 */
export async function geocodeAddressesBatch(
  addresses: Array<{
    id: string
    address: string
    city: string
    state: string
    zipCode: string
  }>
): Promise<Map<string, GeocodingResult | null>> {
  const results = new Map<string, GeocodingResult | null>()

  for (const addr of addresses) {
    const result = await geocodeAddress(addr.address, addr.city, addr.state, addr.zipCode)
    results.set(addr.id, result)

    // Rate limit between requests
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  return results
}
