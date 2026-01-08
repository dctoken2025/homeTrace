import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, ErrorCode, Errors } from '@/lib/api-response'
import { getSessionUser } from '@/lib/auth-session'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * POST /api/visits/[id]/start
 * Start a visit (transition from SCHEDULED to IN_PROGRESS)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    const { id } = await params

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
            images: true,
          },
        },
      },
    })

    if (!visit || visit.deletedAt) {
      return errorResponse(ErrorCode.VISIT_NOT_FOUND, 'Visit not found')
    }

    // Only the buyer who owns the visit can start it
    if (session.role !== 'ADMIN' && visit.buyerId !== session.userId) {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only the visit owner can start it')
    }

    // Validate state transition
    if (visit.status !== 'SCHEDULED') {
      const errorMessages: Record<string, string> = {
        'IN_PROGRESS': 'Visit is already in progress',
        'COMPLETED': 'Visit has already been completed',
        'CANCELLED': 'Cannot start a cancelled visit',
      }

      return errorResponse(
          ErrorCode.INVALID_STATE_TRANSITION,
          errorMessages[visit.status] || 'Invalid visit state'
        )
    }

    // Start the visit
    const updated = await prisma.visit.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
      include: {
        house: {
          select: {
            id: true,
            address: true,
            city: true,
            state: true,
            images: true,
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return successResponse({
        message: 'Visit started',
        visit: {
          id: updated.id,
          status: updated.status,
          scheduledAt: updated.scheduledAt,
          startedAt: updated.startedAt,
          house: updated.house,
          buyer: updated.buyer,
        },
      })
  } catch (error) {
    console.error('Start visit error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to start visit')
  }
}
