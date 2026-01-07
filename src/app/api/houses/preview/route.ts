import { NextRequest, NextResponse } from 'next/server'
import { realtyAPI, transformPropertyToHouse, formatPrice } from '@/lib/realty-api'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api-response'
import { getRequestUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/houses/preview?propertyId=xxx
 * Get property preview from external API before adding
 * Also checks if the house already exists in the user's list
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
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
      if (user.role === 'BUYER') {
        existingConnection = await prisma.houseBuyer.findFirst({
          where: {
            houseId: existingHouse.id,
            buyerId: user.userId,
          },
        })

        if (existingConnection) {
          connectionStatus = 'already_added'
        }
      } else if (user.role === 'REALTOR') {
        // For realtors, check if they've added this house for any buyer
        existingConnection = await prisma.houseBuyer.findFirst({
          where: {
            houseId: existingHouse.id,
            addedByRealtorId: user.userId,
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
                ...(user.role === 'REALTOR' && 'buyer' in existingConnection
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
