import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, ErrorCode, paginatedResponse, Errors } from '@/lib/api-response'
import { getSessionUser } from '@/lib/auth-session'
import { z } from 'zod'

// Schema for query params
const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
})

/**
 * GET /api/clients
 * List connected clients for the current realtor
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    // Only realtors and admins can list clients
    if (session.role !== 'REALTOR' && session.role !== 'ADMIN') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only realtors can view clients')
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

    const { page, limit, search } = queryValidation.data
    const skip = (page - 1) * limit

    // Get connected buyers
    const where: any = {
      realtorId: session.userId,
      deletedAt: null,
    }

    if (search) {
      where.buyer = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }
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
              avatarUrl: true,
              createdAt: true,
              privacySettings: {
                select: {
                  shareReportWithRealtor: true,
                  shareDreamHouseProfile: true,
                  shareRecordings: true,
                },
              },
            },
          },
        },
        orderBy: { connectedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.buyerRealtor.count({ where }),
    ])

    // Get activity stats for each buyer
    const clientsWithStats = await Promise.all(
      connections.map(async (conn) => {
        const [housesCount, visitsCount, completedVisits, lastVisit] = await Promise.all([
          prisma.houseBuyer.count({
            where: { buyerId: conn.buyerId, deletedAt: null },
          }),
          prisma.visit.count({
            where: { buyerId: conn.buyerId, deletedAt: null },
          }),
          prisma.visit.count({
            where: { buyerId: conn.buyerId, status: 'COMPLETED', deletedAt: null },
          }),
          prisma.visit.findFirst({
            where: { buyerId: conn.buyerId, deletedAt: null },
            orderBy: { scheduledAt: 'desc' },
            select: { scheduledAt: true, status: true },
          }),
        ])

        return {
          id: conn.id,
          connectedAt: conn.connectedAt,
          buyer: conn.buyer,
          stats: {
            housesCount,
            visitsCount,
            completedVisits,
            lastVisit: lastVisit
              ? { date: lastVisit.scheduledAt, status: lastVisit.status }
              : null,
          },
        }
      })
    )

    return paginatedResponse(clientsWithStats, page, limit, total)
  } catch (error) {
    console.error('List clients error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to list clients')
  }
}
