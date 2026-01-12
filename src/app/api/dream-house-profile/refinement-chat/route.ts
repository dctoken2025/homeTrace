import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  successResponse,
  errorResponse,
  ErrorCode,
  Errors,
} from '@/lib/api-response'
import { getSessionUser } from '@/lib/auth-session'
import { generateRefinementQuestions, updatePersonaFromChat, ChatMessage } from '@/lib/ai'
import { BuyerPersona } from '@/lib/types/dream-house'

/**
 * POST /api/dream-house-profile/refinement-chat
 * Process refinement chat message and optionally update persona
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    if (session.role !== 'BUYER') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only buyers can refine their dream house profile')
    }

    const body = await request.json()
    const { profile, persona, messages, newInfo, isInitial } = body

    if (!profile || !persona) {
      return errorResponse(ErrorCode.VALIDATION_ERROR, 'Profile and persona are required')
    }

    // For initial request, just generate refinement questions
    if (isInitial) {
      const question = await generateRefinementQuestions(profile, [])
      return successResponse({
        message: question,
      })
    }

    // Generate response to user's message
    const chatMessages: ChatMessage[] = messages || []
    const response = await generateRefinementQuestions(profile, chatMessages)

    // Update persona based on new information
    let updatedPersona: BuyerPersona | null = null
    if (newInfo) {
      updatedPersona = await updatePersonaFromChat(persona, profile, newInfo)

      // Save updated persona to database
      if (updatedPersona) {
        await prisma.dreamHouseProfile.update({
          where: { buyerId: session.userId },
          data: {
            profile: {
              ...profile,
              buyerPersona: updatedPersona,
            },
            lastUpdatedAt: new Date(),
          },
        })
      }
    }

    return successResponse({
      message: response,
      updatedPersona,
    })
  } catch (error) {
    console.error('Refinement chat error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to process refinement chat')
  }
}
