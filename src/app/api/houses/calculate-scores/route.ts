import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api-response'
import { getRequestUser } from '@/lib/auth'
import { calculateBulkMatchScores, HouseData } from '@/lib/ai-match'
import { DreamHousePreferences } from '@/lib/ai'

/**
 * POST /api/houses/calculate-scores
 * Calculate match scores for all buyer's houses
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    // Only buyers can calculate match scores
    if (user.role !== 'BUYER' && user.role !== 'ADMIN') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only buyers can calculate match scores')
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

    // Get all houses for this buyer
    const houseBuyers = await prisma.houseBuyer.findMany({
      where: {
        buyerId: user.userId,
        deletedAt: null,
      },
      include: {
        house: true,
      },
    })

    if (houseBuyers.length === 0) {
      return successResponse({
          message: 'No houses to score',
          scores: [],
        })
    }

    // Prepare house data
    const housesData: HouseData[] = houseBuyers
      .filter((hb) => hb.house && !hb.house.deletedAt)
      .map((hb) => ({
        id: hb.house.id,
        address: hb.house.address,
        city: hb.house.city,
        state: hb.house.state,
        price: hb.house.price,
        bedrooms: hb.house.bedrooms,
        bathrooms: hb.house.bathrooms,
        sqft: hb.house.sqft,
        yearBuilt: hb.house.yearBuilt,
        propertyType: hb.house.propertyType,
        features: hb.house.features,
        description: hb.house.description,
      }))

    // Calculate scores
    const scores = await calculateBulkMatchScores(housesData, preferences)

    // Update all HouseBuyer records with scores
    const updatePromises = Array.from(scores.entries()).map(([houseId, result]) =>
      prisma.houseBuyer.update({
        where: {
          houseId_buyerId: {
            houseId,
            buyerId: user.userId,
          },
        },
        data: {
          matchScore: result.score,
        },
      })
    )

    await Promise.all(updatePromises)

    // Format response
    const scoreResults = Array.from(scores.entries()).map(([houseId, result]) => ({
      houseId,
      ...result,
    }))

    return successResponse({
        message: `Calculated scores for ${scoreResults.length} houses`,
        scores: scoreResults.sort((a, b) => b.score - a.score),
      })
  } catch (error) {
    console.error('Calculate bulk match scores error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to calculate match scores')
  }
}
