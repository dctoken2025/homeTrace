import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, ErrorCode, Errors } from '@/lib/api-response'
import { getSessionUser } from '@/lib/auth-session'
import { z } from 'zod'

// Schema for updating profile
const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).nullable().optional(),
  timezone: z.string().max(50).optional(),
  avatarUrl: z.string().url().nullable().optional(),
})

/**
 * GET /api/settings
 * Get current user's profile and settings
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    const userData = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        timezone: true,
        avatarUrl: true,
        hasCompletedOnboarding: true,
        createdAt: true,
      },
    })

    if (!userData) {
      return errorResponse(ErrorCode.NOT_FOUND, 'User not found')
    }

    // Get privacy settings for buyers
    let privacySettings = null
    if (userData.role === 'BUYER') {
      privacySettings = await prisma.privacySettings.findUnique({
        where: { buyerId: session.userId },
      })

      // Create default privacy settings if not exists
      if (!privacySettings) {
        privacySettings = await prisma.privacySettings.create({
          data: { buyerId: session.userId },
        })
      }
    }

    // Get stats based on role
    let stats = {}
    if (userData.role === 'BUYER') {
      const [housesCount, visitsCount, realtorsCount] = await Promise.all([
        prisma.houseBuyer.count({
          where: { buyerId: session.userId, deletedAt: null },
        }),
        prisma.visit.count({
          where: { buyerId: session.userId, deletedAt: null },
        }),
        prisma.buyerRealtor.count({
          where: { buyerId: session.userId, deletedAt: null },
        }),
      ])
      stats = { housesCount, visitsCount, realtorsCount }
    } else if (userData.role === 'REALTOR') {
      const [clientsCount, toursCount, invitesPendingCount] = await Promise.all([
        prisma.buyerRealtor.count({
          where: { realtorId: session.userId, deletedAt: null },
        }),
        prisma.tour.count({
          where: { realtorId: session.userId, deletedAt: null },
        }),
        prisma.invite.count({
          where: { realtorId: session.userId, status: 'PENDING' },
        }),
      ])
      stats = { clientsCount, toursCount, invitesPendingCount }
    }

    return successResponse({
        user: userData,
        privacySettings: privacySettings
          ? {
              shareReportWithRealtor: privacySettings.shareReportWithRealtor,
              shareDreamHouseProfile: privacySettings.shareDreamHouseProfile,
              shareRecordings: privacySettings.shareRecordings,
            }
          : null,
        stats,
      })
  } catch (error) {
    console.error('Get settings error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to get settings')
  }
}

/**
 * PATCH /api/settings
 * Update current user's profile
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    const body = await request.json()
    const validation = updateProfileSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid request body',
          validation.error.flatten().fieldErrors
        )
    }

    const { name, phone, timezone, avatarUrl } = validation.data

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(timezone !== undefined && { timezone }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        timezone: true,
        avatarUrl: true,
      },
    })

    return successResponse({
        message: 'Profile updated',
        user: updatedUser,
      })
  } catch (error) {
    console.error('Update settings error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to update settings')
  }
}
