import { NextRequest, NextResponse } from 'next/server'
import { realtyAPI, transformPropertyToHouse } from '@/lib/realty-api'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api-response'
import { getRequestUser } from '@/lib/auth'
import { z } from 'zod'

// Schema for search query
const searchSchema = z.object({
  q: z.string().min(3, 'Query must be at least 3 characters'),
  type: z.enum(['autocomplete', 'properties']).optional().default('autocomplete'),
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
 * GET /api/houses/search
 * Search for houses using the Realty in US API
 *
 * Query params:
 * - q: Search query (required, min 3 chars)
 * - type: 'autocomplete' for address suggestions, 'properties' for property search
 * - city, state_code, postal_code: Location filters (for properties type)
 * - limit, offset: Pagination
 * - price_min, price_max, beds_min, baths_min, sqft_min, sqft_max: Filters
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
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

    const { q, type, ...filters } = validation.data

    if (type === 'autocomplete') {
      // Return address suggestions for autocomplete
      const results = await realtyAPI.autocomplete(q)

      return successResponse({
          suggestions: results.map((r) => ({
            id: r._id,
            type: r.area_type,
            city: r.city,
            state: r.state_code,
            postalCode: r.postal_code,
            address: r.line,
            fullAddress: r.full_address?.join(', '),
            coordinates: r.centroid,
          })),
        })
    }

    // Search for properties
    const { properties, count, total } = await realtyAPI.searchProperties({
      city: filters.city,
      state_code: filters.state_code,
      postal_code: filters.postal_code,
      limit: filters.limit,
      offset: filters.offset,
      price_min: filters.price_min,
      price_max: filters.price_max,
      beds_min: filters.beds_min,
      baths_min: filters.baths_min,
      sqft_min: filters.sqft_min,
      sqft_max: filters.sqft_max,
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
