import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  ErrorCode,
  Errors,
  parsePaginationParams,
  parseSortParams,
} from '@/lib/api-response'
import { getSessionUser } from '@/lib/auth-session'
import { realtyAPI, transformPropertyToHouse } from '@/lib/realty-api'
import { geocodeAddress } from '@/lib/geocoding'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

// Schema for property data passed from search results
const propertyDataSchema = z.object({
  propertyId: z.string().min(1),
  listingId: z.string().optional(),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zipCode: z.string().min(1),
  price: z.number(),
  bedrooms: z.number().nullable().optional(),
  bathrooms: z.number().nullable().optional(),
  sqft: z.number().nullable().optional(),
  yearBuilt: z.number().nullable().optional(),
  propertyType: z.string().nullable().optional(),
  status: z.string().optional(),
  image: z.string().nullable().optional(),
  // Coordinates from Realtor API (optional - will use geocoding as fallback)
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
})

// Schema for adding a house
const addHouseSchema = z.object({
  propertyId: z.string().min(1, 'Property ID is required'),
  buyerId: z.string().min(1).optional(), // Required for realtors adding for a buyer (CUID format)
  notes: z.string().optional(),
  // Optional property data from search - if provided, we don't need to call external API
  propertyData: propertyDataSchema.optional(),
})

