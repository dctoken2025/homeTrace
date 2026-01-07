import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/jwt'
import { sendWelcomeEmail } from '@/lib/email'
import { registerSchema, validateRequest, formatZodErrors } from '@/lib/validations'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api-response'
import { UserRole } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request body
    const validation = validateRequest(registerSchema, body)
    if (!validation.success) {
      return errorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid registration data',
        { fields: formatZodErrors(validation.errors) }
      )
    }

    const { email, password, name, phone, role, timezone } = validation.data

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      return errorResponse(
        ErrorCode.DUPLICATE_EMAIL,
        'An account with this email already exists'
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name,
        phone: phone || null,
        role: role as UserRole,
        timezone,
        hasCompletedOnboarding: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        timezone: true,
        hasCompletedOnboarding: true,
        createdAt: true,
      },
    })

    // Create privacy settings for buyers
    if (role === 'BUYER') {
      await prisma.privacySettings.create({
        data: {
          buyerId: user.id,
          shareReportWithRealtor: false,
          shareDreamHouseProfile: false,
          shareRecordings: false,
        },
      })
    }

    // Generate JWT token
    const token = await generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    // Send welcome email (don't await to not block response)
    sendWelcomeEmail(user.email, user.name, user.role as 'BUYER' | 'REALTOR').catch(
      (err) => console.error('Failed to send welcome email:', err)
    )

    return successResponse(
      {
        user,
        token,
      },
      undefined,
      201
    )
  } catch (error) {
    console.error('Registration error:', error)
    return errorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create account. Please try again.'
    )
  }
}
