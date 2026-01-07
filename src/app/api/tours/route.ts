import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, ErrorCode, paginatedResponse } from '@/lib/api-response'
import { getRequestUser } from '@/lib/auth'
import { z } from 'zod'

// Schema for query params
const querySchema = z.object({
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  buyerId: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
})

// Schema for creating a tour
const createTourSchema = z.object({
  name: z.string().min(1).max(200),
  buyerId: z.string().optional(),
  scheduledDate: z.string().datetime().optional(),
  notes: z.string().optional(),
})

/**
 * GET /api/tours
 * List tours for the current realtor
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    // Only realtors and admins can list tours
    if (user.role !== 'REALTOR' && user.role !== 'ADMIN') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only realtors can view tours')
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries())
    const queryValidation = querySchema.safeParse(searchParams)

    if (!queryValidation.success) {
      return errorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid query parameters',
          queryValidation.error.flatten().fieldErrors
        )
    }

    const { status, buyerId, page, limit } = queryValidation.data
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {
      realtorId: user.userId,
      deletedAt: null,
    }

    if (status) where.status = status
    if (buyerId) where.buyerId = buyerId

    const [tours, total] = await Promise.all([
      prisma.tour.findMany({
        where,
        include: {
          stops: {
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
              visit: {
                select: {
                  id: true,
                  status: true,
                },
              },
            },
            orderBy: { orderIndex: 'asc' },
          },
          _count: {
            select: { stops: true },
          },
        },
        orderBy: [{ scheduledDate: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.tour.count({ where }),
    ])

    return paginatedResponse(
      tours.map((tour) => ({
        id: tour.id,
        name: tour.name,
        buyerId: tour.buyerId,
        status: tour.status,
        scheduledDate: tour.scheduledDate,
        notes: tour.notes,
        stopsCount: tour._count.stops,
        stops: tour.stops,
        createdAt: tour.createdAt,
      })),
      page,
      limit,
      total
    )
  } catch (error) {
    console.error('List tours error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to list tours')
  }
}

/**
 * POST /api/tours
 * Create a new tour
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    // Only realtors can create tours
    if (user.role !== 'REALTOR' && user.role !== 'ADMIN') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only realtors can create tours')
    }

    const body = await request.json()
    const validation = createTourSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid request body',
          validation.error.flatten().fieldErrors
        )
    }

    const { name, buyerId, scheduledDate, notes } = validation.data

    // If buyerId provided, verify the connection exists
    if (buyerId) {
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

    const tour = await prisma.tour.create({
      data: {
        name,
        realtorId: user.userId,
        buyerId,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        notes,
      },
    })

    return successResponse({
        message: 'Tour created successfully',
        tour: {
          id: tour.id,
          name: tour.name,
          buyerId: tour.buyerId,
          status: tour.status,
          scheduledDate: tour.scheduledDate,
          notes: tour.notes,
          createdAt: tour.createdAt,
        },
      })
  } catch (error) {
    console.error('Create tour error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to create tour')
  }
}
