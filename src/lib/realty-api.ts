/**
 * Realty in US API Integration
 * API for searching and fetching US real estate property data
 * Using RapidAPI's Realty in US endpoint
 *
 * API Documentation: https://rapidapi.com/apidojo/api/realty-in-us
 */

import { logApiCall } from './api-logger'
import { getConfig, CONFIG_KEYS, markConfigUsed, getConfigSync } from './config'

const RAPIDAPI_HOST = 'realty-in-us.p.rapidapi.com'
const BASE_URL = 'https://realty-in-us.p.rapidapi.com'

// Get API key from database or environment
async function getRapidApiKey(): Promise<string | null> {
  const key = await getConfig(CONFIG_KEYS.RAPIDAPI_KEY)
  if (key) {
    await markConfigUsed(CONFIG_KEYS.RAPIDAPI_KEY).catch(() => {})
  }
  return key
}

// Sync version for initialization checks
function getRapidApiKeySync(): string | null {
  return getConfigSync(CONFIG_KEYS.RAPIDAPI_KEY)
}

// Types for API responses (v3 format)
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

// New v3 API response format
export interface PropertySearchResultV3 {
  property_id: string
  listing_id: string
  status: 'for_sale' | 'sold' | 'off_market' | 'pending'
  list_price: number
  list_price_min?: number | null
  list_price_max?: number | null
  list_date: string
  last_sold_date?: string | null
  last_sold_price?: number | null
  photo_count?: number
  primary_photo?: { href: string }
  location: {
    address: {
      line: string
      city: string
      state_code: string
      state: string
      postal_code: string
      country: string
      coordinate?: {
        lat: number
        lon: number
      }
    }
  }
  description?: {
    type?: string
    sub_type?: string
    beds?: number
    beds_min?: number | null
    beds_max?: number | null
    baths?: number
    baths_min?: number | null
    baths_max?: number | null
    baths_full?: number
    baths_half?: number
    sqft?: number
    sqft_min?: number | null
    sqft_max?: number | null
    lot_sqft?: number | null
  }
  flags?: {
    is_new_construction?: boolean | null
    is_foreclosure?: boolean | null
    is_new_listing?: boolean | null
    is_coming_soon?: boolean | null
    is_contingent?: boolean | null
    is_pending?: boolean | null
    is_price_reduced?: boolean | null
  }
}

// Legacy format for compatibility
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

// Mortgage estimate from API
export interface MortgageEstimate {
  monthlyPayment: number
  loanAmount: number
  downPayment: number
  totalPayment: number
  interestRate: number
  loanTerm: number
  details: Array<{
    type: string
    amount: number
    displayName: string
  }>
}

// Agent/Broker information
export interface AgentInfo {
  name: string
  email: string | null
  phone: string | null
  photo: string | null
  license: string | null
  officeName: string | null
  officePhone: string | null
  officePhoto: string | null
}

// Value estimate
export interface ValueEstimate {
  source: string
  estimate: number
  estimateHigh: number
  estimateLow: number
  date: string
}

// Property flags
export interface PropertyFlags {
  isNewConstruction: boolean | null
  isForeclosure: boolean | null
  isNewListing: boolean | null
  isComingSoon: boolean | null
  isContingent: boolean | null
  isPending: boolean | null
  isPriceReduced: boolean | null
  isShortSale: boolean | null
}

// Flood info
export interface FloodInfo {
  floodFactorScore: number | null
  femaZones: string[]
}

// Enhanced school info
export interface SchoolInfo {
  name: string
  distance_in_miles: number
  education_levels: string[]
  rating: number | null
  parentRating: number | null
  funding_type: string
  grades: string[]
  studentCount: number | null
  assigned: boolean | null
}

// Property history with photos
export interface PropertyHistoryItem {
  date: string
  price: number
  event_name: string
  source: string | null
  photos: string[]
}

// Tax history with breakdown
export interface TaxHistoryItem {
  year: number
  tax: number
  assessment: {
    building: number | null
    land: number | null
    total: number | null
  } | null
}

