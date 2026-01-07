import { describe, it, expect } from 'vitest'
import {
  emailSchema,
  passwordSchema,
  registerSchema,
  loginSchema,
  createHouseSchema,
  createVisitSchema,
  createInviteSchema,
  validateRequest,
  formatZodErrors,
  MAX_AUDIO_SIZE,
  MAX_PHOTO_SIZE,
  ALLOWED_AUDIO_TYPES,
  ALLOWED_PHOTO_TYPES,
} from '@/lib/validations'

describe('Validation Schemas', () => {
  describe('emailSchema', () => {
    it('should accept valid email', () => {
      const result = emailSchema.safeParse('test@example.com')
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const result = emailSchema.safeParse('invalid-email')
      expect(result.success).toBe(false)
    })

    it('should reject empty email', () => {
      const result = emailSchema.safeParse('')
      expect(result.success).toBe(false)
    })
  })

  describe('passwordSchema', () => {
    it('should accept password with 8+ characters', () => {
      const result = passwordSchema.safeParse('password123')
      expect(result.success).toBe(true)
    })

    it('should reject password with less than 8 characters', () => {
      const result = passwordSchema.safeParse('short')
      expect(result.success).toBe(false)
    })

    it('should reject password that is too long', () => {
      const result = passwordSchema.safeParse('a'.repeat(129))
      expect(result.success).toBe(false)
    })
  })

  describe('registerSchema', () => {
    const validData = {
      email: 'test@example.com',
      password: 'password123',
      name: 'John Doe',
      role: 'BUYER' as const,
    }

    it('should accept valid registration data', () => {
      const result = registerSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept BUYER role', () => {
      const result = registerSchema.safeParse({ ...validData, role: 'BUYER' })
      expect(result.success).toBe(true)
    })

    it('should accept REALTOR role', () => {
      const result = registerSchema.safeParse({ ...validData, role: 'REALTOR' })
      expect(result.success).toBe(true)
    })

    it('should reject ADMIN role', () => {
      const result = registerSchema.safeParse({ ...validData, role: 'ADMIN' })
      expect(result.success).toBe(false)
    })

    it('should reject missing required fields', () => {
      const result = registerSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('should accept optional phone', () => {
      const result = registerSchema.safeParse({ ...validData, phone: '+1234567890' })
      expect(result.success).toBe(true)
    })

    it('should default timezone', () => {
      const result = registerSchema.safeParse(validData)
      if (result.success) {
        expect(result.data.timezone).toBe('America/New_York')
      }
    })
  })

  describe('loginSchema', () => {
    it('should accept valid login data', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'any-password',
      })
      expect(result.success).toBe(true)
    })

    it('should reject missing email', () => {
      const result = loginSchema.safeParse({ password: 'password' })
      expect(result.success).toBe(false)
    })

    it('should reject missing password', () => {
      const result = loginSchema.safeParse({ email: 'test@example.com' })
      expect(result.success).toBe(false)
    })
  })

  describe('createHouseSchema', () => {
    const validHouse = {
      address: '123 Main St',
      city: 'Austin',
      state: 'TX',
      zipCode: '78701',
    }

    it('should accept minimal valid house data', () => {
      const result = createHouseSchema.safeParse(validHouse)
      expect(result.success).toBe(true)
    })

    it('should accept full house data', () => {
      const fullHouse = {
        ...validHouse,
        price: 500000,
        bedrooms: 3,
        bathrooms: 2.5,
        sqft: 2000,
        yearBuilt: 2020,
        propertyType: 'Single Family',
        images: ['https://example.com/img1.jpg'],
        description: 'Beautiful home',
        features: ['Pool', 'Garage'],
      }
      const result = createHouseSchema.safeParse(fullHouse)
      expect(result.success).toBe(true)
    })

    it('should reject negative price', () => {
      const result = createHouseSchema.safeParse({ ...validHouse, price: -100 })
      expect(result.success).toBe(false)
    })

    it('should reject invalid year', () => {
      const result = createHouseSchema.safeParse({ ...validHouse, yearBuilt: 1500 })
      expect(result.success).toBe(false)
    })

    it('should default empty arrays for images and features', () => {
      const result = createHouseSchema.safeParse(validHouse)
      if (result.success) {
        expect(result.data.images).toEqual([])
        expect(result.data.features).toEqual([])
      }
    })
  })

  describe('createVisitSchema', () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString() // Tomorrow

    it('should accept valid visit with future date', () => {
      const result = createVisitSchema.safeParse({
        houseId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
        scheduledAt: futureDate,
      })
      expect(result.success).toBe(true)
    })

    it('should reject past date', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString() // Yesterday
      const result = createVisitSchema.safeParse({
        houseId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
        scheduledAt: pastDate,
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid house ID format', () => {
      const result = createVisitSchema.safeParse({
        houseId: 'invalid-id',
        scheduledAt: futureDate,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('createInviteSchema', () => {
    it('should accept valid invite', () => {
      const result = createInviteSchema.safeParse({
        email: 'buyer@example.com',
        name: 'John Buyer',
      })
      expect(result.success).toBe(true)
    })

    it('should accept invite with just email', () => {
      const result = createInviteSchema.safeParse({
        email: 'buyer@example.com',
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const result = createInviteSchema.safeParse({
        email: 'invalid',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('validateRequest helper', () => {
    it('should return success with data for valid input', () => {
      const result = validateRequest(emailSchema, 'test@example.com')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('test@example.com')
      }
    })

    it('should return errors for invalid input', () => {
      const result = validateRequest(emailSchema, 'invalid')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0)
      }
    })
  })

  describe('formatZodErrors helper', () => {
    it('should format errors as record', () => {
      const result = registerSchema.safeParse({ email: 'invalid' })
      if (!result.success) {
        const formatted = formatZodErrors(result.error.errors)
        expect(typeof formatted).toBe('object')
        expect('email' in formatted).toBe(true)
      }
    })
  })

  describe('File size and type constants', () => {
    it('should have correct audio size limit (50MB)', () => {
      expect(MAX_AUDIO_SIZE).toBe(50 * 1024 * 1024)
    })

    it('should have correct photo size limit (10MB)', () => {
      expect(MAX_PHOTO_SIZE).toBe(10 * 1024 * 1024)
    })

    it('should include expected audio types', () => {
      expect(ALLOWED_AUDIO_TYPES).toContain('audio/webm')
      expect(ALLOWED_AUDIO_TYPES).toContain('audio/mp3')
      expect(ALLOWED_AUDIO_TYPES).toContain('audio/wav')
    })

    it('should include expected photo types', () => {
      expect(ALLOWED_PHOTO_TYPES).toContain('image/jpeg')
      expect(ALLOWED_PHOTO_TYPES).toContain('image/png')
      expect(ALLOWED_PHOTO_TYPES).toContain('image/webp')
    })
  })
})
