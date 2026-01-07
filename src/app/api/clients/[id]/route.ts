import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api-response'
import { getRequestUser } from '@/lib/auth'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * GET /api/clients/[id]
 * Get detailed info about a connected client (buyer)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    // Only realtors and admins can view client details
    if (user.role !== 'REALTOR' && user.role !== 'ADMIN') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only realtors can view client details')
    }

    const { id: buyerId } = await params

    // Check if there's a connection between this realtor and buyer
    const connection = await prisma.buyerRealtor.findFirst({
      where: {
        realtorId: user.userId,
        buyerId,
        deletedAt: null,
      },
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
    })

    if (!connection) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Client not found or not connected')
    }

    // Get houses assigned to this buyer
    const houses = await prisma.houseBuyer.findMany({
      where: { buyerId, deletedAt: null },
      include: {
        house: {
          select: {
            id: true,
            address: true,
            city: true,
            state: true,
            price: true,
            bedrooms: true,
            bathrooms: true,
            sqft: true,
            images: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Get visits
    const visits = await prisma.visit.findMany({
      where: { buyerId, deletedAt: null },
      include: {
        house: {
          select: {
            id: true,
            address: true,
            city: true,
          },
        },
      },
      orderBy: { scheduledAt: 'desc' },
      take: 10,
    })

    // Get dream house profile if shared
    let dreamHouseProfile = null
    if (connection.buyer.privacySettings?.shareDreamHouseProfile) {
      const profile = await prisma.dreamHouseProfile.findUnique({
        where: { buyerId },
      })
      if (profile) {
        dreamHouseProfile = profile.profile
      }
    }

    // Get AI reports if shared
    let reports: any[] = []
    if (connection.buyer.privacySettings?.shareReportWithRealtor) {
      reports = await prisma.aIReport.findMany({
        where: { buyerId, status: 'COMPLETED', deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          status: true,
          housesAnalyzed: true,
          createdAt: true,
        },
      })
    }

    return successResponse({
      connection: {
        id: connection.id,
        connectedAt: connection.connectedAt,
      },
      buyer: connection.buyer,
      houses: houses.map((hb) => ({
        id: hb.id,
        isFavorite: hb.isFavorite,
        matchScore: hb.matchScore,
        notes: hb.notes,
        realtorNotes: hb.realtorNotes,
        house: hb.house,
      })),
      visits: visits.map((v) => ({
        id: v.id,
        status: v.status,
        scheduledAt: v.scheduledAt,
        completedAt: v.completedAt,
        overallImpression: v.overallImpression,
        wouldBuy: v.wouldBuy,
        house: v.house,
      })),
      dreamHouseProfile,
      reports,
    })
  } catch (error) {
    console.error('Get client error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to get client')
  }
}
