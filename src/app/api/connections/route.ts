import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, ErrorCode, paginatedResponse } from '@/lib/api-response'
import { getRequestUser } from '@/lib/auth'
import { z } from 'zod'

// Schema for query params
const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
})

/**
 * GET /api/connections
 * List connections for the current user (buyer or realtor)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
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

    const { page, limit } = queryValidation.data
    const skip = (page - 1) * limit

    // Build where clause based on user role
    const where: any = {
      deletedAt: null,
    }

    if (user.role === 'BUYER') {
      where.buyerId = user.userId
    } else if (user.role === 'REALTOR') {
      where.realtorId = user.userId
    } else if (user.role !== 'ADMIN') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Access denied')
    }

    const [connections, total] = await Promise.all([
      prisma.buyerRealtor.findMany({
        where,
        include: {
          buyer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
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
        orderBy: { connectedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.buyerRealtor.count({ where }),
    ])

    return paginatedResponse(
      connections.map((conn) => ({
        id: conn.id,
        buyer: conn.buyer,
        realtor: conn.realtor,
        invitedById: conn.invitedById,
        connectedAt: conn.connectedAt,
      })),
      page,
      limit,
      total
    )
  } catch (error) {
    console.error('List connections error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to list connections')
  }
}
