import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, revokeSession } from '@/lib/auth-session'
import { successResponse, errorResponse, ErrorCode, Errors } from '@/lib/api-response'

interface Params {
  params: Promise<{ sessionId: string }>
}

/**
 * DELETE /api/auth/sessions/:sessionId
 * Revoke a specific session
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { sessionId } = await params
    const currentSession = await getSessionUser(request)

    if (!currentSession) {
      return Errors.unauthorized()
    }

    // Find the session to revoke
    const sessionToRevoke = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { userId: true, isRevoked: true },
    })

    if (!sessionToRevoke) {
      return Errors.notFound('Session')
    }

    // Ensure user can only revoke their own sessions
    if (sessionToRevoke.userId !== currentSession.userId) {
      return errorResponse(
        ErrorCode.FORBIDDEN,
        'You can only revoke your own sessions'
      )
    }

    if (sessionToRevoke.isRevoked) {
      return errorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Session is already revoked'
      )
    }

    // Revoke the session
    await revokeSession(sessionId, 'manual_revoke')

    return successResponse({
      message: 'Session revoked successfully',
      sessionId,
    })
  } catch (error) {
    console.error('Revoke session error:', error)
    return errorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to revoke session'
    )
  }
}
