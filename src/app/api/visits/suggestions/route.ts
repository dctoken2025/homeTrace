import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  ErrorCode,
  parsePaginationParams,
  Errors,
} from '@/lib/api-response'
import { getSessionUser } from '@/lib/auth-session'
import { z } from 'zod'
import { Prisma, SuggestionStatus } from '@prisma/client'
import { sendVisitSuggestionEmail } from '@/lib/email'

// Schema for creating a suggestion
const createSuggestionSchema = z.object({
  houseBuyerId: z.string().cuid('Invalid houseBuyer ID'),
  suggestedAt: z.string().datetime('Invalid date format'),
  message: z.string().max(500).optional(),
})

// Schema for query params
const querySchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
})

/**
 * Check if a suggestion has expired (24h before suggested date)
 */
function isExpired(suggestedAt: Date): boolean {
  const expiresAt = new Date(suggestedAt.getTime() - 24 * 60 * 60 * 1000) // 24 hours before
  return new Date() >= expiresAt
}

/**
 * GET /api/visits/suggestions
 * List visit suggestions for the current user
 * - Buyers see suggestions received
 * - Realtors see suggestions sent
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    const { page, limit, skip } = parsePaginationParams(request.nextUrl.searchParams)
    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries())
    const queryValidation = querySchema.safeParse(searchParams)

    if (!queryValidation.success) {
      return errorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid query parameters',
        queryValidation.error.flatten().fieldErrors
      )
    }

    const filters = queryValidation.data

    // Build where clause based on role
    const where: Prisma.VisitSuggestionWhereInput = {
      deletedAt: null,
    }

    if (session.role === 'BUYER') {
      where.buyerId = session.userId
    } else if (session.role === 'REALTOR') {
      where.suggestedByRealtorId = session.userId
    }
    // Admins see all suggestions

    // Apply filters
    if (filters.status) {
      where.status = filters.status as SuggestionStatus
    }

    if (filters.from || filters.to) {
      where.suggestedAt = {
        ...(filters.from && { gte: new Date(filters.from) }),
        ...(filters.to && { lte: new Date(filters.to) }),
      }
    }

    // Get total count
    const total = await prisma.visitSuggestion.count({ where })

    // Get paginated results
    const suggestions = await prisma.visitSuggestion.findMany({
      where,
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
      orderBy: { suggestedAt: 'asc' },
      skip,
      take: limit,
    })

    // Transform response (auto-expire if needed)
    const items = suggestions.map((s) => {
      const expired = s.status === 'PENDING' && isExpired(s.suggestedAt)
      return {
        id: s.id,
        status: expired ? 'EXPIRED' : s.status,
        suggestedAt: s.suggestedAt,
        message: s.message,
        acceptedAt: s.acceptedAt,
        rejectedAt: s.rejectedAt,
        rejectionReason: s.rejectionReason,
        createdAt: s.createdAt,
        house: s.house,
        buyer: s.buyer,
        suggestedByRealtor: s.suggestedByRealtor,
        resultingVisit: s.resultingVisit,
        isExpired: expired,
      }
    })

    return paginatedResponse(items, total, page, limit)
  } catch (error) {
    console.error('List visit suggestions error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to list visit suggestions')
  }
}

/**
 * POST /api/visits/suggestions
 * Create a new visit suggestion (Realtor only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    // Only realtors can create suggestions
    if (session.role !== 'REALTOR' && session.role !== 'ADMIN') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only realtors can suggest visits')
    }

    // Parse and validate body
    const body = await request.json()
    const validation = createSuggestionSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request body',
        validation.error.flatten().fieldErrors
      )
    }

    const { houseBuyerId, suggestedAt, message } = validation.data
    const suggestedDate = new Date(suggestedAt)

    // Validate suggestedAt is not in the past
    if (suggestedDate < new Date()) {
      return errorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Suggested date cannot be in the past'
      )
    }

    // Get the HouseBuyer record
    const houseBuyer = await prisma.houseBuyer.findUnique({
      where: { id: houseBuyerId },
      include: {
        house: true,
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!houseBuyer || houseBuyer.deletedAt) {
      return errorResponse(ErrorCode.NOT_FOUND, 'House/Buyer record not found')
    }

    // Verify realtor is connected to this buyer
    if (session.role === 'REALTOR') {
      const connection = await prisma.buyerRealtor.findFirst({
        where: {
          realtorId: session.userId,
          buyerId: houseBuyer.buyerId,
          deletedAt: null,
        },
      })

      if (!connection) {
        return errorResponse(
          ErrorCode.FORBIDDEN,
          'You are not connected to this buyer'
        )
      }
    }

    // Check for duplicate pending suggestion
    const existingSuggestion = await prisma.visitSuggestion.findFirst({
      where: {
        houseId: houseBuyer.houseId,
        buyerId: houseBuyer.buyerId,
        status: 'PENDING',
        deletedAt: null,
      },
    })

    if (existingSuggestion) {
      return errorResponse(
        ErrorCode.CONFLICT,
        'There is already a pending suggestion for this house'
      )
    }

    // Get realtor info for email
    const realtor = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true, email: true },
    })

    // Create the suggestion
    const suggestion = await prisma.visitSuggestion.create({
      data: {
        houseId: houseBuyer.houseId,
        buyerId: houseBuyer.buyerId,
        suggestedByRealtorId: session.userId,
        suggestedAt: suggestedDate,
        message,
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
    })

    // Send email notification to buyer
    try {
      await sendVisitSuggestionEmail({
        buyerEmail: houseBuyer.buyer.email,
        buyerName: houseBuyer.buyer.name || 'there',
        realtorName: realtor?.name || 'Your realtor',
        houseAddress: `${houseBuyer.house.address}, ${houseBuyer.house.city}, ${houseBuyer.house.state}`,
        suggestedAt: suggestedDate,
        message: message || undefined,
      })
    } catch (emailError) {
      console.error('Failed to send suggestion email:', emailError)
      // Don't fail the request if email fails
    }

    return successResponse({
      suggestion: {
        id: suggestion.id,
        status: suggestion.status,
        suggestedAt: suggestion.suggestedAt,
        message: suggestion.message,
        createdAt: suggestion.createdAt,
        house: suggestion.house,
        buyer: suggestion.buyer,
      },
    })
  } catch (error) {
    console.error('Create visit suggestion error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to create visit suggestion')
  }
}
