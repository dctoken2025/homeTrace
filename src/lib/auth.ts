import { NextRequest } from 'next/server'
import { UserRole } from '@prisma/client'
import { getAuthUser, AuthUser } from './jwt'
import { errorResponse, ErrorCode } from './api-response'

/**
 * Get authenticated user from request
 * Uses JWT token from Authorization header
 */
export async function getRequestUser(request: NextRequest): Promise<AuthUser | null> {
  const authHeader = request.headers.get('authorization')
  return getAuthUser(authHeader)
}

/**
 * Get user from middleware-injected headers (faster, no JWT verify)
 */
export function getRequestUserFromHeaders(request: NextRequest): AuthUser | null {
  const userId = request.headers.get('x-user-id')
  const email = request.headers.get('x-user-email')
  const role = request.headers.get('x-user-role') as UserRole | null

  if (!userId || !email || !role) {
    return null
  }

  return { userId, email, role }
}

/**
 * Require authentication and specific role(s)
 * Returns error response if not authorized
 */
export function requireRole(
  user: AuthUser | null,
  allowedRoles: UserRole[]
): ReturnType<typeof errorResponse> | null {
  if (!user) {
    return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
  }

  if (!allowedRoles.includes(user.role)) {
    return errorResponse(
      ErrorCode.FORBIDDEN,
      'You do not have permission to access this resource'
    )
  }

  return null
}

/**
 * Check if user is a buyer
 */
export function isBuyer(user: AuthUser | null): boolean {
  return user?.role === 'BUYER'
}

/**
 * Check if user is a realtor
 */
export function isRealtor(user: AuthUser | null): boolean {
  return user?.role === 'REALTOR'
}

/**
 * Check if user is an admin
 */
export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === 'ADMIN'
}

/**
 * Check if user can access buyer-specific resources
 * Admins and the buyer themselves can access
 */
export function canAccessBuyerResources(
  user: AuthUser | null,
  targetBuyerId: string
): boolean {
  if (!user) return false
  if (user.role === 'ADMIN') return true
  if (user.role === 'BUYER' && user.userId === targetBuyerId) return true
  return false
}

/**
 * Check if realtor is connected to buyer
 * This needs to be checked against the database
 */
export async function isRealtorConnectedToBuyer(
  realtorId: string,
  buyerId: string,
  prisma: { buyerRealtor: { findUnique: (args: { where: { buyerId_realtorId: { buyerId: string; realtorId: string } } }) => Promise<{ id: string } | null> } }
): Promise<boolean> {
  const connection = await prisma.buyerRealtor.findUnique({
    where: {
      buyerId_realtorId: {
        buyerId,
        realtorId,
      },
    },
  })
  return connection !== null
}
