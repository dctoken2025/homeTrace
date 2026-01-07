import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api-response'
import { getRequestUser } from '@/lib/auth'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

// Schema for changing password
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

/**
 * POST /api/settings/password
 * Change current user's password
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    const body = await request.json()
    const validation = changePasswordSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid request body',
          validation.error.flatten().fieldErrors
        )
    }

    const { currentPassword, newPassword } = validation.data

    // Get current user with password hash
    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        passwordHash: true,
      },
    })

    if (!userData) {
      return errorResponse(ErrorCode.NOT_FOUND, 'User not found')
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, userData.passwordHash)
    if (!isValidPassword) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Current password is incorrect')
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10)

    // Update password
    await prisma.user.update({
      where: { id: user.userId },
      data: { passwordHash: newPasswordHash },
    })

    return successResponse({
        message: 'Password changed successfully',
      })
  } catch (error) {
    console.error('Change password error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to change password')
  }
}
