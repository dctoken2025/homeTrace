import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, ErrorCode, Errors } from '@/lib/api-response'
import { getSessionUser } from '@/lib/auth-session'
import { extractProfileFromChat, DreamHousePreferences } from '@/lib/ai'
import { Prisma } from '@prisma/client'

/**
 * GET /api/dream-house-profile
 * Get the current user's dream house profile
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    // Only buyers can have dream house profiles
    if (session.role !== 'BUYER' && session.role !== 'ADMIN') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only buyers can have dream house profiles')
    }

    const profile = await prisma.dreamHouseProfile.findUnique({
      where: { buyerId: session.userId },
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
 * Create or update dream house profile
 * Supports both wizard mode (with profile data) and chat mode (with markComplete)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    // Only buyers can create dream house profiles
    if (session.role !== 'BUYER' && session.role !== 'ADMIN') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only buyers can create dream house profiles')
    }

    const body = await request.json()
    const { markComplete, profile: newProfileData } = body

    // Get existing profile
    const existingProfile = await prisma.dreamHouseProfile.findUnique({
      where: { buyerId: session.userId },
    })

    let profileData: DreamHousePreferences | Record<string, unknown> | null = null

    // If profile data is provided directly (from wizard), use it
    if (newProfileData) {
      profileData = newProfileData
    }
    // If marking as complete via chat, extract from chat history
    else if (markComplete && existingProfile?.trainingChats && existingProfile.trainingChats.length > 0) {
      try {
        // Flatten all chat sessions into one history
        const allMessages = existingProfile.trainingChats.flatMap(
          (chatSession: unknown) => (chatSession as { messages?: unknown[] }).messages || []
        )

        if (allMessages.length > 0) {
          profileData = await extractProfileFromChat(allMessages as { role: 'user' | 'assistant', content: string }[])
        }
      } catch (err) {
        console.error('Failed to extract profile:', err)
        // Continue without extracted profile
      }
    }
    // Otherwise use existing profile data
    else if (existingProfile) {
      profileData = existingProfile.profile as DreamHousePreferences | null
    }

    // Upsert profile (create if not exists, update if exists)
    const updated = await prisma.dreamHouseProfile.upsert({
      where: { buyerId: session.userId },
      update: {
        profile: profileData ? (profileData as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        isComplete: markComplete || existingProfile?.isComplete || false,
        lastUpdatedAt: new Date(),
      },
      create: {
        buyerId: session.userId,
        profile: profileData ? (profileData as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        trainingChats: [],
        isComplete: markComplete || false,
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
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    // Only buyers can delete their profiles
    if (session.role !== 'BUYER' && session.role !== 'ADMIN') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only buyers can reset their dream house profiles')
    }

    const existingProfile = await prisma.dreamHouseProfile.findUnique({
      where: { buyerId: session.userId },
    })

    if (!existingProfile) {
      return successResponse({ message: 'No profile to reset' })
    }

    // Reset profile instead of deleting
    await prisma.dreamHouseProfile.update({
      where: { buyerId: session.userId },
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
