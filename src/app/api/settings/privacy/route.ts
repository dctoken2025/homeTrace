import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api-response'
import { getRequestUser } from '@/lib/auth'
import { z } from 'zod'

// Schema for updating privacy settings
const updatePrivacySchema = z.object({
  shareReportWithRealtor: z.boolean().optional(),
  shareDreamHouseProfile: z.boolean().optional(),
  shareRecordings: z.boolean().optional(),
})

/**
 * GET /api/settings/privacy
 * Get current user's privacy settings
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    // Only buyers have privacy settings
    if (user.role !== 'BUYER') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Privacy settings are only available for buyers')
    }

    let privacySettings = await prisma.privacySettings.findUnique({
      where: { buyerId: user.userId },
    })

    // Create default privacy settings if not exists
    if (!privacySettings) {
      privacySettings = await prisma.privacySettings.create({
        data: { buyerId: user.userId },
      })
    }

    return successResponse({
        shareReportWithRealtor: privacySettings.shareReportWithRealtor,
        shareDreamHouseProfile: privacySettings.shareDreamHouseProfile,
        shareRecordings: privacySettings.shareRecordings,
      })
  } catch (error) {
    console.error('Get privacy settings error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to get privacy settings')
  }
}

/**
 * PATCH /api/settings/privacy
 * Update current user's privacy settings
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    // Only buyers have privacy settings
    if (user.role !== 'BUYER') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Privacy settings are only available for buyers')
    }

    const body = await request.json()
    const validation = updatePrivacySchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid request body',
          validation.error.flatten().fieldErrors
        )
    }

    const { shareReportWithRealtor, shareDreamHouseProfile, shareRecordings } = validation.data

    // Upsert privacy settings
    const privacySettings = await prisma.privacySettings.upsert({
      where: { buyerId: user.userId },
      create: {
        buyerId: user.userId,
        shareReportWithRealtor: shareReportWithRealtor ?? false,
        shareDreamHouseProfile: shareDreamHouseProfile ?? false,
        shareRecordings: shareRecordings ?? false,
      },
      update: {
        ...(shareReportWithRealtor !== undefined && { shareReportWithRealtor }),
        ...(shareDreamHouseProfile !== undefined && { shareDreamHouseProfile }),
        ...(shareRecordings !== undefined && { shareRecordings }),
      },
    })

    return successResponse({
        message: 'Privacy settings updated',
        shareReportWithRealtor: privacySettings.shareReportWithRealtor,
        shareDreamHouseProfile: privacySettings.shareDreamHouseProfile,
        shareRecordings: privacySettings.shareRecordings,
      })
  } catch (error) {
    console.error('Update privacy settings error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to update privacy settings')
  }
}
