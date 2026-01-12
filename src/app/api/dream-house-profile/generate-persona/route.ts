import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  successResponse,
  errorResponse,
  ErrorCode,
  Errors,
} from '@/lib/api-response'
import { getSessionUser } from '@/lib/auth-session'
import { generateBuyerPersona } from '@/lib/ai'

/**
 * POST /api/dream-house-profile/generate-persona
 * Generate a buyer persona from the profile data
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    if (session.role !== 'BUYER') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only buyers can generate a dream house persona')
    }

    const body = await request.json()
    const { profile } = body

    if (!profile) {
      return errorResponse(ErrorCode.VALIDATION_ERROR, 'Profile data is required')
    }

    // Generate the buyer persona using AI
    const persona = await generateBuyerPersona(profile)

    // Save the profile and persona to the database
    const dreamHouseProfile = await prisma.dreamHouseProfile.upsert({
      where: { buyerId: session.userId },
      update: {
        profile: {
          ...profile,
          buyerPersona: persona,
        },
        isComplete: true,
        lastUpdatedAt: new Date(),
      },
      create: {
        buyerId: session.userId,
        profile: {
          ...profile,
          buyerPersona: persona,
        },
        isComplete: true,
        trainingChats: [],
      },
    })

    return successResponse({
      persona,
      profile: dreamHouseProfile.profile,
      isComplete: dreamHouseProfile.isComplete,
    })
  } catch (error) {
    console.error('Generate persona error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to generate buyer persona')
  }
}
