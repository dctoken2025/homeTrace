import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api-response'
import { getRequestUser } from '@/lib/auth'
import { calculateMatchScore, HouseData } from '@/lib/ai-match'
import { DreamHousePreferences } from '@/lib/ai'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * POST /api/houses/[id]/match-score
 * Calculate match score for a house based on buyer's dream house profile
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    // Only buyers can calculate match scores
    if (user.role !== 'BUYER' && user.role !== 'ADMIN') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only buyers can calculate match scores')
    }

    const { id: houseId } = await params

    // Get house data
    const house = await prisma.house.findUnique({
      where: { id: houseId },
    })

    if (!house || house.deletedAt) {
      return errorResponse(ErrorCode.NOT_FOUND, 'House not found')
    }

    // Get buyer's dream house profile
    const profile = await prisma.dreamHouseProfile.findUnique({
      where: { buyerId: user.userId },
    })

    if (!profile || !profile.profile) {
      return errorResponse(
          ErrorCode.NOT_FOUND,
          'Dream house profile not found. Please complete your preferences first.'
        )
    }

    const preferences = profile.profile as unknown as DreamHousePreferences

    // Prepare house data for matching
    const houseData: HouseData = {
      id: house.id,
      address: house.address,
      city: house.city,
      state: house.state,
      price: house.price,
      bedrooms: house.bedrooms,
      bathrooms: house.bathrooms,
      sqft: house.sqft,
      yearBuilt: house.yearBuilt,
      propertyType: house.propertyType,
      features: house.features,
      description: house.description,
    }

    // Calculate match score
    const matchResult = await calculateMatchScore(houseData, preferences)

    // Update the HouseBuyer record with the score
    await prisma.houseBuyer.upsert({
      where: {
        houseId_buyerId: {
          houseId,
          buyerId: user.userId,
        },
      },
      create: {
        houseId,
        buyerId: user.userId,
        matchScore: matchResult.score,
      },
      update: {
        matchScore: matchResult.score,
      },
    })

    return successResponse({
        houseId,
        ...matchResult,
      })
  } catch (error) {
    console.error('Calculate match score error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to calculate match score')
  }
}

/**
 * GET /api/houses/[id]/match-score
 * Get cached match score for a house
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    const { id: houseId } = await params

    // Get the HouseBuyer record with match score
    const houseBuyer = await prisma.houseBuyer.findUnique({
      where: {
        houseId_buyerId: {
          houseId,
          buyerId: user.userId,
        },
      },
      select: {
        matchScore: true,
        updatedAt: true,
      },
    })

    if (!houseBuyer || houseBuyer.matchScore === null) {
      return successResponse({
          houseId,
          score: null,
          message: 'Match score not yet calculated',
        })
    }

    return successResponse({
        houseId,
        score: houseBuyer.matchScore,
        calculatedAt: houseBuyer.updatedAt,
      })
  } catch (error) {
    console.error('Get match score error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to get match score')
  }
}
