import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  successResponse,
  errorResponse,
  ErrorCode,
  Errors,
} from '@/lib/api-response'
import { getSessionUser } from '@/lib/auth-session'
import { z } from 'zod'
import { sendSuggestionResponseEmail } from '@/lib/email'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

const rejectSchema = z.object({
  reason: z.string().max(500).optional(),
})

/**
 * POST /api/visits/suggestions/[id]/reject
 * Reject a visit suggestion (Buyer only)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    // Only buyers can reject suggestions
    if (session.role !== 'BUYER' && session.role !== 'ADMIN') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only buyers can reject visit suggestions')
    }

    const { id } = await params

    // Parse body for optional reason
    let reason: string | undefined
    try {
      const body = await request.json()
      const validation = rejectSchema.safeParse(body)
      if (validation.success) {
        reason = validation.data.reason
      }
    } catch {
      // Body is optional, ignore parse errors
    }

    const suggestion = await prisma.visitSuggestion.findUnique({
      where: { id },
      include: {
        house: true,
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        suggestedByRealtor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!suggestion || suggestion.deletedAt) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Suggestion not found')
    }

    // Verify the buyer owns this suggestion
    if (session.role === 'BUYER' && suggestion.buyerId !== session.userId) {
      return errorResponse(ErrorCode.FORBIDDEN, 'This suggestion is not for you')
    }

    // Check if already processed
    if (suggestion.status !== 'PENDING') {
      return errorResponse(
        ErrorCode.CONFLICT,
        `This suggestion has already been ${suggestion.status.toLowerCase()}`
      )
    }

    // Update suggestion to rejected
    await prisma.visitSuggestion.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    })

    // Send email notification to realtor
    try {
      await sendSuggestionResponseEmail({
        realtorEmail: suggestion.suggestedByRealtor.email,
        realtorName: suggestion.suggestedByRealtor.name || 'there',
        buyerName: suggestion.buyer.name || 'Your client',
        houseAddress: `${suggestion.house.address}, ${suggestion.house.city}, ${suggestion.house.state}`,
        suggestedAt: suggestion.suggestedAt,
        accepted: false,
        rejectionReason: reason,
      })
    } catch (emailError) {
      console.error('Failed to send response email:', emailError)
      // Don't fail the request if email fails
    }

    return successResponse({
      message: 'Visit suggestion rejected',
      suggestion: {
        id: suggestion.id,
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: reason,
        house: {
          address: suggestion.house.address,
          city: suggestion.house.city,
          state: suggestion.house.state,
        },
      },
    })
  } catch (error) {
    console.error('Reject visit suggestion error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to reject visit suggestion')
  }
}
