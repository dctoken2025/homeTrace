import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, ErrorCode, Errors } from '@/lib/api-response'
import { getSessionUser } from '@/lib/auth-session'
import { z } from 'zod'

// Schema for query params
const querySchema = z.object({
  start: z.string().datetime('Invalid start date'),
  end: z.string().datetime('Invalid end date'),
  buyerId: z.string().uuid().optional(), // For realtors to filter by buyer
})

/**
 * GET /api/visits/calendar
 * Get visits in calendar format for a date range
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries())
    const queryValidation = querySchema.safeParse(searchParams)

    if (!queryValidation.success) {
      return errorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid query parameters. Required: start and end dates in ISO format',
          queryValidation.error.flatten().fieldErrors
        )
    }

    const { start, end, buyerId } = queryValidation.data
    const startDate = new Date(start)
    const endDate = new Date(end)

    // Build where clause based on role
    const where: any = {
      deletedAt: null,
      scheduledAt: {
        gte: startDate,
        lte: endDate,
      },
    }

    if (session.role === 'BUYER') {
      where.buyerId = session.userId
    } else if (session.role === 'REALTOR') {
      // Get connected buyers
      const connectedBuyers = await prisma.buyerRealtor.findMany({
        where: { realtorId: session.userId },
        select: { buyerId: true },
      })
      const buyerIds = connectedBuyers.map((c) => c.buyerId)

      if (buyerId) {
        // Filter to specific buyer if requested and realtor has access
        if (!buyerIds.includes(buyerId)) {
          return errorResponse(ErrorCode.FORBIDDEN, 'Not connected to this buyer')
        }
        where.buyerId = buyerId
      } else {
        where.buyerId = { in: buyerIds }
      }
    }
    // Admins see all visits

    // Get visits for calendar
    const visits = await prisma.visit.findMany({
      where,
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
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    })

    // Transform to calendar event format
    const events = visits.map((v) => {
      // Determine event color based on status
      let color: string
      switch (v.status) {
        case 'SCHEDULED':
          color = '#3B82F6' // blue
          break
        case 'IN_PROGRESS':
          color = '#F59E0B' // amber
          break
        case 'COMPLETED':
          color = '#10B981' // green
          break
        case 'CANCELLED':
          color = '#6B7280' // gray
          break
        default:
          color = '#3B82F6'
      }

      // Determine event icon/emoji based on impression
      let impressionIcon = ''
      if (v.status === 'COMPLETED' && v.overallImpression) {
        switch (v.overallImpression) {
          case 'LOVED':
            impressionIcon = '❤️'
            break
          case 'LIKED':
            impressionIcon = '👍'
            break
          case 'NEUTRAL':
            impressionIcon = '😐'
            break
          case 'DISLIKED':
            impressionIcon = '👎'
            break
        }
      }

      return {
        id: v.id,
        title: `${impressionIcon} ${v.house.address}`.trim(),
        start: v.scheduledAt.toISOString(),
        end: v.completedAt?.toISOString() || new Date(v.scheduledAt.getTime() + 60 * 60 * 1000).toISOString(), // Default 1 hour
        color,
        extendedProps: {
          status: v.status,
          house: v.house,
          buyer: v.buyer,
          overallImpression: v.overallImpression,
          wouldBuy: v.wouldBuy,
          startedAt: v.startedAt,
          completedAt: v.completedAt,
        },
      }
    })

    // Also return summary stats
    const stats = {
      total: visits.length,
      scheduled: visits.filter((v) => v.status === 'SCHEDULED').length,
      inProgress: visits.filter((v) => v.status === 'IN_PROGRESS').length,
      completed: visits.filter((v) => v.status === 'COMPLETED').length,
      cancelled: visits.filter((v) => v.status === 'CANCELLED').length,
    }

    return successResponse({
        events,
        stats,
        range: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      })
  } catch (error) {
    console.error('Calendar visits error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to get calendar events')
  }
}
