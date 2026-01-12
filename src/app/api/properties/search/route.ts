import { NextRequest } from 'next/server'
import { successResponse, errorResponse, ErrorCode, Errors } from '@/lib/api-response'
import { getSessionUser } from '@/lib/auth-session'
import { realtyAPI, formatPrice, formatAddress } from '@/lib/realty-api'
import { z } from 'zod'

const searchSchema = z.object({
  query: z.string().min(2, 'Search query must be at least 2 characters'),
  limit: z.coerce.number().min(1).max(20).default(10),
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
 * GET /api/properties/search
 * Search for properties by ZIP code or city/state
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries())
    const validation = searchSchema.safeParse(searchParams)

    if (!validation.success) {
      return errorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid search parameters',
        validation.error.flatten().fieldErrors
      )
    }

    const { query, limit } = validation.data
    const trimmedQuery = query.trim()

    let properties
    let location: { city?: string; state?: string; zipCode?: string } = {}

    // Try to determine search type
    if (isZipCode(trimmedQuery)) {
      // Search by ZIP code
      const { properties: results } = await realtyAPI.searchProperties({
        postal_code: trimmedQuery,
        limit,
        status: ['for_sale'],
      })
      properties = results
      location = { zipCode: trimmedQuery }
    } else {
      // Try to parse as "City, ST" format
      const cityState = parseCityState(trimmedQuery)

      if (cityState) {
        const { properties: results } = await realtyAPI.searchProperties({
          city: cityState.city,
          state_code: cityState.stateCode,
          limit,
          status: ['for_sale'],
        })
        properties = results
        location = { city: cityState.city, state: cityState.stateCode }
      } else {
        // Assume it's just a city name - try common states
        // For now, just search as city with empty state (API may require state)
        const { properties: results } = await realtyAPI.searchProperties({
          city: trimmedQuery,
          limit,
          status: ['for_sale'],
        })
        properties = results
        location = { city: trimmedQuery }
      }
    }

    // Helper to get high-resolution image URL
    // rdcpix.com URLs have size suffixes: s=small, o=original, l=large
    // Example: image-m123456s.jpg -> image-m123456o.jpg (original size)
    const getHighResImage = (url: string | undefined): string | null => {
      if (!url) return null
      // Replace size suffix 's' with 'o' for original quality
      // Pattern: -m{numbers}s.jpg -> -m{numbers}o.jpg
      return url.replace(/(-m\d+)s\.jpg$/, '$1o.jpg')
    }

    // Transform results for frontend
    const transformedProperties = properties.map((p) => ({
      propertyId: p.property_id,
      listingId: p.listing_id,
      address: formatAddress(p.address),
      city: p.address.city,
      state: p.address.state_code,
      zipCode: p.address.postal_code,
      price: p.list_price,
      priceFormatted: formatPrice(p.list_price),
      bedrooms: p.description?.beds ?? null,
      bathrooms: p.description?.baths ?? null,
      sqft: p.description?.sqft ?? null,
      yearBuilt: p.description?.year_built ?? null,
      propertyType: p.description?.type || p.property_type || null,
      status: p.status,
      image: getHighResImage(p.photos?.[0]?.href),
      // Coordinates from Realtor API for route optimization
      latitude: p.address.lat || null,
      longitude: p.address.lon || null,
    }))

    return successResponse({
      properties: transformedProperties,
      location,
    })
  } catch (error) {
    console.error('Property search error:', error)

    // Return more specific error message
    const errorMessage = error instanceof Error ? error.message : 'Failed to search properties'

    // Check for specific API errors
    if (errorMessage.includes('API error')) {
      return errorResponse(ErrorCode.EXTERNAL_API_ERROR, 'Property search service temporarily unavailable')
    }

    return errorResponse(ErrorCode.INTERNAL_ERROR, errorMessage)
  }
}
