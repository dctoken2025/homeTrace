import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api-response'
import { getRequestUser } from '@/lib/auth'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// Schema for updating a visit
const updateVisitSchema = z.object({
  scheduledAt: z.string().datetime('Invalid date format').optional(),
  notes: z.string().optional(),
})

/**
 * Check if user has access to the visit
 */
async function checkVisitAccess(
  visitId: string,
  userId: string,
  userRole: string
): Promise<{ hasAccess: boolean; visit: any }> {
  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    include: {
      house: {
        select: {
          id: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          price: true,
          bedrooms: true,
          bathrooms: true,
          sqft: true,
          yearBuilt: true,
          propertyType: true,
          listingStatus: true,
          images: true,
        },
      },
      buyer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      recordings: {
        where: { deletedAt: null },
        select: {
          id: true,
          roomName: true,
          audioDuration: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!visit || visit.deletedAt) {
    return { hasAccess: false, visit: null }
  }

  // Check access based on role
  if (userRole === 'ADMIN') {
    return { hasAccess: true, visit }
  }

  if (userRole === 'BUYER' && visit.buyerId === userId) {
    return { hasAccess: true, visit }
  }

  if (userRole === 'REALTOR') {
    // Check if realtor is connected to the buyer
    const connection = await prisma.buyerRealtor.findFirst({
      where: {
        realtorId: userId,
        buyerId: visit.buyerId,
      },
    })
    return { hasAccess: !!connection, visit }
  }

  return { hasAccess: false, visit }
}

/**
 * GET /api/visits/[id]
 * Get details of a specific visit
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    const { id } = await params

    const { hasAccess, visit } = await checkVisitAccess(id, user.userId, user.role)

    if (!visit) {
      return errorResponse(ErrorCode.VISIT_NOT_FOUND, 'Visit not found')
    }

    if (!hasAccess) {
      return errorResponse(ErrorCode.FORBIDDEN, 'Access denied')
    }

    return successResponse({
        id: visit.id,
        status: visit.status,
        scheduledAt: visit.scheduledAt,
        startedAt: visit.startedAt,
        completedAt: visit.completedAt,
        overallImpression: visit.overallImpression,
        wouldBuy: visit.wouldBuy,
        notes: visit.notes,
        createdAt: visit.createdAt,
        updatedAt: visit.updatedAt,
        house: visit.house,
        buyer: visit.buyer,
        recordings: visit.recordings,
        recordingCount: visit.recordings.length,
      })
  } catch (error) {
    console.error('Get visit error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to get visit details')
  }
}

/**
 * PATCH /api/visits/[id]
 * Update a visit (only SCHEDULED visits can be updated)
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
    const validation = updateVisitSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid request body',
          validation.error.flatten().fieldErrors
        )
    }

    // Get visit and check access
    const visit = await prisma.visit.findUnique({
      where: { id },
    })

    if (!visit || visit.deletedAt) {
      return errorResponse(ErrorCode.VISIT_NOT_FOUND, 'Visit not found')
    }

    // Only the buyer who owns the visit can update it
    if (user.role !== 'ADMIN' && visit.buyerId !== user.userId) {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only the visit owner can update it')
    }

    // Only SCHEDULED visits can be updated
    if (visit.status !== 'SCHEDULED') {
      return errorResponse(
          ErrorCode.INVALID_STATE_TRANSITION,
          'Only scheduled visits can be updated'
        )
    }

    const { scheduledAt, notes } = validation.data

    // Validate new scheduledAt if provided
    if (scheduledAt) {
      const newScheduledDate = new Date(scheduledAt)
      if (newScheduledDate < new Date()) {
        return errorResponse(
            ErrorCode.VALIDATION_ERROR,
            'Scheduled date cannot be in the past'
          )
      }
    }

    // Update the visit
    const updated = await prisma.visit.update({
      where: { id },
      data: {
        ...(scheduledAt && { scheduledAt: new Date(scheduledAt) }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        house: {
          select: {
            id: true,
            address: true,
            city: true,
            state: true,
          },
        },
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
        status: updated.status,
        scheduledAt: updated.scheduledAt,
        notes: updated.notes,
        updatedAt: updated.updatedAt,
        house: updated.house,
        buyer: updated.buyer,
      })
  } catch (error) {
    console.error('Update visit error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to update visit')
  }
}

/**
 * DELETE /api/visits/[id]
 * Cancel/delete a visit (soft delete)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    const { id } = await params

    // Get visit
    const visit = await prisma.visit.findUnique({
      where: { id },
      include: {
        house: {
          select: {
            address: true,
          },
        },
      },
    })

    if (!visit || visit.deletedAt) {
      return errorResponse(ErrorCode.VISIT_NOT_FOUND, 'Visit not found')
    }

    // Only the buyer who owns the visit or admin can delete it
    if (user.role !== 'ADMIN' && visit.buyerId !== user.userId) {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only the visit owner can delete it')
    }

    // Cannot delete completed visits
    if (visit.status === 'COMPLETED') {
      return errorResponse(
          ErrorCode.INVALID_STATE_TRANSITION,
          'Completed visits cannot be deleted'
        )
    }

    // If visit is in progress, cancel it instead
    if (visit.status === 'IN_PROGRESS') {
      await prisma.visit.update({
        where: { id },
        data: { status: 'CANCELLED' },
      })

      return successResponse({
          message: 'Visit cancelled',
          visit: {
            id: visit.id,
            status: 'CANCELLED',
            address: visit.house.address,
          },
        })
    }

    // Soft delete scheduled/cancelled visits
    await prisma.visit.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    return successResponse({
        message: 'Visit deleted',
        visit: {
          id: visit.id,
          address: visit.house.address,
        },
      })
  } catch (error) {
    console.error('Delete visit error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to delete visit')
  }
}
