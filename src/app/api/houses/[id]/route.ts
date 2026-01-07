import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api-response'
import { getRequestUser, canAccessBuyerResources } from '@/lib/auth'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// Schema for updating house buyer record
const updateSchema = z.object({
  isFavorite: z.boolean().optional(),
  notes: z.string().optional(),
})

/**
 * GET /api/houses/[id]
 * Get details of a specific house buyer record
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    const { id } = await params

    // Get house buyer with all related data
    const houseBuyer = await prisma.houseBuyer.findUnique({
      where: { id },
      include: {
        house: true,
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        addedByRealtor: {
          select: {
            id: true,
            name: true,
          },
        },
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
      // Check if realtor is connected to this buyer
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

    // Get visits for this house and buyer
    const visits = await prisma.visit.findMany({
      where: {
        houseId: houseBuyer.houseId,
        buyerId: houseBuyer.buyerId,
        deletedAt: null,
      },
      orderBy: { scheduledAt: 'desc' },
      include: {
        recordings: {
          select: {
            id: true,
            roomName: true,
            audioDuration: true,
            status: true,
            createdAt: true,
          },
        },
      },
    })

    return successResponse({
        id: houseBuyer.id,
        isFavorite: houseBuyer.isFavorite,
        matchScore: houseBuyer.matchScore,
        notes: houseBuyer.notes,
        createdAt: houseBuyer.createdAt,
        updatedAt: houseBuyer.updatedAt,
        house: {
          id: houseBuyer.house.id,
          externalId: houseBuyer.house.externalId,
          address: houseBuyer.house.address,
          city: houseBuyer.house.city,
          state: houseBuyer.house.state,
          zipCode: houseBuyer.house.zipCode,
          latitude: houseBuyer.house.latitude,
          longitude: houseBuyer.house.longitude,
          price: houseBuyer.house.price,
          bedrooms: houseBuyer.house.bedrooms,
          bathrooms: houseBuyer.house.bathrooms,
          sqft: houseBuyer.house.sqft,
          yearBuilt: houseBuyer.house.yearBuilt,
          propertyType: houseBuyer.house.propertyType,
          listingStatus: houseBuyer.house.listingStatus,
          images: houseBuyer.house.images,
          lastSyncedAt: houseBuyer.house.lastSyncedAt,
        },
        buyer: houseBuyer.buyer,
        addedByRealtor: houseBuyer.addedByRealtor,
        visits: visits.map((v) => ({
          id: v.id,
          status: v.status,
          scheduledAt: v.scheduledAt,
          startedAt: v.startedAt,
          completedAt: v.completedAt,
          overallImpression: v.overallImpression,
          notes: v.notes,
          recordingCount: v.recordings.length,
          recordings: v.recordings,
        })),
      })
  } catch (error) {
    console.error('Get house error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to get house details')
  }
}

/**
 * PATCH /api/houses/[id]
 * Update house buyer record (favorite, notes)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    const { id } = await params

    // Parse and validate body
    const body = await request.json()
    const validation = updateSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid request body',
          validation.error.flatten().fieldErrors
        )
    }

    // Get existing record
    const houseBuyer = await prisma.houseBuyer.findUnique({
      where: { id },
      include: { house: true },
    })

    if (!houseBuyer) {
      return errorResponse(ErrorCode.NOT_FOUND, 'House not found')
    }

    // Check access permissions - only buyer or realtor who added can edit
    const hasAccess =
      user.role === 'ADMIN' ||
      houseBuyer.buyerId === user.userId ||
      houseBuyer.addedByRealtorId === user.userId

    if (!hasAccess) {
      return errorResponse(ErrorCode.FORBIDDEN, 'Access denied')
    }

    // Update the record
    const updated = await prisma.houseBuyer.update({
      where: { id },
      data: validation.data,
      include: {
        house: true,
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return successResponse({
        id: updated.id,
        isFavorite: updated.isFavorite,
        notes: updated.notes,
        house: {
          id: updated.house.id,
          address: updated.house.address,
          city: updated.house.city,
          state: updated.house.state,
          price: updated.house.price,
        },
        buyer: updated.buyer,
        updatedAt: updated.updatedAt,
      })
  } catch (error) {
    console.error('Update house error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to update house')
  }
}

/**
 * DELETE /api/houses/[id]
 * Remove house from buyer's list (soft delete on HouseBuyer)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    const { id } = await params

    // Get existing record
    const houseBuyer = await prisma.houseBuyer.findUnique({
      where: { id },
      include: {
        house: true,
        buyer: {
          select: { id: true, name: true },
        },
      },
    })

    if (!houseBuyer) {
      return errorResponse(ErrorCode.NOT_FOUND, 'House not found')
    }

    // Check access permissions - only buyer who owns or admin can delete
    const canDelete =
      user.role === 'ADMIN' || houseBuyer.buyerId === user.userId

    if (!canDelete) {
      return errorResponse(
          ErrorCode.FORBIDDEN,
          'Only the buyer or admin can remove this house'
        )
    }

    // Soft delete the house buyer record
    await prisma.houseBuyer.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    // If a realtor added this house, they should be notified
    // In a real app, this would send a notification
    if (houseBuyer.addedByRealtorId && houseBuyer.addedByRealtorId !== user.userId) {
      console.log(
        `Buyer ${user.userId} removed house ${houseBuyer.house.address} that was added by realtor ${houseBuyer.addedByRealtorId}`
      )
    }

    return successResponse({
        message: 'House removed from your list',
        removedHouse: {
          id: houseBuyer.id,
          address: houseBuyer.house.address,
        },
      })
  } catch (error) {
    console.error('Delete house error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to remove house')
  }
}
