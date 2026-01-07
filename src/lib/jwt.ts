import { SignJWT, jwtVerify, JWTPayload } from 'jose'
import { UserRole } from '@prisma/client'

// JWT configuration
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'development-secret-key-min-32-characters-long'
)
const JWT_ISSUER = 'hometrace'
const JWT_AUDIENCE = 'hometrace-users'

// Token expiration: 7 days
const TOKEN_EXPIRATION = '7d'

export interface TokenPayload extends JWTPayload {
  userId: string
  email: string
  role: UserRole
}

export interface AuthUser {
  userId: string
  email: string
  role: UserRole
}

/**
 * Generate a JWT token for a user
 */
export async function generateToken(payload: {
  userId: string
  email: string
  role: UserRole
}): Promise<string> {
  const token = await new SignJWT({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(TOKEN_EXPIRATION)
    .sign(JWT_SECRET)

  return token
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    })

    // Validate required fields
    if (!payload.userId || !payload.email || !payload.role) {
      return null
    }

    return payload as TokenPayload
  } catch {
    return null
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null
  }

  return parts[1]
}

/**
 * Get authenticated user from request headers
 */
export async function getAuthUser(
  authHeader: string | null
): Promise<AuthUser | null> {
  const token = extractTokenFromHeader(authHeader)
  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload) return null

  return {
    userId: payload.userId as string,
    email: payload.email as string,
    role: payload.role as UserRole,
  }
}

/**
 * Generate a password reset token (shorter expiration)
 */
export async function generatePasswordResetToken(userId: string, email: string): Promise<string> {
  const token = await new SignJWT({
    userId,
    email,
    type: 'password-reset',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setExpirationTime('1h') // 1 hour expiration for password reset
    .sign(JWT_SECRET)

  return token
}

/**
 * Verify password reset token
 */
export async function verifyPasswordResetToken(
  token: string
): Promise<{ userId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
    })

    if (payload.type !== 'password-reset' || !payload.userId || !payload.email) {
      return null
    }

    return {
      userId: payload.userId as string,
      email: payload.email as string,
    }
  } catch {
    return null
  }
}

/**
 * Generate invite token
 */
export async function generateInviteToken(inviteId: string, email: string): Promise<string> {
  const token = await new SignJWT({
    inviteId,
    email,
    type: 'invite',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setExpirationTime('7d') // 7 days expiration for invites
    .sign(JWT_SECRET)

  return token
}

/**
 * Verify invite token
 */
export async function verifyInviteToken(
  token: string
): Promise<{ inviteId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
    })

    if (payload.type !== 'invite' || !payload.inviteId || !payload.email) {
      return null
    }

    return {
      inviteId: payload.inviteId as string,
      email: payload.email as string,
    }
  } catch {
    return null
  }
}
