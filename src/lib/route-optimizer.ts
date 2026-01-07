/**
 * Tour Route Optimizer
 * Uses a simplified Traveling Salesman Problem (TSP) algorithm
 * to find the most efficient route between houses in a tour.
 */

export interface Location {
  id: string
  latitude: number
  longitude: number
  address?: string
}

export interface OptimizedRoute {
  orderedLocations: Location[]
  totalDistance: number // in kilometers
  estimatedDuration: number // in minutes
  googleMapsUrl: string
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

/**
 * Build distance matrix for all locations
 */
function buildDistanceMatrix(locations: Location[]): number[][] {
  const n = locations.length
  const matrix: number[][] = []

  for (let i = 0; i < n; i++) {
    matrix[i] = []
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 0
      } else {
        matrix[i][j] = haversineDistance(
          locations[i].latitude,
          locations[i].longitude,
          locations[j].latitude,
          locations[j].longitude
        )
      }
    }
  }

  return matrix
}

/**
 * Calculate total distance for a given route
 */
function calculateTotalDistance(route: number[], distanceMatrix: number[][]): number {
  let total = 0
  for (let i = 0; i < route.length - 1; i++) {
    total += distanceMatrix[route[i]][route[i + 1]]
  }
  return total
}

/**
 * Nearest Neighbor Algorithm for TSP
 * Simple but effective heuristic for small sets of locations
 */
function nearestNeighborTSP(
  distanceMatrix: number[][],
  startIndex: number = 0
): number[] {
  const n = distanceMatrix.length
  const visited: boolean[] = new Array(n).fill(false)
  const route: number[] = [startIndex]
  visited[startIndex] = true

  while (route.length < n) {
    const current = route[route.length - 1]
    let nearestDistance = Infinity
    let nearestIndex = -1

    for (let i = 0; i < n; i++) {
      if (!visited[i] && distanceMatrix[current][i] < nearestDistance) {
        nearestDistance = distanceMatrix[current][i]
        nearestIndex = i
      }
    }

    if (nearestIndex !== -1) {
      route.push(nearestIndex)
      visited[nearestIndex] = true
    }
  }

  return route
}

/**
 * 2-opt improvement algorithm
 * Iteratively improves the route by swapping edges
 */
function twoOptImprovement(
  route: number[],
  distanceMatrix: number[][]
): number[] {
  let improved = true
  let currentRoute = [...route]

  while (improved) {
    improved = false

    for (let i = 0; i < currentRoute.length - 2; i++) {
      for (let j = i + 2; j < currentRoute.length; j++) {
        // Skip if adjacent (no improvement possible)
        if (j === i + 1) continue

        // Calculate current distance
        const currentDist =
          distanceMatrix[currentRoute[i]][currentRoute[i + 1]] +
          distanceMatrix[currentRoute[j]][currentRoute[(j + 1) % currentRoute.length]]

        // Calculate new distance if we swap
        const newDist =
          distanceMatrix[currentRoute[i]][currentRoute[j]] +
          distanceMatrix[currentRoute[i + 1]][currentRoute[(j + 1) % currentRoute.length]]

        if (newDist < currentDist) {
          // Reverse the segment between i+1 and j
          const newRoute = [
            ...currentRoute.slice(0, i + 1),
            ...currentRoute.slice(i + 1, j + 1).reverse(),
            ...currentRoute.slice(j + 1),
          ]
          currentRoute = newRoute
          improved = true
        }
      }
    }
  }

  return currentRoute
}

/**
 * Try all starting points and return the best route
 * For small number of locations, this is efficient
 */
function findBestRoute(distanceMatrix: number[][]): number[] {
  const n = distanceMatrix.length

  if (n <= 1) return [0]
  if (n === 2) return [0, 1]

  let bestRoute: number[] = []
  let bestDistance = Infinity

  // Try each location as starting point
  for (let start = 0; start < n; start++) {
    // Get initial route using nearest neighbor
    let route = nearestNeighborTSP(distanceMatrix, start)

    // Improve using 2-opt
    route = twoOptImprovement(route, distanceMatrix)

    // Calculate total distance
    const distance = calculateTotalDistance(route, distanceMatrix)

    if (distance < bestDistance) {
      bestDistance = distance
      bestRoute = route
    }
  }

  return bestRoute
}

/**
 * Generate Google Maps directions URL
 */
function generateGoogleMapsUrl(locations: Location[]): string {
  if (locations.length === 0) return ''

  // Google Maps URL format:
  // https://www.google.com/maps/dir/origin/waypoints/destination

  const baseUrl = 'https://www.google.com/maps/dir/'

  const points = locations.map(
    (loc) => `${loc.latitude},${loc.longitude}`
  )

  return baseUrl + points.join('/')
}

/**
 * Estimate travel time based on distance
 * Uses average urban speed of 30 km/h
 * Adds 15 minutes per stop for parking/walking
 */
