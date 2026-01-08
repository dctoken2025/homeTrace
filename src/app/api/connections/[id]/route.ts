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
 * GET /api/connections/[id]
 * Get a specific connection
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    const { id } = await params

    const connection = await prisma.buyerRealtor.findUnique({
      where: { id },
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
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

    if (!connection) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Connection not found')
    }

    // Check access
    if (
      session.role !== 'ADMIN' &&
      connection.buyerId !== session.userId &&
      connection.realtorId !== session.userId
    ) {
      return errorResponse(ErrorCode.FORBIDDEN, 'Access denied')
    }

    if (connection.deletedAt) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Connection has been removed')
    }

    return successResponse({
        id: connection.id,
        buyer: connection.buyer,
        realtor: connection.realtor,
        invitedById: connection.invitedById,
        connectedAt: connection.connectedAt,
      })
  } catch (error) {
    console.error('Get connection error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to get connection')
  }
}

/**
 * DELETE /api/connections/[id]
 * Remove a connection (soft delete)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    const { id } = await params

    const connection = await prisma.buyerRealtor.findUnique({
      where: { id },
    })

    if (!connection) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Connection not found')
    }

    // Check access - both buyer and realtor can remove the connection
    if (
      session.role !== 'ADMIN' &&
      connection.buyerId !== session.userId &&
      connection.realtorId !== session.userId
    ) {
      return errorResponse(ErrorCode.FORBIDDEN, 'Access denied')
    }

    if (connection.deletedAt) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Connection already removed')
    }

    // Soft delete the connection
    await prisma.buyerRealtor.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    return successResponse({
        message: 'Connection removed',
        id,
      })
  } catch (error) {
    console.error('Delete connection error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to remove connection')
  }
}
