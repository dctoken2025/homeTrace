import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, ErrorCode, Errors } from '@/lib/api-response'
import { getSessionUser } from '@/lib/auth-session'
import { addDays } from 'date-fns'

/**
 * GET /api/dashboard/realtor
 * Get realtor dashboard stats and data
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    if (session.role !== 'REALTOR') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Access denied')
    }

    const realtorId = session.userId

    // Get user info first
    const userInfo = await prisma.user.findUnique({
      where: { id: realtorId },
      select: {
        name: true,
        hasCompletedOnboarding: true,
      },
    })

    // Get connected buyer IDs
    const connections = await prisma.buyerRealtor.findMany({
      where: {
        realtorId,
        deletedAt: null,
      },
      select: {
        buyerId: true,
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    const buyerIds = connections.map((c) => c.buyerId)

    // Get stats in parallel
    const [
      totalHousesResult,
      scheduledVisitsCount,
      completedVisitsCount,
      upcomingVisits,
      sentInvitesCount,
    ] = await Promise.all([
      // Total houses added for connected buyers
      prisma.houseBuyer.count({
        where: {
          buyerId: { in: buyerIds },
          deletedAt: null,
        },
      }),

      // Scheduled visits count
      prisma.visit.count({
        where: {
          buyerId: { in: buyerIds },
          deletedAt: null,
          status: 'SCHEDULED',
          scheduledAt: { gte: new Date() },
        },
      }),

      // Completed visits count
      prisma.visit.count({
        where: {
          buyerId: { in: buyerIds },
          deletedAt: null,
          status: 'COMPLETED',
        },
      }),

      // Upcoming scheduled visits (next 14 days)
      prisma.visit.findMany({
        where: {
          buyerId: { in: buyerIds },
          deletedAt: null,
          status: 'SCHEDULED',
          scheduledAt: {
            gte: new Date(),
            lte: addDays(new Date(), 14),
          },
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
          buyer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
      }),

      // Sent invites count
      prisma.invite.count({
        where: {
          realtorId,
        },
      }),
    ])

    // Get active client (most recent activity)
    let activeClient = null
    if (connections.length > 0) {
      const mostRecentVisit = await prisma.visit.findFirst({
        where: {
          buyerId: { in: buyerIds },
          deletedAt: null,
        },
        orderBy: { updatedAt: 'desc' },
        select: {
          buyer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

      activeClient = mostRecentVisit?.buyer || connections[0]?.buyer
    }

    // Format response
    const stats = {
      totalHouses: totalHousesResult,
      scheduledVisits: scheduledVisitsCount,
      completedVisits: completedVisitsCount,
      activeClients: connections.length,
    }

    const formattedUpcomingVisits = upcomingVisits.map((v) => ({
      id: v.id,
      scheduledAt: v.scheduledAt.toISOString(),
      house: v.house,
      buyer: v.buyer,
    }))

    return successResponse({
      user: {
        name: userInfo?.name || '',
        hasCompletedOnboarding: userInfo?.hasCompletedOnboarding || false,
      },
      stats,
      upcomingVisits: formattedUpcomingVisits,
      activeClient,
      clients: connections.map((c) => c.buyer),
      onboarding: {
        hasSentInvites: sentInvitesCount > 0,
        hasClients: connections.length > 0,
        hasHouses: totalHousesResult > 0,
        hasVisits: completedVisitsCount > 0 || scheduledVisitsCount > 0,
      },
    })
  } catch (error) {
    console.error('Get realtor dashboard error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to get dashboard data')
  }
}