// Details category
export interface DetailsCategory {
  category: string
  text: string[]
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
    text?: string // Full description text
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
    county?: { name: string; fips_code?: string }
    street_view_url?: string
  }
  schools?: Array<{
    name: string
    distance_in_miles: number
    education_levels: string[]
    rating: number
    funding_type: string
  }>
  // New rich data fields
  mortgage?: MortgageEstimate
  hoa?: {
    fee: number
    frequency?: string
  }
  agent?: AgentInfo
  estimates?: ValueEstimate[]
  flags?: PropertyFlags
  flood?: FloodInfo
  details?: DetailsCategory[]
  property_history?: PropertyHistoryItem[]
  tax_history_detailed?: TaxHistoryItem[]
  schools_detailed?: SchoolInfo[]
  last_sold_price?: number
  last_sold_date?: string
  price_per_sqft?: number
  days_on_market?: number
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
  private async getHeaders(): Promise<HeadersInit> {
    const apiKey = await getRapidApiKey()
    return {
      'Content-Type': 'application/json',
      'X-RapidAPI-Key': apiKey || '',
      'X-RapidAPI-Host': RAPIDAPI_HOST,
    }
  }

  /**
   * Search for properties by location using POST v3 API
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
    sort?: { direction: 'asc' | 'desc'; field: string }
    status?: string[]
    price_min?: number
    price_max?: number
    beds_min?: number
    baths_min?: number
    sqft_min?: number
    sqft_max?: number
    property_type?: string[]
  }): Promise<{
    properties: PropertySearchResult[]
    count: number
    total: number
  }> {
    const apiKey = await getRapidApiKey()
    if (!apiKey) {
      console.error('RAPIDAPI_KEY not configured')
      return { properties: [], count: 0, total: 0 }
    }

    const startTime = Date.now()
    const endpoint = '/properties/v3/list'

    try {
      // Build request body for POST request
      const requestBody: Record<string, unknown> = {
        limit: params.limit || 10,
        offset: params.offset || 0,
        status: params.status || ['for_sale'],
        sort: params.sort || { direction: 'desc', field: 'list_date' },
      }

      // Location params - at least one is required
      if (params.postal_code) requestBody.postal_code = params.postal_code
      if (params.city) requestBody.city = params.city
      if (params.state_code) requestBody.state_code = params.state_code

      // Optional filters
      if (params.price_min) requestBody.list_price = { ...((requestBody.list_price as object) || {}), min: params.price_min }
      if (params.price_max) requestBody.list_price = { ...((requestBody.list_price as object) || {}), max: params.price_max }
      if (params.beds_min) requestBody.beds = { min: params.beds_min }
      if (params.baths_min) requestBody.baths = { min: params.baths_min }
      if (params.sqft_min || params.sqft_max) {
        requestBody.sqft = {
          ...(params.sqft_min && { min: params.sqft_min }),
          ...(params.sqft_max && { max: params.sqft_max }),
        }
      }
      if (params.property_type) requestBody.type = params.property_type

      const headers = await this.getHeaders()
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      })

      const duration = Date.now() - startTime

      if (!response.ok) {
        const errorText = await response.text()
        await logApiCall({
          service: 'realty_api',
          endpoint,
          method: 'POST',
          status: response.status,
          duration,
          errorMessage: errorText || response.statusText,
        })
        throw new Error(`API error: ${response.status} - ${errorText || response.statusText}`)
      }

      await logApiCall({
        service: 'realty_api',
        endpoint,
        method: 'POST',
        status: 200,
        duration,
      })

      const data = await response.json()
      const results: PropertySearchResultV3[] = data.data?.home_search?.results || []

      // Transform v3 results to legacy format for compatibility
      const properties: PropertySearchResult[] = results.map((r) => ({
        property_id: r.property_id,
        listing_id: r.listing_id,
        status: r.status,
        list_price: r.list_price,
        list_date: r.list_date,
        last_update_date: r.list_date, // v3 doesn't have this field separately
        property_type: r.description?.type,
        address: {
          line: r.location.address.line,
          city: r.location.address.city,
          state_code: r.location.address.state_code,
          state: r.location.address.state,
          postal_code: r.location.address.postal_code,
          country: r.location.address.country || 'USA',
          lat: r.location.address.coordinate?.lat || 0,
          lon: r.location.address.coordinate?.lon || 0,
        },
        photos: r.primary_photo ? [{ href: r.primary_photo.href }] : [],
        description: r.description ? {
          beds: r.description.beds || 0,
          baths: r.description.baths || 0,
          sqft: r.description.sqft || 0,
          lot_sqft: r.description.lot_sqft || undefined,
          type: r.description.type,
        } : undefined,
      }))

      return {
        properties,
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
    const apiKey = await getRapidApiKey()
    if (!apiKey) {
      console.error('RAPIDAPI_KEY not configured')
      return null
    }

    const startTime = Date.now()
    const endpoint = '/properties/v3/detail'

    try {
      const headers = await this.getHeaders()
      // v3/detail is a GET endpoint with property_id as query parameter
      const url = new URL(`${BASE_URL}${endpoint}`)
      url.searchParams.set('property_id', propertyId)

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
      })

      const duration = Date.now() - startTime

      if (!response.ok) {
        const errorText = await response.text()
        await logApiCall({
          service: 'realty_api',
          endpoint,
          method: 'GET',
          status: response.status,
          duration,
          errorMessage: response.status === 404 ? 'Not found' : (errorText || response.statusText),
        })
        if (response.status === 404) {
          return null
        }
        throw new Error(`API error: ${response.status} - ${errorText || response.statusText}`)
      }

      await logApiCall({
        service: 'realty_api',
        endpoint,
        method: 'GET',
        status: 200,
        duration,
      })

      const data = await response.json()
      const home = data.data?.home

      if (!home) {
        return null
      }

      // Extract mortgage data
      const mortgageData = home.mortgage?.estimate
      const mortgage: MortgageEstimate | undefined = mortgageData ? {
        monthlyPayment: mortgageData.monthly_payment || 0,
        loanAmount: mortgageData.loan_amount || 0,
        downPayment: mortgageData.down_payment || 0,
        totalPayment: mortgageData.total_payment || 0,
        interestRate: mortgageData.average_rate?.rate || 0,
        loanTerm: mortgageData.average_rate?.loan_type?.term || 30,
        details: (mortgageData.monthly_payment_details || []).map((d: { type: string; amount: number; display_name: string }) => ({
          type: d.type,
          amount: d.amount,
          displayName: d.display_name,
        })),
      } : undefined

      // Extract HOA data
      const hoa = home.hoa?.fee ? {
        fee: home.hoa.fee,
        frequency: 'monthly',
      } : undefined

      // Extract agent data
      const advertiser = home.advertisers?.[0]
      const agent: AgentInfo | undefined = advertiser ? {
        name: advertiser.name || '',
        email: advertiser.email || null,
        phone: advertiser.phones?.[0]?.number || null,
        photo: advertiser.photo?.href || null,
        license: advertiser.state_license || null,
        officeName: advertiser.office?.name || null,
        officePhone: advertiser.office?.phones?.[0]?.number || null,
        officePhoto: advertiser.office?.photo?.href || null,
      } : undefined

      // Extract value estimates
      const estimates: ValueEstimate[] = (home.estimates?.current_values || []).map((e: { source: { name: string }; estimate: number; estimate_high: number; estimate_low: number; date: string }) => ({
        source: e.source?.name || 'Unknown',
        estimate: e.estimate || 0,
        estimateHigh: e.estimate_high || 0,
        estimateLow: e.estimate_low || 0,
        date: e.date || '',
      }))

      // Extract flags
      const flags: PropertyFlags | undefined = home.flags ? {
        isNewConstruction: home.flags.is_new_construction ?? null,
        isForeclosure: home.flags.is_foreclosure ?? null,
        isNewListing: home.flags.is_new_listing ?? null,
        isComingSoon: home.flags.is_coming_soon ?? null,
        isContingent: home.flags.is_contingent ?? null,
        isPending: home.flags.is_pending ?? null,
        isPriceReduced: home.flags.is_price_reduced ?? null,
        isShortSale: home.flags.is_short_sale ?? null,
      } : undefined

      // Extract flood info
      const flood: FloodInfo | undefined = home.local?.flood ? {
        floodFactorScore: home.local.flood.flood_factor_score ?? null,
        femaZones: home.local.flood.fema_zone || [],
      } : undefined

      // Extract detailed property history
      const propertyHistory: PropertyHistoryItem[] = (home.property_history || []).map((h: { date: string; price: number; event_name: string; source_name?: string; listing?: { photos?: Array<{ href: string }> } }) => ({
        date: h.date || '',
        price: h.price || 0,
        event_name: h.event_name || '',
        source: h.source_name || null,
        photos: (h.listing?.photos || []).slice(0, 5).map((p: { href: string }) => p.href),
      }))

      // Extract detailed tax history
      const taxHistoryDetailed: TaxHistoryItem[] = (home.tax_history || []).map((t: { year: number; tax: number; assessment?: { building?: number; land?: number; total?: number } }) => ({
        year: t.year,
        tax: t.tax || 0,
        assessment: t.assessment ? {
          building: t.assessment.building ?? null,
          land: t.assessment.land ?? null,
          total: t.assessment.total ?? null,
        } : null,
      }))

      // Extract detailed schools
      const schoolsDetailed: SchoolInfo[] = (home.schools?.schools || home.nearby_schools?.schools || []).map((s: { name: string; distance_in_miles: number; education_levels: string[]; rating?: number; parent_rating?: number; funding_type: string; grades?: string[]; student_count?: number; assigned?: boolean }) => ({
        name: s.name || '',
        distance_in_miles: s.distance_in_miles || 0,
        education_levels: s.education_levels || [],
        rating: s.rating ?? null,
        parentRating: s.parent_rating ?? null,
        funding_type: s.funding_type || '',
        grades: s.grades || [],
        studentCount: s.student_count ?? null,
        assigned: s.assigned ?? null,
      }))

      // Extract details categories
      const details: DetailsCategory[] = (home.details || []).map((d: { category: string; text: string[] }) => ({
        category: d.category || '',
        text: d.text || [],
      }))

      // Transform to PropertyDetail format
      return {
        property_id: home.property_id,
        listing_id: home.listing_id || '',
        status: home.status || 'for_sale',
        list_price: home.list_price || 0,
        list_date: home.list_date || '',
        last_update_date: home.last_update_date || home.list_date || '',
        property_type: home.description?.type,
        address: {
          line: home.location?.address?.line || '',
          city: home.location?.address?.city || '',
          state_code: home.location?.address?.state_code || '',
          state: home.location?.address?.state || '',
          postal_code: home.location?.address?.postal_code || '',
          country: home.location?.address?.country || 'USA',
          lat: home.location?.address?.coordinate?.lat || 0,
          lon: home.location?.address?.coordinate?.lon || 0,
        },
        photos: home.photos?.map((p: { href: string }) => ({ href: p.href })) || [],
        description: home.description ? {
          beds: home.description.beds,
          baths: home.description.baths,
          baths_full: home.description.baths_full,
          baths_half: home.description.baths_half,
          sqft: home.description.sqft,
          lot_sqft: home.description.lot_sqft,
          year_built: home.description.year_built,
          type: home.description.type,
          sub_type: home.description.sub_type,
          stories: home.description.stories,
          garage: home.description.garage,
          pool: home.description.pool,
          text: home.description.text,
        } : undefined,
        location: {
          neighborhoods: home.location?.neighborhoods,
          county: home.location?.county ? { name: home.location.county.name || '', fips_code: home.location.county.fips_code } : undefined,
          street_view_url: home.location?.street_view_url,
        },
        // Rich data fields
        mortgage,
        hoa,
        agent,
        estimates: estimates.length > 0 ? estimates : undefined,
        flags,
        flood,
        details: details.length > 0 ? details : undefined,
        property_history: propertyHistory.length > 0 ? propertyHistory : undefined,
        tax_history_detailed: taxHistoryDetailed.length > 0 ? taxHistoryDetailed : undefined,
        schools_detailed: schoolsDetailed.length > 0 ? schoolsDetailed : undefined,
        last_sold_price: home.last_sold_price,
        last_sold_date: home.last_sold_date,
        price_per_sqft: home.price_per_sqft,
        days_on_market: home.days_on_market,
      }
    } catch (error) {
      console.error('Realty API property detail error:', error)
      throw error
    }
  }

  /**
   * Search by postal code - simplified method for the search modal
   * @param postalCode - ZIP code to search
   * @param limit - Number of results
   * @returns Properties in that ZIP code
   */
  async searchByPostalCode(postalCode: string, limit = 10): Promise<PropertySearchResult[]> {
    const { properties } = await this.searchProperties({
      postal_code: postalCode,
      limit,
      status: ['for_sale'],
    })
    return properties
  }

  /**
   * Search by city and state - simplified method
   * @param city - City name
   * @param stateCode - State code (e.g., 'GA', 'CA')
   * @param limit - Number of results
   * @returns Properties in that city
   */
  async searchByCity(city: string, stateCode: string, limit = 10): Promise<PropertySearchResult[]> {
    const { properties } = await this.searchProperties({
      city,
      state_code: stateCode,
      limit,
      status: ['for_sale'],
    })
    return properties
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
