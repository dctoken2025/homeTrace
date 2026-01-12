import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  successResponse,
  errorResponse,
  ErrorCode,
  Errors,
} from '@/lib/api-response'
import { getSessionUser } from '@/lib/auth-session'
import { sendSuggestionResponseEmail } from '@/lib/email'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * Check if a suggestion has expired (24h before suggested date)
 */
function isExpired(suggestedAt: Date): boolean {
  const expiresAt = new Date(suggestedAt.getTime() - 24 * 60 * 60 * 1000)
  return new Date() >= expiresAt
}

/**
 * POST /api/visits/suggestions/[id]/accept
 * Accept a visit suggestion (Buyer only)
 * Creates a new Visit with the suggested date/time
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    // Only buyers can accept suggestions
    if (session.role !== 'BUYER' && session.role !== 'ADMIN') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only buyers can accept visit suggestions')
    }

    const { id } = await params

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

    // Check if expired
    if (isExpired(suggestion.suggestedAt)) {
      // Mark as expired
      await prisma.visitSuggestion.update({
        where: { id },
        data: { status: 'EXPIRED' },
      })
      return errorResponse(
        ErrorCode.CONFLICT,
        'This suggestion has expired (less than 24 hours before the suggested time)'
      )
    }

    // Check if buyer has the house in their list
    const houseBuyer = await prisma.houseBuyer.findFirst({
      where: {
        houseId: suggestion.houseId,
        buyerId: suggestion.buyerId,
        deletedAt: null,
      },
    })

    if (!houseBuyer) {
      return errorResponse(
        ErrorCode.NOT_FOUND,
        'House not found in your list. The house may have been removed.'
      )
    }

    // Create the visit and update suggestion in a transaction
    const [visit] = await prisma.$transaction([
      prisma.visit.create({
        data: {
          houseId: suggestion.houseId,
          buyerId: suggestion.buyerId,
          scheduledAt: suggestion.suggestedAt,
          status: 'SCHEDULED',
        },
        include: {
          house: {
            select: {
              id: true,
              address: true,
              city: true,
              state: true,
              zipCode: true,
              price: true,
              images: true,
            },
          },
          buyer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.visitSuggestion.update({
        where: { id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
      }),
    ])

    // Update resultingVisitId after transaction (to avoid circular dependency)
    await prisma.visitSuggestion.update({
      where: { id },
      data: { resultingVisitId: visit.id },
    })

    // Send email notification to realtor
    try {
      await sendSuggestionResponseEmail({
        realtorEmail: suggestion.suggestedByRealtor.email,
        realtorName: suggestion.suggestedByRealtor.name || 'there',
        buyerName: suggestion.buyer.name || 'Your client',
        houseAddress: `${suggestion.house.address}, ${suggestion.house.city}, ${suggestion.house.state}`,
        suggestedAt: suggestion.suggestedAt,
        accepted: true,
      })
    } catch (emailError) {
      console.error('Failed to send response email:', emailError)
      // Don't fail the request if email fails
    }

    return successResponse({
      message: 'Visit suggestion accepted! Visit has been scheduled.',
      visit: {
        id: visit.id,
        status: visit.status,
        scheduledAt: visit.scheduledAt,
        house: visit.house,
        buyer: visit.buyer,
      },
    })
  } catch (error) {
    console.error('Accept visit suggestion error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to accept visit suggestion')
  }
}
