import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api-response'
import { getRequestUser } from '@/lib/auth'

/**
 * GET /api/admin/users
 * List all users with pagination and filters
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user || user.role !== 'ADMIN') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Admin access required')
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const role = searchParams.get('role')
    const search = searchParams.get('search')
    const includeDeleted = searchParams.get('includeDeleted') === 'true'

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    if (!includeDeleted) {
      where.deletedAt = null
    }

    if (role) {
      where.role = role
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Get users with counts
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          hasCompletedOnboarding: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          _count: {
            select: {
              houseBuyers: true,
              visits: true,
              recordings: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    return successResponse({
      items: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        phone: u.phone,
        role: u.role,
        hasCompletedOnboarding: u.hasCompletedOnboarding,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
        deletedAt: u.deletedAt?.toISOString() || null,
        housesCount: u._count.houseBuyers,
        visitsCount: u._count.visits,
        recordingsCount: u._count.recordings,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Get admin users error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to get users')
  }
}
