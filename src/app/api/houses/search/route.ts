import { NextRequest } from 'next/server'
import { realtyAPI, transformPropertyToHouse } from '@/lib/realty-api'
import { successResponse, errorResponse, ErrorCode, Errors } from '@/lib/api-response'
import { getSessionUser } from '@/lib/auth-session'
import { z } from 'zod'
import { checkRateLimit, getIdentifier } from '@/lib/rate-limit'

// Schema for search query
const searchSchema = z.object({
  q: z.string().min(2, 'Query must be at least 2 characters'),
  city: z.string().optional(),
  state_code: z.string().optional(),
  postal_code: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).optional().default(10),
  offset: z.coerce.number().min(0).optional().default(0),
  price_min: z.coerce.number().optional(),
  price_max: z.coerce.number().optional(),
  beds_min: z.coerce.number().optional(),
  baths_min: z.coerce.number().optional(),
  sqft_min: z.coerce.number().optional(),
  sqft_max: z.coerce.number().optional(),
})

/**
 * Helper to detect if query is a ZIP code
 */
function isZipCode(query: string): boolean {
  return /^\d{5}(-\d{4})?$/.test(query.trim())
}

/**
 * Helper to parse city, state from query like "Atlanta, GA"
 */
function parseCityState(query: string): { city: string; stateCode: string } | null {
  const match = query.match(/^([^,]+),\s*([A-Za-z]{2})$/i)
  if (match) {
    return {
      city: match[1].trim(),
      stateCode: match[2].toUpperCase(),
    }
  }
  return null
}

/**
 * GET /api/houses/search
 * Search for houses using the Realty in US API
 *
 * Query params:
 * - q: Search query (required, ZIP code or "City, ST")
 * - city, state_code, postal_code: Location filters (alternative to q)
 * - limit, offset: Pagination
 * - price_min, price_max, beds_min, baths_min, sqft_min, sqft_max: Filters
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting for Realty API (external API with monthly quota)
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    const identifier = getIdentifier(ip)
    const rateLimit = checkRateLimit(identifier, 'realtySearch')
    if (!rateLimit.success) {
      return errorResponse(
        ErrorCode.RATE_LIMIT_EXCEEDED,
        'Too many search requests. Please wait a moment.',
        { retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000) }
      )
    }

    // Verify authentication
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    // Parse and validate query params
    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries())
    const validation = searchSchema.safeParse(searchParams)

    if (!validation.success) {
      return errorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid search parameters',
        validation.error.flatten().fieldErrors
      )
    }

    const { q, ...filters } = validation.data
    const trimmedQuery = q.trim()

    // Determine search parameters from query
    let searchCity = filters.city
    let searchStateCode = filters.state_code
    let searchPostalCode = filters.postal_code

    if (!searchCity && !searchStateCode && !searchPostalCode) {
      if (isZipCode(trimmedQuery)) {
        searchPostalCode = trimmedQuery
      } else {
        const cityState = parseCityState(trimmedQuery)
        if (cityState) {
          searchCity = cityState.city
          searchStateCode = cityState.stateCode
        } else {
          // Assume it's just a city name
          searchCity = trimmedQuery
        }
      }
    }

    // Search for properties
    const { properties, count, total } = await realtyAPI.searchProperties({
      city: searchCity,
      state_code: searchStateCode,
      postal_code: searchPostalCode,
      limit: filters.limit,
      offset: filters.offset,
      price_min: filters.price_min,
      price_max: filters.price_max,
      beds_min: filters.beds_min,
      baths_min: filters.baths_min,
      sqft_min: filters.sqft_min,
      sqft_max: filters.sqft_max,
      status: ['for_sale'],
    })

    // Transform properties to our format
    const transformedProperties = properties.map((p) => ({
      propertyId: p.property_id,
      ...transformPropertyToHouse(p),
    }))

    return successResponse({
      properties: transformedProperties,
      pagination: {
        count,
        total,
        limit: filters.limit,
        offset: filters.offset,
      },
    })
  } catch (error) {
    console.error('Houses search error:', error)

    return errorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to search properties'
    )
  }
}
