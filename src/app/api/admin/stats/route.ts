import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, ErrorCode, Errors } from '@/lib/api-response'
import { getSessionUser } from '@/lib/auth-session'

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from session (cookie-based auth)
    const session = await getSessionUser(request)

    if (!session) {
      return Errors.unauthorized()
    }

    if (session.role !== 'ADMIN') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Admin access required')
    }

    // Get date 7 days ago
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Get date 24 hours ago
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    // Fetch all stats in parallel
    const [
      totalUsers,
      buyerCount,
      realtorCount,
      adminCount,
      newUsersCount,
      houseCount,
      visitCount,
      completedVisitCount,
      recordingCount,
      reportCount,
      apiLogCount,
      apiSuccessCount,
      apiErrorCount,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { role: 'BUYER', deletedAt: null } }),
      prisma.user.count({ where: { role: 'REALTOR', deletedAt: null } }),
      prisma.user.count({ where: { role: 'ADMIN', deletedAt: null } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo }, deletedAt: null } }),
      prisma.house.count({ where: { deletedAt: null } }),
      prisma.visit.count({ where: { deletedAt: null } }),
      prisma.visit.count({ where: { status: 'COMPLETED', deletedAt: null } }),
      prisma.recording.count({ where: { deletedAt: null } }),
      prisma.aIReport.count(),
      prisma.apiLog.count({ where: { createdAt: { gte: oneDayAgo } } }),
      prisma.apiLog.count({ where: { createdAt: { gte: oneDayAgo }, responseStatus: { lt: 400 } } }),
      prisma.apiLog.count({ where: { createdAt: { gte: oneDayAgo }, responseStatus: { gte: 400 } } }),
    ])

    // Get API usage by service
    const apiByService = await prisma.apiLog.groupBy({
      by: ['service'],
      where: { createdAt: { gte: oneDayAgo } },
      _count: true,
    })

    const stats = {
      users: {
        total: totalUsers,
        buyers: buyerCount,
        realtors: realtorCount,
        admins: adminCount,
        newLast7Days: newUsersCount,
      },
      houses: {
        total: houseCount,
      },
      visits: {
        total: visitCount,
        completed: completedVisitCount,
        completionRate: visitCount > 0 ? Math.round((completedVisitCount / visitCount) * 100) : 0,
      },
      recordings: {
        total: recordingCount,
      },
      reports: {
        total: reportCount,
      },
      api: {
        total: apiLogCount,
        success: apiSuccessCount,
        errors: apiErrorCount,
        byService: apiByService.reduce((acc, item) => {
          acc[item.service] = item._count
          return acc
        }, {} as Record<string, number>),
      },
      userGrowth: {},
    }

    return successResponse(stats)
  } catch (error) {
    console.error('Admin stats error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to fetch stats')
  }
}
