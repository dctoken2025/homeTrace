/**
 * Realty in US API Integration
 * API for searching and fetching US real estate property data
 * Using RapidAPI's Realty in US endpoint
 */

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY!
const RAPIDAPI_HOST = 'realty-in-us.p.rapidapi.com'
const BASE_URL = 'https://realty-in-us.p.rapidapi.com'

// Types for API responses
export interface PropertyAddress {
  line: string
  city: string
  state_code: string
  state: string
  postal_code: string
  country: string
  lat: number
  lon: number
  street_name?: string
  street_number?: string
  street_suffix?: string
}

export interface PropertyPhoto {
  href: string
  type?: string
  tags?: Array<{ label: string; probability: number }>
}

export interface PropertySearchResult {
  property_id: string
  listing_id: string
  status: 'for_sale' | 'sold' | 'off_market' | 'pending'
  list_price: number
  list_date: string
  last_update_date: string
  property_type?: string
  address: PropertyAddress
  photos?: PropertyPhoto[]
  description?: {
    beds: number
    baths: number
    sqft: number
    lot_sqft?: number
    year_built?: number
    garage?: number
    stories?: number
    type?: string
  }
}

export interface PropertyDetail {
  property_id: string
  listing_id: string
  status: 'for_sale' | 'sold' | 'off_market' | 'pending'
  list_price: number
  list_date: string
  last_update_date: string
  property_type?: string
  address: PropertyAddress
  photos?: PropertyPhoto[]
  description?: {
    name?: string
    beds?: number
    baths?: number
    baths_full?: number
    baths_half?: number
    sqft?: number
    lot_sqft?: number
    year_built?: number
    garage?: number
    stories?: number
    type?: string
    sub_type?: string
    pool?: boolean
    fireplace?: boolean
    heating?: string
    cooling?: string
  }
  features?: Array<{
    category: string
    text: string[]
  }>
  price_history?: Array<{
    date: string
    price: number
    event_name: string
  }>
  tax_history?: Array<{
    year: number
    tax: number
    assessment?: { total: number }
  }>
  location?: {
    neighborhoods?: Array<{ name: string; id: string }>
    county?: { name: string }
  }
  schools?: Array<{
    name: string
    distance_in_miles: number
    education_levels: string[]
    rating: number
    funding_type: string
  }>
}

export interface AutocompleteResult {
  area_type: string
  _id: string
  _score: number
  city?: string
  state_code?: string
  postal_code?: string
  line?: string
  full_address?: string[]
  centroid?: { lat: number; lon: number }
}

// API Client class
class RealtyAPI {
  private headers: HeadersInit

  constructor() {
    this.headers = {
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': RAPIDAPI_HOST,
    }
  }

  /**
   * Autocomplete search for addresses
   * @param input - Partial address string to search
   * @returns List of matching locations
   */
  async autocomplete(input: string): Promise<AutocompleteResult[]> {
    if (!RAPIDAPI_KEY) {
      console.error('RAPIDAPI_KEY not configured')
      return []
    }

    try {
      const params = new URLSearchParams({ input })
      const response = await fetch(
        `${BASE_URL}/auto-complete?${params.toString()}`,
        { headers: this.headers }
      )

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data.autocomplete || []
    } catch (error) {
      console.error('Realty API autocomplete error:', error)
      throw error
    }
  }

  /**
   * Search for properties by location
   * @param params - Search parameters
   * @returns List of properties matching search criteria
   */
  async searchProperties(params: {
    city?: string
    state_code?: string
    postal_code?: string
    address?: string
    limit?: number
    offset?: number
    sort?: 'newest' | 'price_low' | 'price_high' | 'sqft_high'
    status?: 'for_sale' | 'sold' | 'pending'
    price_min?: number
    price_max?: number
    beds_min?: number
    baths_min?: number
    sqft_min?: number
    sqft_max?: number
    property_type?: string
  }): Promise<{
    properties: PropertySearchResult[]
    count: number
    total: number
  }> {
    if (!RAPIDAPI_KEY) {
      console.error('RAPIDAPI_KEY not configured')
      return { properties: [], count: 0, total: 0 }
    }

    try {
      const searchParams = new URLSearchParams()

      // Required params
      if (params.city) searchParams.append('city', params.city)
      if (params.state_code) searchParams.append('state_code', params.state_code)
      if (params.postal_code) searchParams.append('postal_code', params.postal_code)

      // Optional params
      if (params.limit) searchParams.append('limit', params.limit.toString())
      if (params.offset) searchParams.append('offset', params.offset.toString())
      if (params.sort) searchParams.append('sort', params.sort)
      if (params.status) searchParams.append('status', params.status)
      if (params.price_min) searchParams.append('price_min', params.price_min.toString())
      if (params.price_max) searchParams.append('price_max', params.price_max.toString())
      if (params.beds_min) searchParams.append('beds_min', params.beds_min.toString())
      if (params.baths_min) searchParams.append('baths_min', params.baths_min.toString())
      if (params.sqft_min) searchParams.append('sqft_min', params.sqft_min.toString())
      if (params.sqft_max) searchParams.append('sqft_max', params.sqft_max.toString())
      if (params.property_type) searchParams.append('type', params.property_type)

      const response = await fetch(
        `${BASE_URL}/properties/v3/list?${searchParams.toString()}`,
        { headers: this.headers }
      )

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      return {
        properties: data.data?.home_search?.results || [],
        count: data.data?.home_search?.count || 0,
        total: data.data?.home_search?.total || 0,
      }
    } catch (error) {
      console.error('Realty API search error:', error)
      throw error
    }
  }

