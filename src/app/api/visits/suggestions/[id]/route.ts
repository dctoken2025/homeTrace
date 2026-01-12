import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  successResponse,
  errorResponse,
  ErrorCode,
  Errors,
} from '@/lib/api-response'
import { getSessionUser } from '@/lib/auth-session'

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
 * GET /api/visits/suggestions/[id]
 * Get details of a specific visit suggestion
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    const { id } = await params

    const suggestion = await prisma.visitSuggestion.findUnique({
      where: { id },
      include: {
        house: {
          select: {
            id: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            price: true,
            bedrooms: true,
            bathrooms: true,
            sqft: true,
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
        suggestedByRealtor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        resultingVisit: {
          select: {
            id: true,
            status: true,
            scheduledAt: true,
          },
        },
      },
    })

    if (!suggestion || suggestion.deletedAt) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Suggestion not found')
    }

    // Check access permissions
    const hasAccess =
      session.role === 'ADMIN' ||
      suggestion.buyerId === session.userId ||
      suggestion.suggestedByRealtorId === session.userId

    if (!hasAccess) {
      return errorResponse(ErrorCode.FORBIDDEN, 'Access denied')
    }

    const expired = suggestion.status === 'PENDING' && isExpired(suggestion.suggestedAt)

    return successResponse({
      id: suggestion.id,
      status: expired ? 'EXPIRED' : suggestion.status,
      suggestedAt: suggestion.suggestedAt,
      message: suggestion.message,
      acceptedAt: suggestion.acceptedAt,
      rejectedAt: suggestion.rejectedAt,
      rejectionReason: suggestion.rejectionReason,
      createdAt: suggestion.createdAt,
      updatedAt: suggestion.updatedAt,
      house: suggestion.house,
      buyer: suggestion.buyer,
      suggestedByRealtor: suggestion.suggestedByRealtor,
      resultingVisit: suggestion.resultingVisit,
      isExpired: expired,
    })
  } catch (error) {
    console.error('Get visit suggestion error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to get visit suggestion')
  }
}

/**
 * DELETE /api/visits/suggestions/[id]
 * Cancel a visit suggestion (Realtor only - can only cancel their own suggestions)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    const { id } = await params

    const suggestion = await prisma.visitSuggestion.findUnique({
      where: { id },
      include: {
        house: {
          select: {
            address: true,
            city: true,
            state: true,
          },
        },
      },
    })

    if (!suggestion || suggestion.deletedAt) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Suggestion not found')
    }

    // Only the realtor who created or admin can delete
    const canDelete =
      session.role === 'ADMIN' ||
      suggestion.suggestedByRealtorId === session.userId

    if (!canDelete) {
      return errorResponse(
        ErrorCode.FORBIDDEN,
        'Only the realtor who created this suggestion can cancel it'
      )
    }

    // Can only delete pending suggestions
    if (suggestion.status !== 'PENDING') {
      return errorResponse(
        ErrorCode.CONFLICT,
        `Cannot cancel a suggestion that is already ${suggestion.status.toLowerCase()}`
      )
    }

    // Soft delete the suggestion
    await prisma.visitSuggestion.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    return successResponse({
      message: 'Visit suggestion cancelled',
      cancelledSuggestion: {
        id: suggestion.id,
        houseAddress: `${suggestion.house.address}, ${suggestion.house.city}, ${suggestion.house.state}`,
      },
    })
  } catch (error) {
    console.error('Delete visit suggestion error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to cancel visit suggestion')
  }
}
