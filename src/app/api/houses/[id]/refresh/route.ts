import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api-response'
import { getRequestUser } from '@/lib/auth'
import { realtyAPI, transformPropertyToHouse } from '@/lib/realty-api'
import { Prisma } from '@prisma/client'
import { checkRateLimit, getIdentifier } from '@/lib/rate-limit'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * POST /api/houses/[id]/refresh
 * Refresh house data from external API (manual sync)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Rate limiting for Realty API (external API with monthly quota)
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    const identifier = getIdentifier(ip)
    const rateLimit = checkRateLimit(identifier, 'realtySearch')
    if (!rateLimit.success) {
      return errorResponse(
        ErrorCode.RATE_LIMIT_EXCEEDED,
        'Too many refresh requests. Please wait a moment.',
        { retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000) }
      )
    }

    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    const { id } = await params

    // Get the house buyer record
    const houseBuyer = await prisma.houseBuyer.findUnique({
      where: { id },
      select: {
        id: true,
        buyerId: true,
        addedByRealtorId: true,
        house: true,
      },
    })

    if (!houseBuyer) {
      return errorResponse(ErrorCode.NOT_FOUND, 'House not found')
    }

    // Check access permissions
    const hasAccess =
      user.role === 'ADMIN' ||
      houseBuyer.buyerId === user.userId ||
      houseBuyer.addedByRealtorId === user.userId

    if (!hasAccess && user.role === 'REALTOR') {
      const connection = await prisma.buyerRealtor.findFirst({
        where: {
          realtorId: user.userId,
          buyerId: houseBuyer.buyerId,
        },
      })

      if (!connection) {
        return errorResponse(ErrorCode.FORBIDDEN, 'Access denied')
      }
    } else if (!hasAccess) {
      return errorResponse(ErrorCode.FORBIDDEN, 'Access denied')
    }

    const house = houseBuyer.house

    if (!house.externalId) {
      return errorResponse(
          ErrorCode.VALIDATION_ERROR,
          'House has no external ID for refresh'
        )
    }

    // Fetch fresh data from external API
    const propertyDetail = await realtyAPI.getPropertyDetail(house.externalId)

    if (!propertyDetail) {
      return errorResponse(
          ErrorCode.EXTERNAL_API_ERROR,
          'Property no longer available in external API'
        )
    }

    const updatedData = transformPropertyToHouse(propertyDetail)

    // Track what changed
    const changes: Record<string, { old: unknown; new: unknown }> = {}

    if (house.price !== updatedData.price) {
      changes.price = { old: house.price, new: updatedData.price }
    }
    if (house.listingStatus !== updatedData.listingStatus) {
      changes.listingStatus = {
        old: house.listingStatus,
        new: updatedData.listingStatus,
      }
    }
    if (house.bedrooms !== updatedData.bedrooms) {
      changes.bedrooms = { old: house.bedrooms, new: updatedData.bedrooms }
    }
    if (house.bathrooms !== updatedData.bathrooms) {
      changes.bathrooms = { old: house.bathrooms, new: updatedData.bathrooms }
    }
    if (house.sqft !== updatedData.sqft) {
      changes.sqft = { old: house.sqft, new: updatedData.sqft }
    }

    // Update house in database
    const updatedHouse = await prisma.house.update({
      where: { id: house.id },
      data: {
        address: updatedData.address,
        city: updatedData.city,
        state: updatedData.state,
        zipCode: updatedData.zipCode,
        latitude: updatedData.latitude,
        longitude: updatedData.longitude,
        price: updatedData.price,
        bedrooms: updatedData.bedrooms,
        bathrooms: updatedData.bathrooms,
        sqft: updatedData.sqft,
        yearBuilt: updatedData.yearBuilt,
        propertyType: updatedData.propertyType,
        listingStatus: updatedData.listingStatus,
        lastSyncedAt: new Date(),
        images: updatedData.images,
        rawApiData: updatedData.rawApiData as unknown as Prisma.InputJsonValue,
      },
    })

    const hasChanges = Object.keys(changes).length > 0

    return successResponse({
        message: hasChanges
          ? 'House data updated with changes'
          : 'House data is already up to date',
        hasChanges,
        changes,
        house: {
          id: updatedHouse.id,
          address: updatedHouse.address,
          city: updatedHouse.city,
          state: updatedHouse.state,
          price: updatedHouse.price,
          bedrooms: updatedHouse.bedrooms,
          bathrooms: updatedHouse.bathrooms,
          sqft: updatedHouse.sqft,
          listingStatus: updatedHouse.listingStatus,
          lastSyncedAt: updatedHouse.lastSyncedAt,
        },
      })
  } catch (error) {
    console.error('Refresh house error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to refresh house data')
  }
}
