import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generatePasswordResetToken } from '@/lib/jwt'
import { sendPasswordResetEmail } from '@/lib/email'
import { forgotPasswordSchema, validateRequest, formatZodErrors } from '@/lib/validations'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request body
    const validation = validateRequest(forgotPasswordSchema, body)
    if (!validation.success) {
      return errorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid email',
        { fields: formatZodErrors(validation.errors) }
      )
    }

    const { email } = validation.data

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
      },
    })

    // Always return success to prevent email enumeration
    // Even if user doesn't exist, we respond the same way
    if (!user) {
      return successResponse({
        message: 'If an account with this email exists, you will receive a password reset link.',
      })
    }

    // Generate password reset token
    const resetToken = await generatePasswordResetToken(user.id, user.email)

    // Send password reset email
    const emailResult = await sendPasswordResetEmail(user.email, user.name, resetToken)

    if (!emailResult.success) {
      console.error('Failed to send password reset email:', emailResult.error)
      // Still return success to prevent information disclosure
    }

    return successResponse({
      message: 'If an account with this email exists, you will receive a password reset link.',
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return errorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to process request. Please try again.'
    )
  }
}
