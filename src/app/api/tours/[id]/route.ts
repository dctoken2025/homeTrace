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

// Schema for updating a tour
const updateTourSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  buyerId: z.string().nullable().optional(),
  scheduledDate: z.string().datetime().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
})

/**
 * GET /api/tours/[id]
 * Get a specific tour with all stops
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    const { id } = await params

    const tour = await prisma.tour.findUnique({
      where: { id },
      include: {
        stops: {
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
                images: true,
              },
            },
            visit: {
              select: {
                id: true,
                status: true,
                scheduledAt: true,
                startedAt: true,
                completedAt: true,
              },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
        realtor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    })

    if (!tour) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Tour not found')
    }

    // Check access - realtor who created it, buyer it's for, or admin
    if (
      user.role !== 'ADMIN' &&
      tour.realtorId !== user.userId &&
      tour.buyerId !== user.userId
    ) {
      return errorResponse(ErrorCode.FORBIDDEN, 'Access denied')
    }

    if (tour.deletedAt) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Tour has been deleted')
    }

    return successResponse({
        id: tour.id,
        name: tour.name,
        buyerId: tour.buyerId,
        status: tour.status,
        scheduledDate: tour.scheduledDate,
        notes: tour.notes,
        realtor: tour.realtor,
        stops: tour.stops.map((stop) => ({
          id: stop.id,
          orderIndex: stop.orderIndex,
          estimatedTime: stop.estimatedTime,
          notes: stop.notes,
          house: stop.house,
          visit: stop.visit,
        })),
        createdAt: tour.createdAt,
        updatedAt: tour.updatedAt,
      })
  } catch (error) {
    console.error('Get tour error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to get tour')
  }
}

/**
 * PATCH /api/tours/[id]
 * Update a tour
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    const { id } = await params

    const tour = await prisma.tour.findUnique({
      where: { id },
    })

    if (!tour) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Tour not found')
    }

    // Only the realtor who created it can update
    if (user.role !== 'ADMIN' && tour.realtorId !== user.userId) {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only the tour creator can update it')
    }

    if (tour.deletedAt) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Tour has been deleted')
    }

    const body = await request.json()
    const validation = updateTourSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid request body',
          validation.error.flatten().fieldErrors
        )
    }

    const { name, buyerId, scheduledDate, notes, status } = validation.data

    // Validate status transitions
    if (status) {
      const validTransitions: Record<string, string[]> = {
        PLANNED: ['IN_PROGRESS', 'CANCELLED'],
        IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
        COMPLETED: [],
        CANCELLED: [],
      }

      if (!validTransitions[tour.status].includes(status)) {
        return errorResponse(
            ErrorCode.INVALID_STATE_TRANSITION,
            `Cannot transition from ${tour.status} to ${status}`
          )
      }
    }

    // If changing buyerId, verify the connection exists
    if (buyerId !== undefined && buyerId !== null) {
      const connection = await prisma.buyerRealtor.findFirst({
        where: {
          buyerId,
          realtorId: user.userId,
          deletedAt: null,
        },
      })

      if (!connection) {
        return errorResponse(ErrorCode.NOT_FOUND, 'No active connection with this buyer')
      }
    }

    const updatedTour = await prisma.tour.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(buyerId !== undefined && { buyerId }),
        ...(scheduledDate !== undefined && {
          scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        }),
        ...(notes !== undefined && { notes }),
        ...(status !== undefined && { status }),
      },
    })

    return successResponse({
        message: 'Tour updated',
        tour: {
          id: updatedTour.id,
          name: updatedTour.name,
          buyerId: updatedTour.buyerId,
          status: updatedTour.status,
          scheduledDate: updatedTour.scheduledDate,
          notes: updatedTour.notes,
          updatedAt: updatedTour.updatedAt,
        },
      })
  } catch (error) {
    console.error('Update tour error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to update tour')
  }
}

/**
 * DELETE /api/tours/[id]
 * Delete a tour (soft delete)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    const { id } = await params

    const tour = await prisma.tour.findUnique({
      where: { id },
    })

    if (!tour) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Tour not found')
    }

    // Only the realtor who created it can delete
    if (user.role !== 'ADMIN' && tour.realtorId !== user.userId) {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only the tour creator can delete it')
    }

    if (tour.deletedAt) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Tour already deleted')
    }

    // Soft delete
    await prisma.tour.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    return successResponse({
        message: 'Tour deleted',
        id,
      })
  } catch (error) {
    console.error('Delete tour error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to delete tour')
  }
}
