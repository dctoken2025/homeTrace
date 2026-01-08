import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, ErrorCode, Errors } from '@/lib/api-response'
import { getSessionUser } from '@/lib/auth-session'
import { optimizeRoute, optimizeRouteFromStart, calculateImprovement, Location } from '@/lib/route-optimizer'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

const optimizeSchema = z.object({
  startFromHouseId: z.string().optional(),
  applyOptimization: z.boolean().default(false),
})

/**
 * POST /api/tours/[id]/optimize-route
 * Calculate the optimal route for a tour
 *
 * Body:
 * - startFromHouseId: Optional house ID to start the tour from
 * - applyOptimization: If true, updates the tour stops with the optimized order
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    const { id: tourId } = await params

    // Get the tour with all stops and house coordinates
    const tour = await prisma.tour.findUnique({
      where: { id: tourId },
      include: {
        stops: {
          where: { deletedAt: null },
          include: {
            house: {
              select: {
                id: true,
                address: true,
                city: true,
                state: true,
                latitude: true,
                longitude: true,
              },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    })

    if (!tour) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Tour not found')
    }

    // Check access
    if (
      session.role !== 'ADMIN' &&
      tour.realtorId !== session.userId &&
      tour.buyerId !== session.userId
    ) {
      return errorResponse(ErrorCode.FORBIDDEN, 'Access denied')
    }

    if (tour.deletedAt) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Tour has been deleted')
    }

    // Parse request body
    const body = await request.json().catch(() => ({}))
    const validation = optimizeSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request body',
        validation.error.flatten().fieldErrors
      )
    }

    const { startFromHouseId, applyOptimization } = validation.data

    // Check if we have enough stops with coordinates
    const stopsWithCoords = tour.stops.filter(
      (stop) => stop.house.latitude != null && stop.house.longitude != null
    )

    if (stopsWithCoords.length < 2) {
      return errorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Tour needs at least 2 houses with coordinates to optimize the route'
      )
    }

    // Prepare locations for optimization
    const locations: Location[] = tour.stops
      .filter((stop) => stop.house.latitude != null && stop.house.longitude != null)
      .map((stop) => ({
        id: stop.house.id,
        latitude: stop.house.latitude!,
        longitude: stop.house.longitude!,
        address: `${stop.house.address}, ${stop.house.city}, ${stop.house.state}`,
      }))

    // Capture original order for comparison
    const originalLocations = [...locations]

    // Optimize the route
    const optimizedResult = startFromHouseId
      ? optimizeRouteFromStart(locations, startFromHouseId)
      : optimizeRoute(locations)

    // Calculate improvement
    const improvement = calculateImprovement(originalLocations, optimizedResult.orderedLocations)

    // If requested, apply the optimization to the tour
    if (applyOptimization && session.role !== 'BUYER') {
      // Only realtor or admin can apply changes
      if (tour.realtorId !== session.userId && session.role !== 'ADMIN') {
        return errorResponse(
          ErrorCode.FORBIDDEN,
          'Only the tour creator can apply route optimization'
        )
      }

      // Can't modify completed or cancelled tours
      if (tour.status === 'COMPLETED' || tour.status === 'CANCELLED') {
        return errorResponse(
          ErrorCode.INVALID_STATE_TRANSITION,
          `Cannot modify a ${tour.status.toLowerCase()} tour`
        )
      }

      // Update all stops with new order indexes
      const updates = optimizedResult.orderedLocations.map((loc, index) => {
        const stop = tour.stops.find((s) => s.house.id === loc.id)
        if (!stop) return null
        return prisma.tourStop.update({
          where: { id: stop.id },
          data: { orderIndex: index },
        })
      }).filter(Boolean)

      await prisma.$transaction(updates as any[])
    }

    // Build response with optimized order
    const optimizedStops = optimizedResult.orderedLocations.map((loc, index) => {
      const originalStop = tour.stops.find((s) => s.house.id === loc.id)
      return {
        stopId: originalStop?.id,
        orderIndex: index,
        house: {
          id: loc.id,
          address: loc.address,
          latitude: loc.latitude,
          longitude: loc.longitude,
        },
      }
    })

    // Find houses without coordinates (won't be in optimized route)
    const housesWithoutCoords = tour.stops
      .filter((stop) => stop.house.latitude == null || stop.house.longitude == null)
      .map((stop) => ({
        stopId: stop.id,
        house: {
          id: stop.house.id,
          address: `${stop.house.address}, ${stop.house.city}, ${stop.house.state}`,
        },
        reason: 'Missing coordinates',
      }))

    return successResponse({
      tourId: tour.id,
      tourName: tour.name,
      optimization: {
        totalDistance: optimizedResult.totalDistance,
        totalDistanceUnit: 'km',
        estimatedDuration: optimizedResult.estimatedDuration,
        estimatedDurationUnit: 'minutes',
        improvement: improvement,
        improvementUnit: '%',
        googleMapsUrl: optimizedResult.googleMapsUrl,
      },
      optimizedRoute: optimizedStops,
      excluded: housesWithoutCoords,
      applied: applyOptimization && session.role !== 'BUYER',
      message: applyOptimization && session.role !== 'BUYER'
        ? 'Route optimization applied successfully'
        : 'Route optimization calculated. Set applyOptimization to true to save changes.',
    })
  } catch (error) {
    console.error('Optimize route error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to optimize route')
  }
}

/**
 * GET /api/tours/[id]/optimize-route
 * Get the current route optimization status without making changes
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    const { id: tourId } = await params

    // Get the tour with all stops and house coordinates
    const tour = await prisma.tour.findUnique({
      where: { id: tourId },
      include: {
        stops: {
          where: { deletedAt: null },
          include: {
            house: {
              select: {
                id: true,
                address: true,
                city: true,
                state: true,
                latitude: true,
                longitude: true,
              },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    })

    if (!tour) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Tour not found')
    }

    // Check access
    if (
      session.role !== 'ADMIN' &&
      tour.realtorId !== session.userId &&
      tour.buyerId !== session.userId
    ) {
      return errorResponse(ErrorCode.FORBIDDEN, 'Access denied')
    }

    if (tour.deletedAt) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Tour has been deleted')
    }

    // Prepare current route
    const currentLocations: Location[] = tour.stops
      .filter((stop) => stop.house.latitude != null && stop.house.longitude != null)
      .map((stop) => ({
        id: stop.house.id,
        latitude: stop.house.latitude!,
        longitude: stop.house.longitude!,
        address: `${stop.house.address}, ${stop.house.city}, ${stop.house.state}`,
      }))

    if (currentLocations.length < 2) {
      return successResponse({
        tourId: tour.id,
        tourName: tour.name,
        canOptimize: false,
        reason: 'Need at least 2 houses with coordinates',
        currentRoute: tour.stops.map((stop, index) => ({
          stopId: stop.id,
          orderIndex: index,
          house: {
            id: stop.house.id,
            address: `${stop.house.address}, ${stop.house.city}, ${stop.house.state}`,
            hasCoordinates: stop.house.latitude != null && stop.house.longitude != null,
          },
        })),
      })
    }

    // Calculate current route metrics
    let currentDistance = 0
    for (let i = 0; i < currentLocations.length - 1; i++) {
      const dx = currentLocations[i + 1].latitude - currentLocations[i].latitude
      const dy = currentLocations[i + 1].longitude - currentLocations[i].longitude
      // Haversine approximation
      currentDistance += Math.sqrt(dx * dx + dy * dy) * 111 // rough km conversion
    }

    // Get optimized route for comparison
    const optimizedResult = optimizeRoute(currentLocations)
    const improvement = calculateImprovement(currentLocations, optimizedResult.orderedLocations)

    return successResponse({
      tourId: tour.id,
      tourName: tour.name,
      canOptimize: true,
      currentRoute: {
        stops: tour.stops.map((stop, index) => ({
          stopId: stop.id,
          orderIndex: index,
          house: {
            id: stop.house.id,
            address: `${stop.house.address}, ${stop.house.city}, ${stop.house.state}`,
            hasCoordinates: stop.house.latitude != null && stop.house.longitude != null,
          },
        })),
        googleMapsUrl: `https://www.google.com/maps/dir/${currentLocations.map((l) => `${l.latitude},${l.longitude}`).join('/')}`,
      },
      potentialOptimization: {
        estimatedImprovement: improvement,
        improvementUnit: '%',
        optimizedDistance: optimizedResult.totalDistance,
        optimizedDuration: optimizedResult.estimatedDuration,
      },
      housesWithoutCoordinates: tour.stops
        .filter((stop) => stop.house.latitude == null || stop.house.longitude == null)
        .map((stop) => ({
          id: stop.house.id,
          address: `${stop.house.address}, ${stop.house.city}, ${stop.house.state}`,
        })),
    })
  } catch (error) {
    console.error('Get route optimization status error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to get route optimization status')
  }
}
