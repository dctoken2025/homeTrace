import { NextRequest, NextResponse } from 'next/server'
import { realtyAPI, transformPropertyToHouse, formatPrice } from '@/lib/realty-api'
import { successResponse, errorResponse, ErrorCode, Errors } from '@/lib/api-response'
import { getSessionUser } from '@/lib/auth-session'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, getIdentifier } from '@/lib/rate-limit'

/**
 * GET /api/houses/preview?propertyId=xxx
 * Get property preview from external API before adding
 * Also checks if the house already exists in the user's list
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
        'Too many property preview requests. Please wait a moment.',
        { retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000) }
      )
    }

    // Verify authentication
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')

    if (!propertyId) {
      return errorResponse(ErrorCode.VALIDATION_ERROR, 'Property ID is required')
    }

    // Fetch property details from external API
    const propertyDetail = await realtyAPI.getPropertyDetail(propertyId)

    if (!propertyDetail) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Property not found')
    }

    // Transform to our format
    const houseData = transformPropertyToHouse(propertyDetail)

    // Check if house already exists in our database (by external ID)
    const existingHouse = await prisma.house.findFirst({
      where: {
        externalId: propertyId,
      },
    })

    let existingConnection = null
    let connectionStatus = null

    if (existingHouse) {
      // Check if user already has this house in their list
      if (session.role === 'BUYER') {
        existingConnection = await prisma.houseBuyer.findFirst({
          where: {
            houseId: existingHouse.id,
            buyerId: session.userId,
          },
        })

        if (existingConnection) {
          connectionStatus = 'already_added'
        }
      } else if (session.role === 'REALTOR') {
        // For realtors, check if they've added this house for any buyer
        existingConnection = await prisma.houseBuyer.findFirst({
          where: {
            houseId: existingHouse.id,
            addedByRealtorId: session.userId,
          },
          include: {
            buyer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        })

        if (existingConnection) {
          connectionStatus = 'added_to_buyer'
        }
      }
    }

    // Extract detailed features if available
    const features = propertyDetail.features?.map((f) => ({
      category: f.category,
      items: f.text,
    })) || []

    // Extract price history
    const priceHistory = propertyDetail.price_history?.map((h) => ({
      date: h.date,
      price: h.price,
      priceFormatted: formatPrice(h.price),
      event: h.event_name,
    })) || []

    // Extract nearby schools
    const schools = propertyDetail.schools?.map((s) => ({
      name: s.name,
      distance: s.distance_in_miles,
      rating: s.rating,
      levels: s.education_levels,
      type: s.funding_type,
    })) || []

    return successResponse({
        property: {
          propertyId: propertyDetail.property_id,
          listingId: propertyDetail.listing_id,
          ...houseData,
          priceFormatted: formatPrice(propertyDetail.list_price),
          features,
          priceHistory,
          schools,
          neighborhood: propertyDetail.location?.neighborhoods?.[0]?.name,
          county: propertyDetail.location?.county?.name,
          pool: propertyDetail.description?.pool,
          fireplace: propertyDetail.description?.fireplace,
          heating: propertyDetail.description?.heating,
          cooling: propertyDetail.description?.cooling,
        },
        status: {
          existsInDatabase: !!existingHouse,
          existingHouseId: existingHouse?.id || null,
          connectionStatus,
          existingConnection: existingConnection
            ? {
                id: existingConnection.id,
                isFavorite: existingConnection.isFavorite,
                // Only include buyer info for realtor
                ...(session.role === 'REALTOR' && 'buyer' in existingConnection
                  ? { buyer: existingConnection.buyer }
                  : {}),
              }
            : null,
        },
      })
  } catch (error) {
    console.error('Property preview error:', error)

    return errorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to fetch property details'
      )
  }
}
