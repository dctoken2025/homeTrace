import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api-response'
import { getRequestUser } from '@/lib/auth'
import { addDays } from 'date-fns'

/**
 * GET /api/dashboard/buyer
 * Get buyer dashboard stats and data
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    if (user.role !== 'BUYER') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Access denied')
    }

    const buyerId = user.userId

    // Get user info first
    const userInfo = await prisma.user.findUnique({
      where: { id: buyerId },
      select: {
        name: true,
        hasCompletedOnboarding: true,
      },
    })

    // Get stats in parallel
    const [
      totalHousesResult,
      visitedHousesCount,
      recordingsCount,
      favoritesCount,
      upcomingVisits,
      favoriteHouses,
      dreamProfile,
      reportsCount,
    ] = await Promise.all([
      // Total houses in buyer's list
      prisma.houseBuyer.count({
        where: { buyerId, deletedAt: null },
      }),

      // Houses with completed visits
      prisma.visit.groupBy({
        by: ['houseId'],
        where: {
          buyerId,
          deletedAt: null,
          status: 'COMPLETED',
        },
      }),

      // Total recordings
      prisma.recording.count({
        where: { buyerId, deletedAt: null },
      }),

      // Favorites count
      prisma.houseBuyer.count({
        where: { buyerId, deletedAt: null, isFavorite: true },
      }),

      // Upcoming scheduled visits (next 14 days)
      prisma.visit.findMany({
        where: {
          buyerId,
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
        },
        orderBy: { scheduledAt: 'asc' },
        take: 3,
      }),

      // Favorite houses with visit and recording info
      prisma.houseBuyer.findMany({
        where: {
          buyerId,
          deletedAt: null,
          isFavorite: true,
        },
        include: {
          house: {
            select: {
              id: true,
              address: true,
              city: true,
              state: true,
              price: true,
              images: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),

      // Dream house profile
      prisma.dreamHouseProfile.findUnique({
        where: { buyerId },
        select: { isComplete: true },
      }),

      // AI Reports count
      prisma.aIReport.count({
        where: { buyerId, deletedAt: null, status: 'COMPLETED' },
      }),
    ])

    // Get recording counts for favorite houses
    const favoriteHouseIds = favoriteHouses.map((fh) => fh.houseId)
    const recordingsPerHouse = await prisma.recording.groupBy({
      by: ['visitId'],
      where: {
        buyerId,
        deletedAt: null,
        visit: {
          houseId: { in: favoriteHouseIds },
        },
      },
      _count: true,
    })

    // Get visit IDs to house mapping
    const visitsForFavorites = await prisma.visit.findMany({
      where: {
        houseId: { in: favoriteHouseIds },
        buyerId,
        deletedAt: null,
      },
      select: {
        id: true,
        houseId: true,
        overallImpression: true,
      },
    })

    // Create a map of house ID to recording count and impression
    const houseDataMap = new Map<string, { recordingCount: number; impression: string | null }>()

    for (const visit of visitsForFavorites) {
      const current = houseDataMap.get(visit.houseId) || { recordingCount: 0, impression: null }
      const visitRecordings = recordingsPerHouse.filter((r) => r.visitId === visit.id)
      current.recordingCount += visitRecordings.reduce((sum, r) => sum + r._count, 0)
      if (visit.overallImpression) {
        current.impression = visit.overallImpression
      }
      houseDataMap.set(visit.houseId, current)
    }

    // Format response
    const stats = {
      totalHouses: totalHousesResult,
      visitedHouses: visitedHousesCount.length,
      totalRecordings: recordingsCount,
      favorites: favoritesCount,
    }

    const formattedUpcomingVisits = upcomingVisits.map((v) => ({
      id: v.id,
      scheduledAt: v.scheduledAt.toISOString(),
      house: v.house,
    }))

    const formattedFavorites = favoriteHouses.map((fh) => {
      const houseData = houseDataMap.get(fh.houseId)
      return {
        id: fh.id,
        house: fh.house,
        recordingCount: houseData?.recordingCount || 0,
        overallImpression: houseData?.impression || null,
      }
    })

    return successResponse({
        user: {
          name: userInfo?.name || '',
          hasCompletedOnboarding: userInfo?.hasCompletedOnboarding || false,
        },
        stats,
        upcomingVisits: formattedUpcomingVisits,
        favoriteHouses: formattedFavorites,
        onboarding: {
          hasHouses: totalHousesResult > 0,
          hasVisits: visitedHousesCount.length > 0,
          hasRecordings: recordingsCount > 0,
          hasDreamProfile: dreamProfile?.isComplete || false,
          hasReport: reportsCount > 0,
        },
      })
  } catch (error) {
    console.error('Get buyer dashboard error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to get dashboard data')
  }
}
