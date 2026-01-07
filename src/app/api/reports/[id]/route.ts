import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api-response'
import { getRequestUser } from '@/lib/auth'
import { ReportContent } from '@/lib/ai-reports'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * GET /api/reports/[id]
 * Get a specific report
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    const { id } = await params

    const report = await prisma.aIReport.findUnique({
      where: { id },
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!report || report.deletedAt) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Report not found')
    }

    // Check access
    if (user.role === 'BUYER' && report.buyerId !== user.userId) {
      return errorResponse(ErrorCode.FORBIDDEN, 'Access denied')
    }

    if (user.role === 'REALTOR') {
      const connection = await prisma.buyerRealtor.findFirst({
        where: {
          realtorId: user.userId,
          buyerId: report.buyerId,
          deletedAt: null,
        },
      })
      if (!connection) {
        return errorResponse(ErrorCode.FORBIDDEN, 'Not connected to this buyer')
      }
    }

    // Get recommended house details if available
    let recommendedHouse = null
    if (report.recommendedHouseId) {
      recommendedHouse = await prisma.house.findUnique({
        where: { id: report.recommendedHouseId },
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
      })
    }

    // Get all houses for rankings context
    const houseBuyers = await prisma.houseBuyer.findMany({
      where: {
        buyerId: report.buyerId,
        deletedAt: null,
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
    })

    const housesMap = new Map(houseBuyers.map((hb) => [hb.house.id, hb.house]))

    return successResponse({
        id: report.id,
        status: report.status,
        language: report.language,
        content: report.content as ReportContent | null,
        ranking: report.ranking,
        recommendedHouse,
        dealBreakers: report.dealBreakers,
        insights: report.insights,
        housesAnalyzed: report.housesAnalyzed,
        recordingsAnalyzed: report.recordingsAnalyzed,
        generationStartedAt: report.generationStartedAt,
        generationCompletedAt: report.generationCompletedAt,
        errorMessage: report.errorMessage,
        createdAt: report.createdAt,
        buyer: report.buyer,
        houses: Array.from(housesMap.values()),
      })
  } catch (error) {
    console.error('Get report error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to get report')
  }
}

/**
 * DELETE /api/reports/[id]
 * Delete a report (soft delete)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    const { id } = await params

    const report = await prisma.aIReport.findUnique({
      where: { id },
    })

    if (!report || report.deletedAt) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Report not found')
    }

    // Only the owner or admin can delete
    if (user.role !== 'ADMIN' && report.buyerId !== user.userId) {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only the report owner can delete it')
    }

    // Soft delete
    await prisma.aIReport.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    return successResponse({
        message: 'Report deleted',
        id,
      })
  } catch (error) {
    console.error('Delete report error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to delete report')
  }
}
