import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/jwt'
import { successResponse, errorResponse, ErrorCode, Errors } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from token
    const authHeader = request.headers.get('authorization')
    const authUser = await getAuthUser(authHeader)

    if (!authUser) {
      return Errors.unauthorized()
    }

    // Fetch full user data
    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        timezone: true,
        hasCompletedOnboarding: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        // Include privacy settings for buyers
        privacySettings: {
          select: {
            shareReportWithRealtor: true,
            shareDreamHouseProfile: true,
            shareRecordings: true,
          },
        },
        // Include counts for dashboard
        _count: {
          select: {
            houseBuyers: true,
            visits: true,
            recordings: true,
            aiReports: true,
          },
        },
      },
    })

    if (!user) {
      return Errors.notFound('User')
    }

    return successResponse({ user })
  } catch (error) {
    console.error('Get user error:', error)
    return errorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch user data'
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Get authenticated user from token
    const authHeader = request.headers.get('authorization')
    const authUser = await getAuthUser(authHeader)

    if (!authUser) {
      return Errors.unauthorized()
    }

    const body = await request.json()

    // Only allow updating specific fields
    const allowedFields = ['name', 'phone', 'timezone', 'hasCompletedOnboarding']
    const updateData: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return errorResponse(
        ErrorCode.VALIDATION_ERROR,
        'No valid fields to update'
      )
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: authUser.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        timezone: true,
        hasCompletedOnboarding: true,
        avatarUrl: true,
        updatedAt: true,
      },
    })

    return successResponse({ user })
  } catch (error) {
    console.error('Update user error:', error)
    return errorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to update user data'
    )
  }
}