  /**
   * Get detailed property information by property ID
   * @param propertyId - The property ID to fetch
   * @returns Detailed property information
   */
  async getPropertyDetail(propertyId: string): Promise<PropertyDetail | null> {
    if (!RAPIDAPI_KEY) {
      console.error('RAPIDAPI_KEY not configured')
      return null
    }

    try {
      const params = new URLSearchParams({ property_id: propertyId })
      const response = await fetch(
        `${BASE_URL}/properties/v3/detail?${params.toString()}`,
        { headers: this.headers }
      )

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data.data?.home || null
    } catch (error) {
      console.error('Realty API property detail error:', error)
      throw error
    }
  }

  /**
   * Search by exact address to find a specific property
   * @param address - Full address string
   * @returns Matching property or null
   */
  async searchByAddress(address: string): Promise<PropertySearchResult | null> {
    try {
      // First use autocomplete to get location info
      const autocompleteResults = await this.autocomplete(address)

      if (autocompleteResults.length === 0) {
        return null
      }

      // Find result with line (specific address)
      const addressResult = autocompleteResults.find((r) => r.line)

      if (!addressResult || !addressResult.line) {
        return null
      }

      // Search with the resolved location
      const { properties } = await this.searchProperties({
        city: addressResult.city,
        state_code: addressResult.state_code,
        postal_code: addressResult.postal_code,
        limit: 10,
      })

      // Find exact match by address line
      const normalizedAddress = addressResult.line.toLowerCase().trim()
      const match = properties.find(
        (p) => p.address.line.toLowerCase().trim() === normalizedAddress
      )

      return match || null
    } catch (error) {
      console.error('Realty API search by address error:', error)
      throw error
    }
  }
}

// Export singleton instance
export const realtyAPI = new RealtyAPI()

// Helper functions for data transformation
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price)
}

export function formatAddress(address: PropertyAddress): string {
  return `${address.line}, ${address.city}, ${address.state_code} ${address.postal_code}`
}

export function formatSqft(sqft: number): string {
  return new Intl.NumberFormat('en-US').format(sqft)
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    for_sale: 'For Sale',
    sold: 'Sold',
    off_market: 'Off Market',
    pending: 'Pending',
  }
  return labels[status] || status
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    for_sale: 'bg-[#E3F2FD] text-[#006AFF]',
    sold: 'bg-gray-100 text-gray-800',
    off_market: 'bg-amber-100 text-amber-800',
    pending: 'bg-[#BBDEFB] text-[#0D47A1]',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

/**
 * Transform API property to our database format
 */
export function transformPropertyToHouse(property: PropertySearchResult | PropertyDetail) {
  const address = property.address
  const desc = property.description

  return {
    externalId: property.property_id,
    address: formatAddress(address),
    city: address.city,
    state: address.state_code,
    zipCode: address.postal_code,
    latitude: address.lat,
    longitude: address.lon,
    price: property.list_price,
    bedrooms: desc?.beds ?? null,
    bathrooms: desc?.baths ?? null,
    sqft: desc?.sqft ?? null,
    yearBuilt: desc?.year_built ?? null,
    propertyType: desc?.type || property.property_type || null,
    listingStatus: property.status,
    lastSyncedAt: property.last_update_date ? new Date(property.last_update_date) : new Date(),
    images: property.photos?.map((p) => p.href) ?? [],
    rawApiData: property,
  }
}
