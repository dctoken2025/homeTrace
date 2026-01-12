import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth-session'
import {
  paginatedResponse,
  errorResponse,
  ErrorCode,
  Errors,
  parsePaginationParams,
} from '@/lib/api-response'
import { Prisma } from '@prisma/client'

/**
 * GET /api/admin/houses
 * List all houses in the system (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    if (session.role !== 'ADMIN') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Admin access required')
    }

    const { page, limit, skip } = parsePaginationParams(request.nextUrl.searchParams)
    const searchParams = request.nextUrl.searchParams

    const search = searchParams.get('search')
    const city = searchParams.get('city')

    // Build where clause
    const where: Prisma.HouseWhereInput = {}

    if (search) {
      where.OR = [
        { address: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { state: { contains: search, mode: 'insensitive' } },
        { zipCode: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (city) {
      where.city = { contains: city, mode: 'insensitive' }
    }

    // Get total count
    const total = await prisma.house.count({ where })

    // Get houses with aggregated data
    const houses = await prisma.house.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        _count: {
          select: {
            houseBuyers: true,
          },
        },
      },
    })

    // Get visit counts for these houses
    const houseIds = houses.map((h) => h.id)
    const visitCounts = await prisma.visit.groupBy({
      by: ['houseId'],
      where: {
        houseId: { in: houseIds },
        deletedAt: null,
      },
      _count: {
        id: true,
      },
    })

    const visitCountMap = new Map(
      visitCounts.map((v) => [v.houseId, v._count.id])
    )

    // Transform response
    const items = houses.map((house) => ({
      id: house.id,
      externalId: house.externalId,
      address: house.address,
      city: house.city,
      state: house.state,
      zipCode: house.zipCode,
      price: house.price,
      bedrooms: house.bedrooms,
      bathrooms: house.bathrooms,
      sqft: house.sqft,
      propertyType: house.propertyType,
      listingStatus: house.listingStatus,
      images: house.images,
      createdAt: house.createdAt.toISOString(),
      deletedAt: house.deletedAt?.toISOString() || null,
      buyersCount: house._count.houseBuyers,
      visitsCount: visitCountMap.get(house.id) || 0,
    }))

    return paginatedResponse(items, page, limit, total)
  } catch (error) {
    console.error('Admin list houses error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to list houses')
  }
}
