import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, ErrorCode, paginatedResponse } from '@/lib/api-response'
import { getRequestUser } from '@/lib/auth'
import { z } from 'zod'
import { addDays } from 'date-fns'

// Schema for query params
const querySchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
})

// Schema for creating an invite
const createInviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional(),
  expiresInDays: z.number().min(1).max(30).default(7),
})

/**
 * GET /api/invites
 * List invites sent by the current realtor
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    // Only realtors can list their invites
    if (user.role !== 'REALTOR' && user.role !== 'ADMIN') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only realtors can view invites')
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries())
    const queryValidation = querySchema.safeParse(searchParams)

    if (!queryValidation.success) {
      return errorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid query parameters',
          queryValidation.error.flatten().fieldErrors
        )
    }

    const { status, page, limit } = queryValidation.data
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {
      realtorId: user.userId,
    }

    if (status) where.status = status

    const [invites, total] = await Promise.all([
      prisma.invite.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.invite.count({ where }),
    ])

    // Check for expired invites and update them
    const now = new Date()
    const expiredIds = invites
      .filter((inv) => inv.status === 'PENDING' && inv.expiresAt < now)
      .map((inv) => inv.id)

    if (expiredIds.length > 0) {
      await prisma.invite.updateMany({
        where: { id: { in: expiredIds } },
        data: { status: 'EXPIRED' },
      })
    }

    return paginatedResponse(
      invites.map((inv) => ({
        id: inv.id,
        email: inv.email,
        name: inv.name,
        phone: inv.phone,
        status: expiredIds.includes(inv.id) ? 'EXPIRED' : inv.status,
        expiresAt: inv.expiresAt,
        acceptedAt: inv.acceptedAt,
        rejectedAt: inv.rejectedAt,
        createdAt: inv.createdAt,
      })),
      page,
      limit,
      total
    )
  } catch (error) {
    console.error('List invites error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to list invites')
  }
}

/**
 * POST /api/invites
 * Create a new invite
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    // Only realtors can create invites
    if (user.role !== 'REALTOR' && user.role !== 'ADMIN') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only realtors can send invites')
    }

    const body = await request.json()
    const validation = createInviteSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid request body',
          validation.error.flatten().fieldErrors
        )
    }

    const { email, name, phone, expiresInDays } = validation.data

    // Check if there's already a pending invite for this email from this realtor
    const existingInvite = await prisma.invite.findFirst({
      where: {
        realtorId: user.userId,
        email,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    })

    if (existingInvite) {
      return errorResponse(
          ErrorCode.ALREADY_EXISTS,
          'A pending invite already exists for this email'
        )
    }

    // Check if user already exists and is connected
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      // Check if already connected
      const existingConnection = await prisma.buyerRealtor.findFirst({
        where: {
          buyerId: existingUser.id,
          realtorId: user.userId,
          deletedAt: null,
        },
      })

      if (existingConnection) {
        return errorResponse(
            ErrorCode.ALREADY_EXISTS,
            'You are already connected with this buyer'
          )
      }
    }

    // Create invite
    const invite = await prisma.invite.create({
      data: {
        realtorId: user.userId,
        email,
        name,
        phone,
        expiresAt: addDays(new Date(), expiresInDays),
      },
    })

    // TODO: Send email notification to the invitee
    // await sendInviteEmail(email, invite.token, name)

    return successResponse({
        message: 'Invite sent successfully',
        invite: {
          id: invite.id,
          email: invite.email,
          name: invite.name,
          token: invite.token, // Include token for testing/development
          expiresAt: invite.expiresAt,
          createdAt: invite.createdAt,
        },
      })
  } catch (error) {
    console.error('Create invite error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to create invite')
  }
}
