import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api-response'
import { getRequestUser } from '@/lib/auth'
import { z } from 'zod'

// Schema for accepting an invite
const acceptInviteSchema = z.object({
  token: z.string().min(1),
})

/**
 * GET /api/invites/accept?token=xxx
 * Get invite details by token (for public viewing before accepting)
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')

    if (!token) {
      return errorResponse(ErrorCode.VALIDATION_ERROR, 'Token is required')
    }

    const invite = await prisma.invite.findUnique({
      where: { token },
      include: {
        realtor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    })

    if (!invite) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Invite not found or invalid token')
    }

    // Check if expired
    const now = new Date()
    if (invite.status === 'PENDING' && invite.expiresAt < now) {
      await prisma.invite.update({
        where: { id: invite.id },
        data: { status: 'EXPIRED' },
      })

      return errorResponse(ErrorCode.INVALID_STATE_TRANSITION, 'This invite has expired')
    }

    if (invite.status !== 'PENDING') {
      return errorResponse(
          ErrorCode.INVALID_STATE_TRANSITION,
          `This invite has already been ${invite.status.toLowerCase()}`
        )
    }

    return successResponse({
        email: invite.email,
        name: invite.name,
        expiresAt: invite.expiresAt,
        realtor: invite.realtor,
      })
  } catch (error) {
    console.error('Get invite by token error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to get invite')
  }
}

/**
 * POST /api/invites/accept
 * Accept an invite and create buyer-realtor connection
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required. Please sign up or log in first.')
    }

    // Only buyers can accept invites
    if (user.role !== 'BUYER') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only buyers can accept realtor invites')
    }

    const body = await request.json()
    const validation = acceptInviteSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid request body',
          validation.error.flatten().fieldErrors
        )
    }

    const { token } = validation.data

    // Get invite
    const invite = await prisma.invite.findUnique({
      where: { token },
      include: {
        realtor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!invite) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Invite not found or invalid token')
    }

    // Check if expired
    const now = new Date()
    if (invite.expiresAt < now) {
      await prisma.invite.update({
        where: { id: invite.id },
        data: { status: 'EXPIRED' },
      })

      return errorResponse(ErrorCode.INVALID_STATE_TRANSITION, 'This invite has expired')
    }

    // Check status
    if (invite.status !== 'PENDING') {
      return errorResponse(
          ErrorCode.INVALID_STATE_TRANSITION,
          `This invite has already been ${invite.status.toLowerCase()}`
        )
    }

    // Check if already connected
    const existingConnection = await prisma.buyerRealtor.findFirst({
      where: {
        buyerId: user.userId,
        realtorId: invite.realtorId,
        deletedAt: null,
      },
    })

    if (existingConnection) {
      // Mark invite as accepted anyway
      await prisma.invite.update({
        where: { id: invite.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: now,
        },
      })

      return successResponse({
          message: 'You are already connected with this realtor',
          alreadyConnected: true,
          realtor: invite.realtor,
        })
    }

    // Create connection and update invite in a transaction
    const [connection] = await prisma.$transaction([
      prisma.buyerRealtor.create({
        data: {
          buyerId: user.userId,
          realtorId: invite.realtorId,
          invitedById: invite.realtorId,
        },
      }),
      prisma.invite.update({
        where: { id: invite.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: now,
        },
      }),
    ])

    return successResponse({
        message: 'Invite accepted! You are now connected with this realtor.',
        connection: {
          id: connection.id,
          connectedAt: connection.connectedAt,
        },
        realtor: invite.realtor,
      })
  } catch (error) {
    console.error('Accept invite error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to accept invite')
  }
}
