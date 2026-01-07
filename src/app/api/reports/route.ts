import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, ErrorCode, paginatedResponse } from '@/lib/api-response'
import { getRequestUser } from '@/lib/auth'
import { generateReport, HouseData, VisitData, RecordingData, ReportContent } from '@/lib/ai-reports'
import { DreamHousePreferences } from '@/lib/ai'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

// Schema for creating a report
const createReportSchema = z.object({
  language: z.enum(['en', 'pt', 'es']).default('en'),
})

// Schema for query params
const querySchema = z.object({
  status: z.enum(['PENDING', 'GENERATING', 'COMPLETED', 'FAILED']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
})

/**
 * GET /api/reports
 * List reports for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    // Only buyers can view their reports
    if (user.role !== 'BUYER' && user.role !== 'ADMIN') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only buyers can view reports')
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

    const { status, page, limit } = queryValidation.data
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {
      buyerId: user.userId,
      deletedAt: null,
    }

    if (status) where.status = status

    const [reports, total] = await Promise.all([
      prisma.aIReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.aIReport.count({ where }),
    ])

    return paginatedResponse(
      reports.map((r) => ({
        id: r.id,
        status: r.status,
        language: r.language,
        housesAnalyzed: r.housesAnalyzed,
        recordingsAnalyzed: r.recordingsAnalyzed,
        recommendedHouseId: r.recommendedHouseId,
        generationStartedAt: r.generationStartedAt,
        generationCompletedAt: r.generationCompletedAt,
        errorMessage: r.errorMessage,
        createdAt: r.createdAt,
      })),
      page,
      limit,
      total
    )
  } catch (error) {
    console.error('List reports error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to list reports')
  }
}

/**
 * POST /api/reports
 * Generate a new AI report
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    // Only buyers can generate reports
    if (user.role !== 'BUYER' && user.role !== 'ADMIN') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only buyers can generate reports')
    }

    // Parse body
    const body = await request.json().catch(() => ({}))
    const validation = createReportSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid request body',
          validation.error.flatten().fieldErrors
        )
    }

    const { language } = validation.data

    // Check if there's already a report being generated
    const existingPending = await prisma.aIReport.findFirst({
      where: {
        buyerId: user.userId,
        status: { in: ['PENDING', 'GENERATING'] },
        deletedAt: null,
      },
    })

    if (existingPending) {
      return errorResponse(
          ErrorCode.REPORT_ALREADY_GENERATING,
          'A report is already being generated. Please wait for it to complete.'
        )
    }

    // Get buyer's houses
    const houseBuyers = await prisma.houseBuyer.findMany({
      where: {
        buyerId: user.userId,
        deletedAt: null,
      },
      include: {
        house: true,
      },
    })

    if (houseBuyers.length === 0) {
      return errorResponse(
          ErrorCode.MINIMUM_HOUSES_NOT_MET,
          'You need at least one house in your list to generate a report.'
        )
    }

    // Get visits with recordings
    const visits = await prisma.visit.findMany({
      where: {
        buyerId: user.userId,
        deletedAt: null,
      },
      include: {
        recordings: {
          where: { deletedAt: null },
        },
      },
    })

    // Get dream house profile
    const dreamProfile = await prisma.dreamHouseProfile.findUnique({
      where: { buyerId: user.userId },
    })

    // Create report record
    const report = await prisma.aIReport.create({
      data: {
        buyerId: user.userId,
        status: 'GENERATING',
        language,
        housesAnalyzed: houseBuyers.length,
        recordingsAnalyzed: visits.reduce((sum, v) => sum + v.recordings.length, 0),
        generationStartedAt: new Date(),
      },
    })

    // Prepare data for AI
    const houses: HouseData[] = houseBuyers.map((hb) => ({
      id: hb.house.id,
      address: hb.house.address,
      city: hb.house.city,
      state: hb.house.state,
      price: hb.house.price,
      bedrooms: hb.house.bedrooms,
      bathrooms: hb.house.bathrooms,
      sqft: hb.house.sqft,
      yearBuilt: hb.house.yearBuilt,
      propertyType: hb.house.propertyType,
      features: hb.house.features,
      description: hb.house.description,
    }))

    const visitData: VisitData[] = visits.map((v) => ({
      id: v.id,
      houseId: v.houseId,
      status: v.status,
      overallImpression: v.overallImpression,
      wouldBuy: v.wouldBuy,
      notes: v.notes,
      recordings: v.recordings.map((r) => ({
        id: r.id,
        roomId: r.roomId,
        roomName: r.roomName,
        transcript: r.transcript,
        sentiment: r.sentiment,
        keyPoints: r.keyPoints,
      })),
    }))

    const dreamHouseProfile = dreamProfile?.profile as DreamHousePreferences | null

    // Generate report (async - update record when done)
    try {
      const content = await generateReport({
        buyerId: user.userId,
        houses,
        visits: visitData,
        dreamHouseProfile,
        language,
      })

      // Find top pick
      const topRanking = content.rankings?.find((r) => r.rank === 1)

      // Update report with results
      await prisma.aIReport.update({
        where: { id: report.id },
        data: {
          status: 'COMPLETED',
          content: content as unknown as Prisma.InputJsonValue,
          ranking: content.rankings as unknown as Prisma.InputJsonValue,
          recommendedHouseId: content.topPick?.houseId || topRanking?.houseId || null,
          dealBreakers: content.dealBreakers as unknown as Prisma.InputJsonValue,
          insights: content.insights as unknown as Prisma.InputJsonValue,
          generationCompletedAt: new Date(),
        },
      })

      return successResponse({
          message: 'Report generated successfully',
          reportId: report.id,
          status: 'COMPLETED',
        })
    } catch (err) {
      console.error('Report generation failed:', err)

      // Update report with error
      await prisma.aIReport.update({
        where: { id: report.id },
        data: {
          status: 'FAILED',
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
          retryCount: { increment: 1 },
        },
      })

      return errorResponse(
          ErrorCode.EXTERNAL_API_ERROR,
          'Failed to generate report. Please try again.'
        )
    }
  } catch (error) {
    console.error('Create report error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to create report')
  }
}
