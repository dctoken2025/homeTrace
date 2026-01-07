/**
 * Rate Limiting Middleware for Next.js API Routes
 * Uses in-memory store (suitable for single server)
 * For distributed systems, use Redis instead
 */

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

// In-memory store (reset on server restart)
const store: RateLimitStore = {}

// Default configuration
const DEFAULT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000') // 1 minute
const DEFAULT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100') // 100 requests per window

// Different limits for different endpoints
export const RATE_LIMITS = {
  // Auth endpoints - strict limits to prevent brute force
  login: { windowMs: 60000, maxRequests: 5 }, // 5 attempts per minute
  register: { windowMs: 60000, maxRequests: 3 }, // 3 registrations per minute
  forgotPassword: { windowMs: 300000, maxRequests: 3 }, // 3 requests per 5 minutes

  // AI endpoints - expensive operations
  aiChat: { windowMs: 60000, maxRequests: 20 }, // 20 chat messages per minute
  aiReport: { windowMs: 300000, maxRequests: 5 }, // 5 reports per 5 minutes
  aiMatchScore: { windowMs: 60000, maxRequests: 30 }, // 30 score calculations per minute

  // Realty API - external API with monthly limit
  realtySearch: { windowMs: 60000, maxRequests: 10 }, // 10 searches per minute
  realtyDetail: { windowMs: 60000, maxRequests: 30 }, // 30 property views per minute

  // Invites - prevent spam
  invites: { windowMs: 300000, maxRequests: 10 }, // 10 invites per 5 minutes

  // General API - default limits
  default: { windowMs: DEFAULT_WINDOW_MS, maxRequests: DEFAULT_MAX_REQUESTS },
} as const

export type RateLimitType = keyof typeof RATE_LIMITS

export interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number
  limit: number
}

/**
 * Clean up expired entries periodically
 */
function cleanupStore() {
  const now = Date.now()
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupStore, 5 * 60 * 1000)

/**
 * Get a unique identifier for the request
 * Uses IP address + optional user ID
 */
export function getIdentifier(ip: string | null, userId?: string): string {
  const parts = [ip || 'unknown']
  if (userId) {
    parts.push(userId)
  }
  return parts.join(':')
}

/**
 * Check rate limit for a given identifier and limit type
 */
export function checkRateLimit(
  identifier: string,
  limitType: RateLimitType = 'default'
): RateLimitResult {
  const config = RATE_LIMITS[limitType]
  const now = Date.now()
  const key = `${limitType}:${identifier}`

  // Get or create entry
  let entry = store[key]

  if (!entry || entry.resetTime < now) {
    // Create new window
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    }
    store[key] = entry
  }

  // Increment count
  entry.count++

  const remaining = Math.max(0, config.maxRequests - entry.count)
  const success = entry.count <= config.maxRequests

  return {
    success,
    remaining,
    reset: entry.resetTime,
    limit: config.maxRequests,
  }
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  }
}

/**
 * Reset rate limit for a specific identifier
 * Useful for admin overrides
 */
export function resetRateLimit(identifier: string, limitType: RateLimitType = 'default'): void {
  const key = `${limitType}:${identifier}`
  delete store[key]
}

/**
 * Get current rate limit status without incrementing
 */
export function getRateLimitStatus(
  identifier: string,
  limitType: RateLimitType = 'default'
): RateLimitResult {
  const config = RATE_LIMITS[limitType]
  const now = Date.now()
  const key = `${limitType}:${identifier}`

  const entry = store[key]

  if (!entry || entry.resetTime < now) {
    return {
      success: true,
      remaining: config.maxRequests,
      reset: now + config.windowMs,
      limit: config.maxRequests,
    }
  }

  const remaining = Math.max(0, config.maxRequests - entry.count)

  return {
    success: entry.count <= config.maxRequests,
    remaining,
    reset: entry.resetTime,
    limit: config.maxRequests,
  }
}
