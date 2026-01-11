import { z } from 'zod'

// ==================== User Validations ====================

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .max(255, 'Email is too long')

export const passwordSchema = z
  .string()
  .min(1, 'Password is required')
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')

export const nameSchema = z
  .string()
  .min(1, 'Full name is required')
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name is too long')

export const phoneSchema = z
  .string()
  .max(20, 'Phone number too long')
  .optional()
  .nullable()

export const timezoneSchema = z
  .string()
  .default('America/New_York')

// Registration schema
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  phone: phoneSchema,
  role: z.enum(['BUYER', 'REALTOR']),
  timezone: timezoneSchema,
})

// Login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

// Password reset schemas
export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordSchema,
})

// ==================== House Validations ====================

export const addressSchema = z
  .string()
  .min(1, 'Address is required')
  .max(255, 'Address too long')

export const citySchema = z
  .string()
  .min(1, 'City is required')
  .max(100, 'City too long')

export const stateSchema = z
  .string()
  .min(2, 'State is required')
  .max(50, 'State too long')

export const zipCodeSchema = z
  .string()
  .min(5, 'ZIP code must be at least 5 characters')
  .max(10, 'ZIP code too long')

export const priceSchema = z
  .number()
  .int()
  .positive('Price must be positive')
  .optional()

export const createHouseSchema = z.object({
  externalId: z.string().optional(),
  address: addressSchema,
  city: citySchema,
  state: stateSchema,
  zipCode: zipCodeSchema,
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  price: priceSchema,
  bedrooms: z.number().int().min(0).max(50).optional(),
  bathrooms: z.number().min(0).max(50).optional(),
  sqft: z.number().int().positive().optional(),
  yearBuilt: z.number().int().min(1800).max(new Date().getFullYear() + 5).optional(),
  propertyType: z.string().max(50).optional(),
  images: z.array(z.string().url()).default([]),
  description: z.string().max(5000).optional(),
  features: z.array(z.string()).default([]),
})

// ==================== Visit Validations ====================

export const visitStatusSchema = z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])

export const overallImpressionSchema = z.enum(['LOVED', 'LIKED', 'NEUTRAL', 'DISLIKED'])

export const createVisitSchema = z.object({
  houseId: z.string().cuid('Invalid house ID'),
  scheduledAt: z.string().datetime().refine((date) => {
    return new Date(date) > new Date()
  }, 'Scheduled time must be in the future'),
  notes: z.string().max(2000).optional(),
})

export const updateVisitSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
  overallImpression: overallImpressionSchema.optional(),
  wouldBuy: z.boolean().optional(),
})

// ==================== Recording Validations ====================

// Max 50MB for audio files (~10 min)
export const MAX_AUDIO_SIZE = 50 * 1024 * 1024

// Max 10MB for photos
export const MAX_PHOTO_SIZE = 10 * 1024 * 1024

export const ALLOWED_AUDIO_TYPES = ['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/mp4']
export const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export const roomIdSchema = z.string().min(1, 'Room ID is required').max(50)

export const roomNameSchema = z.string().min(1, 'Room name is required').max(100)

export const createRecordingSchema = z.object({
  visitId: z.string().cuid('Invalid visit ID'),
  roomId: roomIdSchema,
  roomName: roomNameSchema,
})

// ==================== Invite Validations ====================

export const createInviteSchema = z.object({
  email: emailSchema,
  name: nameSchema.optional(),
  phone: phoneSchema,
})

// ==================== Tour Validations ====================

export const createTourSchema = z.object({
  name: z.string().min(1, 'Tour name is required').max(100),
  buyerId: z.string().cuid().optional(),
  scheduledDate: z.string().datetime().optional(),
  houseIds: z.array(z.string().cuid()).min(1, 'At least one house is required'),
  notes: z.string().max(2000).optional(),
})

// ==================== Privacy Settings Validations ====================

export const updatePrivacySettingsSchema = z.object({
  shareReportWithRealtor: z.boolean().optional(),
  shareDreamHouseProfile: z.boolean().optional(),
  shareRecordings: z.boolean().optional(),
})

// ==================== AI Report Validations ====================

export const MIN_HOUSES_FOR_REPORT = 2

export const createReportSchema = z.object({
  // No additional fields needed - report is generated from user's data
})

// ==================== Helper Functions ====================

export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: true
  data: T
} | {
  success: false
  errors: z.ZodError['errors']
} {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  return { success: false, errors: result.error.errors }
}

export function formatZodErrors(errors: z.ZodError['errors']): Record<string, string> {
  const formatted: Record<string, string> = {}

  for (const error of errors) {
    const path = error.path.join('.')
    formatted[path] = error.message
  }

  return formatted
}
