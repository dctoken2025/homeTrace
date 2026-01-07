import { describe, it, expect } from 'vitest'
import { UserRole } from '@prisma/client'
import {
  requireRole,
  isBuyer,
  isRealtor,
  isAdmin,
  canAccessBuyerResources,
} from '@/lib/auth'
import { AuthUser } from '@/lib/jwt'

describe('Auth Helper Functions', () => {
  const buyerUser: AuthUser = {
    userId: 'buyer-123',
    email: 'buyer@example.com',
    role: 'BUYER' as UserRole,
  }

  const realtorUser: AuthUser = {
    userId: 'realtor-123',
    email: 'realtor@example.com',
    role: 'REALTOR' as UserRole,
  }

  const adminUser: AuthUser = {
    userId: 'admin-123',
    email: 'admin@example.com',
    role: 'ADMIN' as UserRole,
  }

  describe('requireRole', () => {
    it('should return error for null user', () => {
      const result = requireRole(null, ['BUYER'])
      expect(result).not.toBeNull()
    })

    it('should return null when user has allowed role', () => {
      const result = requireRole(buyerUser, ['BUYER'])
      expect(result).toBeNull()
    })

    it('should return null when user has one of multiple allowed roles', () => {
      const result = requireRole(buyerUser, ['BUYER', 'REALTOR'])
      expect(result).toBeNull()
    })

    it('should return error when user does not have allowed role', () => {
      const result = requireRole(buyerUser, ['ADMIN'])
      expect(result).not.toBeNull()
    })

    it('should allow admin access when admin is in allowed roles', () => {
      const result = requireRole(adminUser, ['ADMIN'])
      expect(result).toBeNull()
    })
  })

  describe('Role Check Functions', () => {
    describe('isBuyer', () => {
      it('should return true for buyer', () => {
        expect(isBuyer(buyerUser)).toBe(true)
      })

      it('should return false for realtor', () => {
        expect(isBuyer(realtorUser)).toBe(false)
      })

      it('should return false for admin', () => {
        expect(isBuyer(adminUser)).toBe(false)
      })

      it('should return false for null', () => {
        expect(isBuyer(null)).toBe(false)
      })
    })

    describe('isRealtor', () => {
      it('should return true for realtor', () => {
        expect(isRealtor(realtorUser)).toBe(true)
      })

      it('should return false for buyer', () => {
        expect(isRealtor(buyerUser)).toBe(false)
      })

      it('should return false for admin', () => {
        expect(isRealtor(adminUser)).toBe(false)
      })

      it('should return false for null', () => {
        expect(isRealtor(null)).toBe(false)
      })
    })

    describe('isAdmin', () => {
      it('should return true for admin', () => {
        expect(isAdmin(adminUser)).toBe(true)
      })

      it('should return false for buyer', () => {
        expect(isAdmin(buyerUser)).toBe(false)
      })

      it('should return false for realtor', () => {
        expect(isAdmin(realtorUser)).toBe(false)
      })

      it('should return false for null', () => {
        expect(isAdmin(null)).toBe(false)
      })
    })
  })

  describe('canAccessBuyerResources', () => {
    const targetBuyerId = 'buyer-123'

    it('should return true for admin accessing any buyer', () => {
      expect(canAccessBuyerResources(adminUser, targetBuyerId)).toBe(true)
      expect(canAccessBuyerResources(adminUser, 'other-buyer')).toBe(true)
    })

    it('should return true for buyer accessing own resources', () => {
      expect(canAccessBuyerResources(buyerUser, buyerUser.userId)).toBe(true)
    })

    it('should return false for buyer accessing other buyer resources', () => {
      expect(canAccessBuyerResources(buyerUser, 'other-buyer-id')).toBe(false)
    })

    it('should return false for realtor (requires connection check)', () => {
      expect(canAccessBuyerResources(realtorUser, targetBuyerId)).toBe(false)
    })

    it('should return false for null user', () => {
      expect(canAccessBuyerResources(null, targetBuyerId)).toBe(false)
    })
  })
})