function estimateTravelTime(
  totalDistance: number,
  numStops: number
): number {
  const averageSpeedKmh = 30 // Urban driving speed
  const stopTimeMinutes = 15 // Time per stop

  const drivingTimeMinutes = (totalDistance / averageSpeedKmh) * 60
  const totalStopTime = numStops * stopTimeMinutes

  return Math.round(drivingTimeMinutes + totalStopTime)
}

/**
 * Main function to optimize a tour route
 */
export function optimizeRoute(locations: Location[]): OptimizedRoute {
  // Filter out locations without coordinates
  const validLocations = locations.filter(
    (loc) => loc.latitude != null && loc.longitude != null
  )

  if (validLocations.length === 0) {
    return {
      orderedLocations: [],
      totalDistance: 0,
      estimatedDuration: 0,
      googleMapsUrl: '',
    }
  }

  if (validLocations.length === 1) {
    return {
      orderedLocations: validLocations,
      totalDistance: 0,
      estimatedDuration: 15, // Just the stop time
      googleMapsUrl: generateGoogleMapsUrl(validLocations),
    }
  }

  // Build distance matrix
  const distanceMatrix = buildDistanceMatrix(validLocations)

  // Find optimal route
  const optimalOrder = findBestRoute(distanceMatrix)

  // Reorder locations
  const orderedLocations = optimalOrder.map((i) => validLocations[i])

  // Calculate total distance
  const totalDistance = calculateTotalDistance(optimalOrder, distanceMatrix)

  // Estimate duration
  const estimatedDuration = estimateTravelTime(totalDistance, validLocations.length)

  // Generate Google Maps URL
  const googleMapsUrl = generateGoogleMapsUrl(orderedLocations)

  return {
    orderedLocations,
    totalDistance: Math.round(totalDistance * 10) / 10, // Round to 1 decimal
    estimatedDuration,
    googleMapsUrl,
  }
}

/**
 * Optimize route with a fixed starting point
 * Useful when user wants to start from a specific location
 */
export function optimizeRouteFromStart(
  locations: Location[],
  startLocationId: string
): OptimizedRoute {
  const startIndex = locations.findIndex((loc) => loc.id === startLocationId)

  if (startIndex === -1) {
    // Fall back to regular optimization
    return optimizeRoute(locations)
  }

  // Filter out locations without coordinates
  const validLocations = locations.filter(
    (loc) => loc.latitude != null && loc.longitude != null
  )

  if (validLocations.length <= 1) {
    return optimizeRoute(validLocations)
  }

  // Build distance matrix
  const distanceMatrix = buildDistanceMatrix(validLocations)

  // Find the index of start location in valid locations
  const validStartIndex = validLocations.findIndex(
    (loc) => loc.id === startLocationId
  )

  if (validStartIndex === -1) {
    return optimizeRoute(validLocations)
  }

  // Get route starting from specified location
  let route = nearestNeighborTSP(distanceMatrix, validStartIndex)
  route = twoOptImprovement(route, distanceMatrix)

  // Reorder locations
  const orderedLocations = route.map((i) => validLocations[i])

  // Calculate total distance
  const totalDistance = calculateTotalDistance(route, distanceMatrix)

  // Estimate duration
  const estimatedDuration = estimateTravelTime(totalDistance, validLocations.length)

  // Generate Google Maps URL
  const googleMapsUrl = generateGoogleMapsUrl(orderedLocations)

  return {
    orderedLocations,
    totalDistance: Math.round(totalDistance * 10) / 10,
    estimatedDuration,
    googleMapsUrl,
  }
}

/**
 * Calculate the improvement percentage of optimized route vs original
 */
export function calculateImprovement(
  originalLocations: Location[],
  optimizedLocations: Location[]
): number {
  if (originalLocations.length < 2) return 0

  const validOriginal = originalLocations.filter(
    (loc) => loc.latitude != null && loc.longitude != null
  )
  const validOptimized = optimizedLocations.filter(
    (loc) => loc.latitude != null && loc.longitude != null
  )

  if (validOriginal.length < 2 || validOptimized.length < 2) return 0

  // Calculate original distance
  let originalDistance = 0
  for (let i = 0; i < validOriginal.length - 1; i++) {
    originalDistance += haversineDistance(
      validOriginal[i].latitude,
      validOriginal[i].longitude,
      validOriginal[i + 1].latitude,
      validOriginal[i + 1].longitude
    )
  }

  // Calculate optimized distance
  let optimizedDistance = 0
  for (let i = 0; i < validOptimized.length - 1; i++) {
    optimizedDistance += haversineDistance(
      validOptimized[i].latitude,
      validOptimized[i].longitude,
      validOptimized[i + 1].latitude,
      validOptimized[i + 1].longitude
    )
  }

  if (originalDistance === 0) return 0

  const improvement = ((originalDistance - optimizedDistance) / originalDistance) * 100
  return Math.round(improvement * 10) / 10
}
