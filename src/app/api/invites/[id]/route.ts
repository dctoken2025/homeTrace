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
 * GET /api/invites/[id]
 * Get a specific invite
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    const { id } = await params

    const invite = await prisma.invite.findUnique({
      where: { id },
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
      return errorResponse(ErrorCode.NOT_FOUND, 'Invite not found')
    }

    // Only the realtor who created the invite can view it
    if (session.role !== 'ADMIN' && invite.realtorId !== session.userId) {
      return errorResponse(ErrorCode.FORBIDDEN, 'Access denied')
    }

    // Check if expired
    const isExpired = invite.status === 'PENDING' && invite.expiresAt < new Date()
    if (isExpired) {
      await prisma.invite.update({
        where: { id },
        data: { status: 'EXPIRED' },
      })
    }

    return successResponse({
        id: invite.id,
        email: invite.email,
        name: invite.name,
        phone: invite.phone,
        status: isExpired ? 'EXPIRED' : invite.status,
        expiresAt: invite.expiresAt,
        acceptedAt: invite.acceptedAt,
        rejectedAt: invite.rejectedAt,
        createdAt: invite.createdAt,
        realtor: invite.realtor,
      })
  } catch (error) {
    console.error('Get invite error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to get invite')
  }
}

/**
 * DELETE /api/invites/[id]
 * Cancel/revoke an invite
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    const { id } = await params

    const invite = await prisma.invite.findUnique({
      where: { id },
    })

    if (!invite) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Invite not found')
    }

    // Only the realtor who created the invite can delete it
    if (session.role !== 'ADMIN' && invite.realtorId !== session.userId) {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only the invite creator can revoke it')
    }

    // Can only revoke pending invites
    if (invite.status !== 'PENDING') {
      return errorResponse(
          ErrorCode.INVALID_STATE_TRANSITION,
          `Cannot revoke an invite that is ${invite.status.toLowerCase()}`
        )
    }

    // Delete the invite
    await prisma.invite.delete({
      where: { id },
    })

    return successResponse({
        message: 'Invite revoked',
        id,
      })
  } catch (error) {
    console.error('Delete invite error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to revoke invite')
  }
}