// Schema for query params
const querySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['for_sale', 'sold', 'pending', 'off_market']).optional(),
  priceMin: z.coerce.number().optional(),
  priceMax: z.coerce.number().optional(),
  bedsMin: z.coerce.number().optional(),
  bathsMin: z.coerce.number().optional(),
  isFavorite: z.enum(['true', 'false']).optional(),
  sortBy: z.enum(['price', 'createdAt', 'beds', 'baths', 'sqft', 'status']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

/**
 * GET /api/houses
 * List houses for the current user (buyer or realtor)
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
    const baseWhere: Prisma.HouseBuyerWhereInput = {
      deletedAt: null, // Always filter soft-deleted records
    }

    if (session.role === 'BUYER') {
      // Buyers see their own houses
      baseWhere.buyerId = session.userId
    } else if (session.role === 'REALTOR') {
      // Realtors see houses of their connected buyers
      const connectedBuyers = await prisma.buyerRealtor.findMany({
        where: { realtorId: session.userId, deletedAt: null },
        select: { buyerId: true },
      })
      baseWhere.buyerId = { in: connectedBuyers.map((c) => c.buyerId) }
    } else if (session.role === 'ADMIN') {
      // Admins see all houses
    }

    // Apply filters
    const houseWhere: Prisma.HouseWhereInput = {}

    if (filters.search) {
      houseWhere.OR = [
        { address: { contains: filters.search, mode: 'insensitive' } },
        { city: { contains: filters.search, mode: 'insensitive' } },
        { state: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    if (filters.status) {
      houseWhere.listingStatus = filters.status
    }

    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      houseWhere.price = {
        ...(filters.priceMin !== undefined && { gte: filters.priceMin }),
        ...(filters.priceMax !== undefined && { lte: filters.priceMax }),
      }
    }

    if (filters.bedsMin !== undefined) {
      houseWhere.bedrooms = { gte: filters.bedsMin }
    }

    if (filters.bathsMin !== undefined) {
      houseWhere.bathrooms = { gte: filters.bathsMin }
    }

    const houseBuyerWhere: Prisma.HouseBuyerWhereInput = {
      ...baseWhere,
      house: Object.keys(houseWhere).length > 0 ? houseWhere : undefined,
    }

    if (filters.isFavorite !== undefined) {
      houseBuyerWhere.isFavorite = filters.isFavorite === 'true'
    }

    // Build order by
    let orderBy: Prisma.HouseBuyerOrderByWithRelationInput = { createdAt: 'desc' }

    if (filters.sortBy) {
      const sortOrder = (filters.sortOrder || 'desc') as 'asc' | 'desc'

      switch (filters.sortBy) {
        case 'price':
          orderBy = { house: { price: sortOrder } }
          break
        case 'beds':
          orderBy = { house: { bedrooms: sortOrder } }
          break
        case 'baths':
          orderBy = { house: { bathrooms: sortOrder } }
          break
        case 'sqft':
          orderBy = { house: { sqft: sortOrder } }
          break
        case 'status':
          orderBy = { house: { listingStatus: sortOrder } }
          break
        case 'createdAt':
        default:
          orderBy = { createdAt: sortOrder }
      }
    }

    // Get total count
    const total = await prisma.houseBuyer.count({ where: houseBuyerWhere })

    // Get paginated results
    const houseBuyers = await prisma.houseBuyer.findMany({
      where: houseBuyerWhere,
      include: {
        house: true,
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        addedByRealtor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy,
      skip,
      take: limit,
    })

    // Transform response
    const items = houseBuyers.map((hb) => ({
      id: hb.id,
      houseId: hb.houseId,
      isFavorite: hb.isFavorite,
      matchScore: hb.matchScore,
      notes: hb.notes,
      createdAt: hb.createdAt,
      house: {
        id: hb.house.id,
        externalId: hb.house.externalId,
        address: hb.house.address,
        city: hb.house.city,
        state: hb.house.state,
        zipCode: hb.house.zipCode,
        price: hb.house.price,
        bedrooms: hb.house.bedrooms,
        bathrooms: hb.house.bathrooms,
        sqft: hb.house.sqft,
        yearBuilt: hb.house.yearBuilt,
        propertyType: hb.house.propertyType,
        listingStatus: hb.house.listingStatus,
        images: hb.house.images,
        lastSyncedAt: hb.house.lastSyncedAt,
      },
      buyer: hb.buyer,
      addedByRealtor: hb.addedByRealtor,
    }))

    return paginatedResponse(items, page, limit, total)
  } catch (error) {
    console.error('List houses error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to list houses')
  }
}

/**
 * POST /api/houses
 * Add a house to the user's list
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    // Parse and validate body
    const body = await request.json()
    const validation = addHouseSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid request body',
          validation.error.flatten().fieldErrors
        )
    }

    const { propertyId, buyerId, notes, propertyData } = validation.data

    // Determine target buyer ID
    let targetBuyerId: string

    if (session.role === 'BUYER') {
      targetBuyerId = session.userId
    } else if (session.role === 'REALTOR' || session.role === 'ADMIN') {
      if (!buyerId) {
        return errorResponse(
            ErrorCode.VALIDATION_ERROR,
            'Buyer ID is required when adding as realtor'
          )
      }

      // Verify realtor is connected to this buyer
      if (session.role === 'REALTOR') {
        const connection = await prisma.buyerRealtor.findFirst({
          where: {
            realtorId: session.userId,
            buyerId,
          },
        })

        if (!connection) {
          return errorResponse(
              ErrorCode.FORBIDDEN,
              'You are not connected to this buyer'
            )
        }
      }

      targetBuyerId = buyerId
    } else {
      return errorResponse(ErrorCode.FORBIDDEN, 'You cannot add houses')
    }

    // Check if house already exists in database
    let house = await prisma.house.findFirst({
      where: { externalId: propertyId },
    })

    let needsDetailSync = false

    if (!house) {
      if (propertyData) {
        // Use coordinates from Realtor API if available, otherwise geocode
        let latitude = propertyData.latitude ?? null
        let longitude = propertyData.longitude ?? null

        // Only geocode if API didn't provide coordinates
        if (latitude === null || longitude === null || (latitude === 0 && longitude === 0)) {
          console.log(`House missing coordinates from API, attempting geocoding...`)
          const geocodeResult = await geocodeAddress(
            propertyData.address,
            propertyData.city,
            propertyData.state,
            propertyData.zipCode
          )

          if (geocodeResult) {
            latitude = geocodeResult.latitude
            longitude = geocodeResult.longitude
            console.log(`Geocoded via ${geocodeResult.source}: ${latitude}, ${longitude}`)
          } else {
            console.warn(`Could not geocode - route optimization will be unavailable`)
          }
        } else {
          console.log(`Using coordinates from Realtor API: ${latitude}, ${longitude}`)
        }

        // Create house with basic data from search results (fast)
        house = await prisma.house.create({
          data: {
            externalId: propertyData.propertyId,
            address: propertyData.address,
            city: propertyData.city,
            state: propertyData.state,
            zipCode: propertyData.zipCode,
            latitude,
            longitude,
            price: propertyData.price,
            bedrooms: propertyData.bedrooms ?? null,
            bathrooms: propertyData.bathrooms ?? null,
            sqft: propertyData.sqft ?? null,
            yearBuilt: propertyData.yearBuilt ?? null,
            propertyType: propertyData.propertyType ?? null,
            listingStatus: propertyData.status || 'for_sale',
            lastSyncedAt: new Date(),
            images: propertyData.image ? [propertyData.image] : [],
          },
        })

        needsDetailSync = true // Flag to sync rich data in background
      } else {
        // No search data provided - must fetch from API
        const propertyDetail = await realtyAPI.getPropertyDetail(propertyId)

        if (!propertyDetail) {
          return errorResponse(ErrorCode.NOT_FOUND, `Property not found (ID: ${propertyId})`)
        }

        const houseData = transformPropertyToHouse(propertyDetail)

        house = await prisma.house.create({
          data: {
            externalId: houseData.externalId,
            address: houseData.address,
            city: houseData.city,
            state: houseData.state,
            zipCode: houseData.zipCode,
            latitude: houseData.latitude,
            longitude: houseData.longitude,
            price: houseData.price,
            bedrooms: houseData.bedrooms,
            bathrooms: houseData.bathrooms,
            sqft: houseData.sqft,
            yearBuilt: houseData.yearBuilt,
            propertyType: houseData.propertyType,
            listingStatus: houseData.listingStatus,
            lastSyncedAt: houseData.lastSyncedAt,
            images: houseData.images,
            rawApiData: houseData.rawApiData as unknown as Prisma.InputJsonValue,
          },
        })
      }
    } else if (!house.rawApiData) {
      // House exists but doesn't have rich data yet
      needsDetailSync = true
    }

    // Background sync for rich property details (non-blocking)
    if (needsDetailSync && house && house.externalId) {
      const houseId = house.id
      const externalId = house.externalId

      // Fire and forget - don't await
      ;(async () => {
        try {
          const propertyDetail = await realtyAPI.getPropertyDetail(externalId)
          if (!propertyDetail) return

          const houseData = transformPropertyToHouse(propertyDetail)

          await prisma.house.update({
            where: { id: houseId },
            data: {
              latitude: houseData.latitude,
              longitude: houseData.longitude,
              images: houseData.images,
              rawApiData: houseData.rawApiData as unknown as Prisma.InputJsonValue,
              lastSyncedAt: new Date(),
            },
          })

          console.log(`Background sync completed for house ${houseId}`)
        } catch (err) {
          console.error(`Background sync failed for house ${houseId}:`, err)
        }
      })()
    }

    // Check if buyer already has this house
    const existingConnection = await prisma.houseBuyer.findFirst({
      where: {
        houseId: house.id,
        buyerId: targetBuyerId,
      },
    })

    if (existingConnection) {
      return errorResponse(
          ErrorCode.HOUSE_ALREADY_ADDED,
          'This house is already in your list',
          { existingId: existingConnection.id }
        )
    }

    // Create connection between house and buyer
    const houseBuyer = await prisma.houseBuyer.create({
      data: {
        houseId: house.id,
        buyerId: targetBuyerId,
        addedByRealtorId: session.role === 'REALTOR' ? session.userId : null,
        notes,
      },
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

    // If realtor added the house, notify the buyer (in a real app, send notification)
    // For now, just log it
    if (session.role === 'REALTOR') {
      console.log(
        `Realtor ${session.userId} added house ${house.id} for buyer ${targetBuyerId}`
      )
    }

    return successResponse({
        houseBuyer: {
          id: houseBuyer.id,
          house: houseBuyer.house,
          buyer: houseBuyer.buyer,
          isFavorite: houseBuyer.isFavorite,
          notes: houseBuyer.notes,
          createdAt: houseBuyer.createdAt,
        },
      })
  } catch (error) {
    console.error('Add house error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to add house')
  }
}
