import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, ErrorCode, Errors } from '@/lib/api-response'
import { getSessionUser } from '@/lib/auth-session'

/**
 * GET /api/visits/compare
 * Get completed visits with recordings for comparison
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    // Get IDs of houses to compare from query params
    const houseIds = request.nextUrl.searchParams.get('houseIds')?.split(',').filter(Boolean)

    // Build where clause
    const where: any = {
      buyerId: session.userId,
      deletedAt: null,
      status: { in: ['COMPLETED', 'IN_PROGRESS'] },
    }

    // If specific house IDs are provided, filter by them
    if (houseIds && houseIds.length > 0) {
      where.houseId = { in: houseIds }
    }

    // Get visits with recordings and house data
    const visits = await prisma.visit.findMany({
      where,
      include: {
        house: {
          select: {
            id: true,
            externalId: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            price: true,
            bedrooms: true,
            bathrooms: true,
            sqft: true,
            yearBuilt: true,
            propertyType: true,
            images: true,
            features: true,
          },
        },
        recordings: {
          where: { deletedAt: null },
          select: {
            id: true,
            roomId: true,
            roomName: true,
            audioUrl: true,
            audioDuration: true,
            status: true,
            transcript: true,
            sentiment: true,
            keyPoints: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { completedAt: 'desc' },
    })

    // Get list of houses that have been visited (for selection)
    const visitedHouseIds = new Set(visits.map((v) => v.houseId))

    // Get all houses the buyer has that have visits
    const houseBuyers = await prisma.houseBuyer.findMany({
      where: {
        buyerId: session.userId,
        deletedAt: null,
        houseId: { in: Array.from(visitedHouseIds) },
      },
      include: {
        house: {
          select: {
            id: true,
            address: true,
            city: true,
            state: true,
            price: true,
            bedrooms: true,
            bathrooms: true,
            sqft: true,
            images: true,
          },
        },
      },
    })

    // Transform to response format
    const visitedHouses = houseBuyers.map((hb) => ({
      id: hb.house.id,
      address: hb.house.address,
      city: hb.house.city,
      state: hb.house.state,
      price: hb.house.price,
      bedrooms: hb.house.bedrooms,
      bathrooms: hb.house.bathrooms,
      sqft: hb.house.sqft,
      images: hb.house.images,
      isFavorite: hb.isFavorite,
    }))

    const visitsData = visits.map((v) => ({
      id: v.id,
      houseId: v.houseId,
      visitedAt: v.startedAt || v.scheduledAt,
      completedAt: v.completedAt,
      overallImpression: v.overallImpression,
      wouldBuy: v.wouldBuy,
      notes: v.notes,
      house: v.house,
      recordings: v.recordings.map((r) => ({
        id: r.id,
        roomId: r.roomId,
        roomName: r.roomName,
        audioUrl: r.audioUrl,
        duration: r.audioDuration,
        status: r.status,
        transcript: r.transcript,
        sentiment: r.sentiment,
        keyPoints: r.keyPoints,
        recordedAt: r.createdAt,
      })),
    }))

    return successResponse({
        visitedHouses,
        visits: visitsData,
      })
  } catch (error) {
    console.error('Get compare visits error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to get visits for comparison')
  }
}
