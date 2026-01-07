import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  ErrorCode,
  parsePaginationParams,
} from '@/lib/api-response'
import { getRequestUser } from '@/lib/auth'
import { z } from 'zod'
import { Prisma, VisitStatus } from '@prisma/client'

// Schema for creating a visit
const createVisitSchema = z.object({
  houseId: z.string().cuid('Invalid house ID'),
  scheduledAt: z.string().datetime('Invalid date format'),
  notes: z.string().optional(),
})

// Schema for query params
const querySchema = z.object({
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  houseId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
})

/**
 * GET /api/visits
 * List visits for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    const { page, limit, skip } = parsePaginationParams(request.nextUrl.searchParams)
    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries())
    const queryValidation = querySchema.safeParse(searchParams)

    if (!queryValidation.success) {
      return errorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid query parameters',
          queryValidation.error.flatten().fieldErrors
        )
    }

    const filters = queryValidation.data

    // Build where clause based on role
    const where: Prisma.VisitWhereInput = {
      deletedAt: null,
    }

    if (user.role === 'BUYER') {
      where.buyerId = user.userId
    } else if (user.role === 'REALTOR') {
      // Realtors see visits of their connected buyers
      const connectedBuyers = await prisma.buyerRealtor.findMany({
        where: { realtorId: user.userId },
        select: { buyerId: true },
      })
      where.buyerId = { in: connectedBuyers.map((c) => c.buyerId) }
    }
    // Admins see all visits

    // Apply filters
    if (filters.status) {
      where.status = filters.status as VisitStatus
    }

    if (filters.houseId) {
      where.houseId = filters.houseId
    }

    if (filters.from || filters.to) {
      where.scheduledAt = {
        ...(filters.from && { gte: new Date(filters.from) }),
        ...(filters.to && { lte: new Date(filters.to) }),
      }
    }

    // Get total count
    const total = await prisma.visit.count({ where })

    // Get paginated results
    const visits = await prisma.visit.findMany({
      where,
      include: {
        house: {
          select: {
            id: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            price: true,
            bedrooms: true,
            bathrooms: true,
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
        _count: {
          select: {
            recordings: true,
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
      skip,
      take: limit,
    })

    // Transform response
    const items = visits.map((v) => ({
      id: v.id,
      status: v.status,
      scheduledAt: v.scheduledAt,
      startedAt: v.startedAt,
      completedAt: v.completedAt,
      overallImpression: v.overallImpression,
      wouldBuy: v.wouldBuy,
      notes: v.notes,
      createdAt: v.createdAt,
      house: v.house,
      buyer: v.buyer,
      recordingCount: v._count.recordings,
    }))

    return paginatedResponse(items, total, page, limit)
  } catch (error) {
    console.error('List visits error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to list visits')
  }
}

/**
 * POST /api/visits
 * Create a new visit
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    // Only buyers can create visits
    if (user.role !== 'BUYER' && user.role !== 'ADMIN') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only buyers can create visits')
    }

    // Parse and validate body
    const body = await request.json()
    const validation = createVisitSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid request body',
          validation.error.flatten().fieldErrors
        )
    }

    const { houseId, scheduledAt, notes } = validation.data
    const scheduledDate = new Date(scheduledAt)

    // Validate scheduledAt is not in the past
    if (scheduledDate < new Date()) {
      return errorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Scheduled date cannot be in the past'
        )
    }

    // Verify the house exists and buyer has access
    const houseBuyer = await prisma.houseBuyer.findFirst({
      where: {
        houseId,
        buyerId: user.userId,
        deletedAt: null,
      },
      include: {
        house: true,
      },
    })

    if (!houseBuyer) {
      return errorResponse(
          ErrorCode.NOT_FOUND,
          'House not found in your list. Add the house first before scheduling a visit.'
        )
    }

    // Create the visit
    const visit = await prisma.visit.create({
      data: {
        houseId,
        buyerId: user.userId,
        scheduledAt: scheduledDate,
        notes,
      },
      include: {
        house: {
          select: {
            id: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
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
    })

    return successResponse({
        visit: {
          id: visit.id,
          status: visit.status,
          scheduledAt: visit.scheduledAt,
          notes: visit.notes,
          createdAt: visit.createdAt,
          house: visit.house,
          buyer: visit.buyer,
        },
      })
  } catch (error) {
    console.error('Create visit error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to create visit')
  }
}
