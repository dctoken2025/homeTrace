import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, ErrorCode, Errors } from '@/lib/api-response'
import { getSessionUser } from '@/lib/auth-session'
import { z } from 'zod'
import { OverallImpression } from '@prisma/client'
import { calculateMatchScore } from '@/lib/ai-match'
import { DreamHousePreferences } from '@/lib/ai'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// Schema for completing a visit
const completeVisitSchema = z.object({
  overallImpression: z.enum(['LOVED', 'LIKED', 'NEUTRAL', 'DISLIKED']),
  wouldBuy: z.boolean().optional(),
  notes: z.string().optional(),
})

/**
 * POST /api/visits/[id]/complete
 * Complete a visit (transition from IN_PROGRESS to COMPLETED)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    const { id } = await params

    // Parse and validate body
    const body = await request.json()
    const validation = completeVisitSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid request body',
          validation.error.flatten().fieldErrors
        )
    }

    const { overallImpression, wouldBuy, notes } = validation.data

    // Get the visit
    const visit = await prisma.visit.findUnique({
      where: { id },
      include: {
        house: {
          select: {
            id: true,
            address: true,
            city: true,
            state: true,
          },
        },
        _count: {
          select: {
            recordings: true,
          },
        },
      },
    })

    if (!visit || visit.deletedAt) {
      return errorResponse(ErrorCode.VISIT_NOT_FOUND, 'Visit not found')
    }

    // Only the buyer who owns the visit can complete it
    if (session.role !== 'ADMIN' && visit.buyerId !== session.userId) {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only the visit owner can complete it')
    }

    // Validate state transition - semi-flexible state machine
    // Allow completing from both SCHEDULED (quick visit) and IN_PROGRESS
    if (visit.status !== 'IN_PROGRESS' && visit.status !== 'SCHEDULED') {
      const errorMessages: Record<string, string> = {
        'COMPLETED': 'Visit has already been completed',
        'CANCELLED': 'Cannot complete a cancelled visit',
      }

      return errorResponse(
          ErrorCode.INVALID_STATE_TRANSITION,
          errorMessages[visit.status] || 'Invalid visit state'
        )
    }

    // Complete the visit
    const now = new Date()
    const updated = await prisma.visit.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        // If visit wasn't started yet, set startedAt to now
        startedAt: visit.startedAt || now,
        completedAt: now,
        overallImpression: overallImpression as OverallImpression,
        wouldBuy,
        // Append notes if provided
        notes: notes
          ? visit.notes
            ? `${visit.notes}\n\n--- Completion Notes ---\n${notes}`
            : notes
          : visit.notes,
      },
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
          },
        },
        _count: {
          select: {
            recordings: true,
          },
        },
      },
    })

    // Calculate visit duration if we have both times
    let durationMinutes = null
    if (updated.startedAt && updated.completedAt) {
      durationMinutes = Math.round(
        (updated.completedAt.getTime() - updated.startedAt.getTime()) / 60000
      )
    }

    // Trigger match score calculation in the background
    triggerMatchScoreCalculation(updated.buyerId, updated.house.id).catch((err) => {
      console.error('Failed to calculate match score:', err)
    })

    return successResponse({
        message: 'Visit completed',
        visit: {
          id: updated.id,
          status: updated.status,
          scheduledAt: updated.scheduledAt,
          startedAt: updated.startedAt,
          completedAt: updated.completedAt,
          durationMinutes,
          overallImpression: updated.overallImpression,
          wouldBuy: updated.wouldBuy,
          notes: updated.notes,
          house: updated.house,
          buyer: updated.buyer,
          recordingCount: updated._count.recordings,
        },
      })
  } catch (error) {
    console.error('Complete visit error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to complete visit')
  }
}

/**
 * Trigger match score calculation for a house after visit completion
 * This runs asynchronously so it doesn't block the response
 */
async function triggerMatchScoreCalculation(buyerId: string, houseId: string): Promise<void> {
  try {
    // Get buyer's dream house profile
    const dreamHouseProfile = await prisma.dreamHouseProfile.findUnique({
      where: { buyerId },
    })

    if (!dreamHouseProfile?.profile) {
      console.log('No dream house profile found, skipping match score calculation')
      return
    }

    // Get house data
    const house = await prisma.house.findUnique({
      where: { id: houseId },
    })

    if (!house) {
      console.log('House not found, skipping match score calculation')
      return
    }

    // Prepare house data for AI
    const houseData = {
      id: house.id,
      address: house.address,
      city: house.city,
      state: house.state,
      price: house.price,
      bedrooms: house.bedrooms,
      bathrooms: house.bathrooms,
      sqft: house.sqft,
      yearBuilt: house.yearBuilt,
      propertyType: house.propertyType,
      features: house.features,
      description: house.description,
    }

    // Calculate match score using AI
    const preferences = dreamHouseProfile.profile as DreamHousePreferences
    const matchResult = await calculateMatchScore(houseData, preferences)

    // Update HouseBuyer with match score
    await prisma.houseBuyer.updateMany({
      where: {
        buyerId,
        houseId,
        deletedAt: null,
      },
      data: {
        matchScore: matchResult.score,
      },
    })

    console.log(`Match score calculated for house ${houseId}: ${matchResult.score}`)
  } catch (error) {
    console.error('Error calculating match score:', error)
    throw error
  }
}
