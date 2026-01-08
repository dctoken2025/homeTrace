/**
 * Secure Session-Based Authentication
 *
 * Features:
 * - httpOnly cookies (not accessible via JavaScript)
 * - Access token (short-lived: 15 minutes)
 * - Refresh token (long-lived: 7 days)
 * - Session stored in database for revocation
 * - Automatic refresh on access token expiry
 * - Inactivity timeout (30 minutes)
 */

import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from './prisma'
import { randomBytes } from 'crypto'

// Configuration
const ACCESS_TOKEN_EXPIRY = '15m' // 15 minutes
const REFRESH_TOKEN_EXPIRY_DAYS = 7
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'development-secret-key-min-32-characters-long'
)

// Cookie configuration
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}

export interface TokenPayload {
  userId: string
  email: string
  role: string
  sessionId: string
  type: 'access' | 'refresh'
}

export interface UserSession {
  userId: string
  email: string
  role: string
  sessionId: string
}

/**
 * Generate a secure random refresh token
 */
function generateRefreshToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Create access token (short-lived JWT)
 */
async function createAccessToken(payload: Omit<TokenPayload, 'type'>): Promise<string> {
  return new SignJWT({ ...payload, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('hometrace')
    .setAudience('hometrace-users')
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET)
}

/**
 * Verify JWT token
 */
async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: 'hometrace',
      audience: 'hometrace-users',
    })
    return payload as unknown as TokenPayload
  } catch {
    return null
  }
}

/**
 * Create a new session for a user
 */
export async function createSession(
  userId: string,
  email: string,
  role: string,
  userAgent?: string,
  ipAddress?: string
): Promise<{ accessToken: string; refreshToken: string; sessionId: string }> {
  const refreshToken = generateRefreshToken()
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  // Create session in database
  const session = await prisma.session.create({
    data: {
      userId,
      refreshToken,
      userAgent,
      ipAddress,
      expiresAt,
      lastActiveAt: new Date(),
    },
  })

  // Create access token
  const accessToken = await createAccessToken({
    userId,
    email,
    role,
    sessionId: session.id,
  })

  return { accessToken, refreshToken, sessionId: session.id }
}

/**
 * Set auth cookies on response
 */
export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string
): void {
  // Access token cookie (15 minutes)
  response.cookies.set('access_token', accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60, // 15 minutes
  })

  // Refresh token cookie (7 days)
  response.cookies.set('refresh_token', refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
  })
}

/**
 * Clear auth cookies
 */
export function clearAuthCookies(response: NextResponse): void {
  response.cookies.delete('access_token')
  response.cookies.delete('refresh_token')
  // Also clear old cookie name for migration
  response.cookies.delete('auth-token')
}

/**
 * Refresh the session - create new access token
 */
export async function refreshSession(
  refreshToken: string
): Promise<{ accessToken: string; user: { id: string; email: string; role: string } } | null> {
  // Find session
  const session = await prisma.session.findUnique({
    where: { refreshToken },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          deletedAt: true,
        },
      },
    },
  })

  if (!session) {
    return null
  }

  // Check if session is valid
  if (
    session.isRevoked ||
    session.expiresAt < new Date() ||
    session.user.deletedAt
  ) {
    return null
  }

  // Check inactivity timeout
  const inactiveTime = Date.now() - session.lastActiveAt.getTime()
  if (inactiveTime > INACTIVITY_TIMEOUT_MS) {
    // Revoke session due to inactivity
    await prisma.session.update({
      where: { id: session.id },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: 'inactivity',
      },
    })
    return null
  }

  // Update last active time
  await prisma.session.update({
    where: { id: session.id },
    data: { lastActiveAt: new Date() },
  })

  // Create new access token
  const accessToken = await createAccessToken({
    userId: session.user.id,
    email: session.user.email,
    role: session.user.role,
    sessionId: session.id,
  })

  return {
    accessToken,
    user: {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
    },
  }
}

/**
 * Validate session from request
 */
export async function validateSession(request: NextRequest): Promise<UserSession | null> {
  const accessToken = request.cookies.get('access_token')?.value
  const refreshToken = request.cookies.get('refresh_token')?.value

  // Try access token first
  if (accessToken) {
    const payload = await verifyToken(accessToken)
    if (payload && payload.type === 'access') {
      // Verify session is still valid in database
      const session = await prisma.session.findUnique({
        where: { id: payload.sessionId },
        select: { isRevoked: true, expiresAt: true },
      })

      if (session && !session.isRevoked && session.expiresAt > new Date()) {
        return {
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
          sessionId: payload.sessionId,
        }
      }
    }
  }

  // Access token invalid/expired, try refresh
  if (refreshToken) {
    const result = await refreshSession(refreshToken)
    if (result) {
      // Return user session (new access token will be set by middleware)
      return {
        userId: result.user.id,
        email: result.user.email,
        role: result.user.role,
        sessionId: '', // Will be updated
      }
    }
  }

  return null
}

/**
 * Revoke a session (logout)
 */
export async function revokeSession(sessionId: string, reason: string = 'logout'): Promise<void> {
  await prisma.session.update({
    where: { id: sessionId },
    data: {
      isRevoked: true,
      revokedAt: new Date(),
      revokedReason: reason,
    },
  })
}

/**
 * Revoke all sessions for a user (e.g., on password change)
 */
export async function revokeAllUserSessions(userId: string, reason: string = 'password_change'): Promise<void> {
  await prisma.session.updateMany({
    where: {
      userId,
      isRevoked: false,
    },
    data: {
      isRevoked: true,
      revokedAt: new Date(),
      revokedReason: reason,
    },
  })
}

/**
 * Get active sessions for a user
 */
export async function getUserSessions(userId: string) {
  return prisma.session.findMany({
    where: {
      userId,
      isRevoked: false,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      userAgent: true,
      ipAddress: true,
      lastActiveAt: true,
      createdAt: true,
    },
    orderBy: { lastActiveAt: 'desc' },
  })
}

/**
 * Clean up expired sessions (run periodically)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        {
          isRevoked: true,
          revokedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // 30 days old
        },
      ],
    },
  })
  return result.count
}

/**
 * Get user from access token (for API routes)
 */
export async function getSessionUser(request: NextRequest): Promise<UserSession | null> {
  // Check for access token in cookie
  const accessToken = request.cookies.get('access_token')?.value

  // Also check Authorization header for API clients
  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  const token = accessToken || bearerToken

  if (!token) {
    return null
  }

  const payload = await verifyToken(token)
  if (!payload || payload.type !== 'access') {
    return null
  }

  // Verify session is still valid
  const session = await prisma.session.findUnique({
    where: { id: payload.sessionId },
    select: { isRevoked: true, expiresAt: true },
  })

  if (!session || session.isRevoked || session.expiresAt < new Date()) {
    return null
  }

  // Update last active time (async, don't await)
  prisma.session.update({
    where: { id: payload.sessionId },
    data: { lastActiveAt: new Date() },
  }).catch(() => {}) // Ignore errors

  return {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    sessionId: payload.sessionId,
  }
}
