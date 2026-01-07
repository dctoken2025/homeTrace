import { describe, it, expect, beforeAll } from 'vitest'
import {
  generateToken,
  verifyToken,
  extractTokenFromHeader,
  getAuthUser,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  generateInviteToken,
  verifyInviteToken,
} from '@/lib/jwt'
import { UserRole } from '@prisma/client'

describe('JWT Utilities', () => {
  const testUser = {
    userId: 'test-user-id-123',
    email: 'test@example.com',
    role: 'BUYER' as UserRole,
  }

  describe('generateToken', () => {
    it('should generate a valid JWT token', async () => {
      const token = await generateToken(testUser)

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
    })

    it('should generate different tokens for different users', async () => {
      const token1 = await generateToken(testUser)
      const token2 = await generateToken({
        ...testUser,
        userId: 'different-user-id',
      })

      expect(token1).not.toBe(token2)
    })
  })

  describe('verifyToken', () => {
    it('should verify a valid token and return payload', async () => {
      const token = await generateToken(testUser)
      const payload = await verifyToken(token)

      expect(payload).not.toBeNull()
      expect(payload?.userId).toBe(testUser.userId)
      expect(payload?.email).toBe(testUser.email)
      expect(payload?.role).toBe(testUser.role)
    })

    it('should return null for invalid token', async () => {
      const payload = await verifyToken('invalid-token')
      expect(payload).toBeNull()
    })

    it('should return null for malformed token', async () => {
      const payload = await verifyToken('not.a.valid.jwt.token')
      expect(payload).toBeNull()
    })

    it('should return null for empty string', async () => {
      const payload = await verifyToken('')
      expect(payload).toBeNull()
    })
  })

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const token = extractTokenFromHeader('Bearer my-jwt-token')
      expect(token).toBe('my-jwt-token')
    })

    it('should return null for null header', () => {
      const token = extractTokenFromHeader(null)
      expect(token).toBeNull()
    })

    it('should return null for header without Bearer prefix', () => {
      const token = extractTokenFromHeader('my-jwt-token')
      expect(token).toBeNull()
    })

    it('should return null for empty header', () => {
      const token = extractTokenFromHeader('')
      expect(token).toBeNull()
    })

    it('should return null for malformed Bearer header', () => {
      const token = extractTokenFromHeader('Bearer')
      expect(token).toBeNull()
    })
  })

  describe('getAuthUser', () => {
    it('should return user data for valid auth header', async () => {
      const token = await generateToken(testUser)
      const user = await getAuthUser(`Bearer ${token}`)

      expect(user).not.toBeNull()
      expect(user?.userId).toBe(testUser.userId)
      expect(user?.email).toBe(testUser.email)
      expect(user?.role).toBe(testUser.role)
    })

    it('should return null for null header', async () => {
      const user = await getAuthUser(null)
      expect(user).toBeNull()
    })

    it('should return null for invalid token', async () => {
      const user = await getAuthUser('Bearer invalid-token')
      expect(user).toBeNull()
    })
  })

  describe('Password Reset Token', () => {
    const testData = {
      userId: 'user-123',
      email: 'user@example.com',
    }

    it('should generate password reset token', async () => {
      const token = await generatePasswordResetToken(testData.userId, testData.email)

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
    })

    it('should verify valid password reset token', async () => {
      const token = await generatePasswordResetToken(testData.userId, testData.email)
      const result = await verifyPasswordResetToken(token)

      expect(result).not.toBeNull()
      expect(result?.userId).toBe(testData.userId)
      expect(result?.email).toBe(testData.email)
    })

    it('should return null for invalid password reset token', async () => {
      const result = await verifyPasswordResetToken('invalid-token')
      expect(result).toBeNull()
    })

    it('should not verify auth token as password reset token', async () => {
      const authToken = await generateToken({
        userId: testData.userId,
        email: testData.email,
        role: 'BUYER',
      })
      const result = await verifyPasswordResetToken(authToken)
      expect(result).toBeNull()
    })
  })

  describe('Invite Token', () => {
    const testData = {
      inviteId: 'invite-123',
      email: 'invitee@example.com',
    }

    it('should generate invite token', async () => {
      const token = await generateInviteToken(testData.inviteId, testData.email)

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
    })

    it('should verify valid invite token', async () => {
      const token = await generateInviteToken(testData.inviteId, testData.email)
      const result = await verifyInviteToken(token)

      expect(result).not.toBeNull()
      expect(result?.inviteId).toBe(testData.inviteId)
      expect(result?.email).toBe(testData.email)
    })

    it('should return null for invalid invite token', async () => {
      const result = await verifyInviteToken('invalid-token')
      expect(result).toBeNull()
    })
  })
})
