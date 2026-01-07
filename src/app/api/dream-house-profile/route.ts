import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api-response'
import { getRequestUser } from '@/lib/auth'
import { extractProfileFromChat, DreamHousePreferences } from '@/lib/ai'
import { Prisma } from '@prisma/client'

/**
 * GET /api/dream-house-profile
 * Get the current user's dream house profile
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    // Only buyers can have dream house profiles
    if (user.role !== 'BUYER' && user.role !== 'ADMIN') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only buyers can have dream house profiles')
    }

    const profile = await prisma.dreamHouseProfile.findUnique({
      where: { buyerId: user.userId },
    })

    if (!profile) {
      // Return empty profile if not created yet
      return successResponse({
          exists: false,
          profile: null,
          trainingChats: [],
          isComplete: false,
        })
    }

    return successResponse({
        exists: true,
        id: profile.id,
        profile: profile.profile as DreamHousePreferences | null,
        trainingChats: profile.trainingChats,
        isComplete: profile.isComplete,
        lastUpdatedAt: profile.lastUpdatedAt,
        createdAt: profile.createdAt,
      })
  } catch (error) {
    console.error('Get dream house profile error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to get dream house profile')
  }
}

/**
 * POST /api/dream-house-profile
 * Create or update dream house profile (mark as complete and extract preferences)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    // Only buyers can create dream house profiles
    if (user.role !== 'BUYER' && user.role !== 'ADMIN') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only buyers can create dream house profiles')
    }

    const body = await request.json()
    const { markComplete } = body

    // Get existing profile
    const existingProfile = await prisma.dreamHouseProfile.findUnique({
      where: { buyerId: user.userId },
    })

    if (!existingProfile) {
      return errorResponse(ErrorCode.NOT_FOUND, 'No profile found. Start a chat first.')
    }

    // If marking as complete, extract structured profile from chats
    let profileData: DreamHousePreferences | null = existingProfile.profile as DreamHousePreferences | null
    if (markComplete && existingProfile.trainingChats.length > 0) {
      try {
        // Flatten all chat sessions into one history
        const allMessages = existingProfile.trainingChats.flatMap(
          (session: any) => session.messages || []
        )

        if (allMessages.length > 0) {
          profileData = await extractProfileFromChat(allMessages)
        }
      } catch (err) {
        console.error('Failed to extract profile:', err)
        // Continue without extracted profile
      }
    }

    // Update profile
    const updated = await prisma.dreamHouseProfile.update({
      where: { buyerId: user.userId },
      data: {
        profile: profileData ? (profileData as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        isComplete: markComplete || existingProfile.isComplete,
        lastUpdatedAt: new Date(),
      },
    })

    return successResponse({
        message: markComplete ? 'Profile completed' : 'Profile updated',
        id: updated.id,
        profile: updated.profile as DreamHousePreferences | null,
        isComplete: updated.isComplete,
        lastUpdatedAt: updated.lastUpdatedAt,
      })
  } catch (error) {
    console.error('Update dream house profile error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to update dream house profile')
  }
}

/**
 * DELETE /api/dream-house-profile
 * Reset dream house profile (clear chats and preferences)
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    // Only buyers can delete their profiles
    if (user.role !== 'BUYER' && user.role !== 'ADMIN') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only buyers can reset their dream house profiles')
    }

    const existingProfile = await prisma.dreamHouseProfile.findUnique({
      where: { buyerId: user.userId },
    })

    if (!existingProfile) {
      return successResponse({ message: 'No profile to reset' })
    }

    // Reset profile instead of deleting
    await prisma.dreamHouseProfile.update({
      where: { buyerId: user.userId },
      data: {
        profile: Prisma.JsonNull,
        trainingChats: [],
        isComplete: false,
        lastUpdatedAt: new Date(),
      },
    })

    return successResponse({ message: 'Profile reset successfully' })
  } catch (error) {
    console.error('Reset dream house profile error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to reset dream house profile')
  }
}
