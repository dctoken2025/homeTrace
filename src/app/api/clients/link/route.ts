import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, ErrorCode, Errors } from '@/lib/api-response'
import { getSessionUser } from '@/lib/auth-session'
import { z } from 'zod'

const linkClientSchema = z.object({
  email: z.string().email('Invalid email address'),
})

/**
 * POST /api/clients/link
 * Link an existing buyer to the current realtor by email
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    if (session.role !== 'REALTOR' && session.role !== 'ADMIN') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only realtors can link clients')
    }

    const body = await request.json()
    const validation = linkClientSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.flatten().fieldErrors
      )
    }

    const { email } = validation.data

    // Find the buyer by email
    const buyer = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        role: 'BUYER',
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
      },
    })

    if (!buyer) {
      return errorResponse(
        ErrorCode.NOT_FOUND,
        'No client found with this email. Would you like to send an invite instead?'
      )
    }

    // Check if already connected
    const existingConnection = await prisma.buyerRealtor.findFirst({
      where: {
        buyerId: buyer.id,
        realtorId: session.userId,
        deletedAt: null,
      },
    })

    if (existingConnection) {
      return errorResponse(
        ErrorCode.CONFLICT,
        'This client is already connected to you'
      )
    }

    // Create the connection
    const connection = await prisma.buyerRealtor.create({
      data: {
        buyerId: buyer.id,
        realtorId: session.userId,
        invitedById: session.userId,
        connectedAt: new Date(),
      },
    })

    return successResponse({
      connection: {
        id: connection.id,
        connectedAt: connection.connectedAt,
      },
      buyer,
    })
  } catch (error) {
    console.error('Link client error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to link client')
  }
}
