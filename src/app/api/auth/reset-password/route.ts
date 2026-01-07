import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { verifyPasswordResetToken, generateToken } from '@/lib/jwt'
import { resetPasswordSchema, validateRequest, formatZodErrors } from '@/lib/validations'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request body
    const validation = validateRequest(resetPasswordSchema, body)
    if (!validation.success) {
      return errorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request',
        { fields: formatZodErrors(validation.errors) }
      )
    }

    const { token, password } = validation.data

    // Verify reset token
    const tokenData = await verifyPasswordResetToken(token)
    if (!tokenData) {
      return errorResponse(
        ErrorCode.INVALID_TOKEN,
        'Invalid or expired reset token. Please request a new password reset.'
      )
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: tokenData.userId },
      select: {
        id: true,
        email: true,
        role: true,
      },
    })

    if (!user) {
      return errorResponse(
        ErrorCode.USER_NOT_FOUND,
        'User not found'
      )
    }

    // Verify email matches token
    if (user.email !== tokenData.email) {
      return errorResponse(
        ErrorCode.INVALID_TOKEN,
        'Invalid reset token'
      )
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 12)

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    })

    // Generate new auth token so user is logged in after reset
    const authToken = await generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    return successResponse({
      message: 'Password reset successfully',
      token: authToken,
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return errorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to reset password. Please try again.'
    )
  }
}
