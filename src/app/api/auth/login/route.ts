import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/jwt'
import { loginSchema, validateRequest, formatZodErrors } from '@/lib/validations'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api-response'
import { checkRateLimit, getIdentifier, getRateLimitHeaders } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for login attempts
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    const identifier = getIdentifier(ip)
    const rateLimit = checkRateLimit(identifier, 'login')

    if (!rateLimit.success) {
      const response = errorResponse(
        ErrorCode.RATE_LIMIT_EXCEEDED,
        'Too many login attempts. Please try again later.'
      )
      // Add rate limit headers
      const headers = getRateLimitHeaders(rateLimit)
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      return response
    }

    const body = await request.json()

    // Validate request body
    const validation = validateRequest(loginSchema, body)
    if (!validation.success) {
      return errorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid login data',
        { fields: formatZodErrors(validation.errors) }
      )
    }

    const { email, password } = validation.data

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        role: true,
        timezone: true,
        hasCompletedOnboarding: true,
        avatarUrl: true,
        createdAt: true,
      },
    })

    if (!user) {
      return errorResponse(
        ErrorCode.UNAUTHORIZED,
        'Invalid email or password'
      )
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash)
    if (!isValidPassword) {
      return errorResponse(
        ErrorCode.UNAUTHORIZED,
        'Invalid email or password'
      )
    }

    // Generate JWT token
    const token = await generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    // Remove passwordHash from response
    const { passwordHash: _, ...userWithoutPassword } = user

    return successResponse({
      user: userWithoutPassword,
      token,
    })
  } catch (error) {
    console.error('Login error:', error)
    return errorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Login failed. Please try again.'
    )
  }
}
