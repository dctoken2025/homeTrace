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

// Schema for adding a stop
const addStopSchema = z.object({
  houseId: z.string(),
  orderIndex: z.number().min(0).optional(),
  estimatedTime: z.string().datetime().optional(),
  notes: z.string().optional(),
})

// Schema for reordering stops
const reorderStopsSchema = z.object({
  stops: z.array(
    z.object({
      id: z.string(),
      orderIndex: z.number().min(0),
    })
  ),
})

/**
 * POST /api/tours/[id]/stops
 * Add a stop to a tour
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    const { id: tourId } = await params

    const tour = await prisma.tour.findUnique({
      where: { id: tourId },
      include: {
        stops: {
          select: { orderIndex: true },
          orderBy: { orderIndex: 'desc' },
          take: 1,
        },
      },
    })

    if (!tour) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Tour not found')
    }

    // Only the realtor who created it can add stops
    if (user.role !== 'ADMIN' && tour.realtorId !== user.userId) {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only the tour creator can add stops')
    }

    if (tour.deletedAt) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Tour has been deleted')
    }

    // Can't add stops to completed or cancelled tours
    if (tour.status === 'COMPLETED' || tour.status === 'CANCELLED') {
      return errorResponse(
          ErrorCode.INVALID_STATE_TRANSITION,
          `Cannot add stops to a ${tour.status.toLowerCase()} tour`
        )
    }

    const body = await request.json()
    const validation = addStopSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid request body',
          validation.error.flatten().fieldErrors
        )
    }

    const { houseId, orderIndex, estimatedTime, notes } = validation.data

    // Verify house exists
    const house = await prisma.house.findUnique({
      where: { id: houseId },
    })

    if (!house || house.deletedAt) {
      return errorResponse(ErrorCode.NOT_FOUND, 'House not found')
    }

    // Check if house is already in this tour
    const existingStop = await prisma.tourStop.findUnique({
      where: {
        tourId_houseId: {
          tourId,
          houseId,
        },
      },
    })

    if (existingStop) {
      return errorResponse(ErrorCode.ALREADY_EXISTS, 'This house is already in the tour')
    }

    // Determine order index
    const maxOrderIndex = tour.stops.length > 0 ? tour.stops[0].orderIndex : -1
    const finalOrderIndex = orderIndex ?? maxOrderIndex + 1

    const stop = await prisma.tourStop.create({
      data: {
        tourId,
        houseId,
        orderIndex: finalOrderIndex,
        estimatedTime: estimatedTime ? new Date(estimatedTime) : null,
        notes,
      },
      include: {
        house: {
          select: {
            id: true,
            address: true,
            city: true,
            state: true,
            price: true,
          },
        },
      },
    })

    return successResponse({
        message: 'Stop added to tour',
        stop: {
          id: stop.id,
          orderIndex: stop.orderIndex,
          estimatedTime: stop.estimatedTime,
          notes: stop.notes,
          house: stop.house,
        },
      })
  } catch (error) {
    console.error('Add tour stop error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to add stop')
  }
}

/**
 * PUT /api/tours/[id]/stops
 * Reorder stops in a tour
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    const { id: tourId } = await params

    const tour = await prisma.tour.findUnique({
      where: { id: tourId },
    })

    if (!tour) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Tour not found')
    }

    // Only the realtor who created it can reorder
    if (user.role !== 'ADMIN' && tour.realtorId !== user.userId) {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only the tour creator can reorder stops')
    }

    if (tour.deletedAt) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Tour has been deleted')
    }

    const body = await request.json()
    const validation = reorderStopsSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid request body',
          validation.error.flatten().fieldErrors
        )
    }

    const { stops } = validation.data

    // Update all stops in a transaction
    await prisma.$transaction(
      stops.map((stop) =>
        prisma.tourStop.update({
          where: { id: stop.id },
          data: { orderIndex: stop.orderIndex },
        })
      )
    )

    // Fetch updated stops
    const updatedStops = await prisma.tourStop.findMany({
      where: { tourId },
      include: {
        house: {
          select: {
            id: true,
            address: true,
            city: true,
            state: true,
            price: true,
          },
        },
      },
      orderBy: { orderIndex: 'asc' },
    })

    return successResponse({
        message: 'Stops reordered',
        stops: updatedStops.map((stop) => ({
          id: stop.id,
          orderIndex: stop.orderIndex,
          estimatedTime: stop.estimatedTime,
          notes: stop.notes,
          house: stop.house,
        })),
      })
  } catch (error) {
    console.error('Reorder tour stops error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to reorder stops')
  }
}

/**
 * DELETE /api/tours/[id]/stops
 * Remove a stop from a tour (by houseId query param)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    const { id: tourId } = await params
    const stopId = request.nextUrl.searchParams.get('stopId')

    if (!stopId) {
      return errorResponse(ErrorCode.VALIDATION_ERROR, 'stopId query parameter is required')
    }

    const tour = await prisma.tour.findUnique({
      where: { id: tourId },
    })

    if (!tour) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Tour not found')
    }

    // Only the realtor who created it can remove stops
    if (user.role !== 'ADMIN' && tour.realtorId !== user.userId) {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only the tour creator can remove stops')
    }

    if (tour.deletedAt) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Tour has been deleted')
    }

    // Can't remove stops from completed or cancelled tours
    if (tour.status === 'COMPLETED' || tour.status === 'CANCELLED') {
      return errorResponse(
          ErrorCode.INVALID_STATE_TRANSITION,
          `Cannot remove stops from a ${tour.status.toLowerCase()} tour`
        )
    }

    const stop = await prisma.tourStop.findFirst({
      where: {
        id: stopId,
        tourId,
      },
    })

    if (!stop) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Stop not found in this tour')
    }

    await prisma.tourStop.delete({
      where: { id: stopId },
    })

    return successResponse({
        message: 'Stop removed from tour',
        id: stopId,
      })
  } catch (error) {
    console.error('Remove tour stop error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to remove stop')
  }
}
