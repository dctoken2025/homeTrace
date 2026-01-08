import { NextRequest } from 'next/server'
import { getSessionUser, getUserSessions, revokeAllUserSessions } from '@/lib/auth-session'
import { successResponse, errorResponse, ErrorCode, Errors } from '@/lib/api-response'

/**
 * GET /api/auth/sessions
 * List all active sessions for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionUser(request)

    if (!session) {
      return Errors.unauthorized()
    }

    const sessions = await getUserSessions(session.userId)

    // Mark the current session
    const sessionsWithCurrent = sessions.map((s) => ({
      ...s,
      isCurrent: s.id === session.sessionId,
    }))

    return successResponse({
      sessions: sessionsWithCurrent,
      currentSessionId: session.sessionId,
    })
  } catch (error) {
    console.error('Get sessions error:', error)
    return errorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch sessions'
    )
  }
}

/**
 * DELETE /api/auth/sessions
 * Revoke all sessions except the current one (logout from all devices)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSessionUser(request)

    if (!session) {
      return Errors.unauthorized()
    }

    // Revoke all sessions for this user
    await revokeAllUserSessions(session.userId, 'logout_all_devices')

    return successResponse({
      message: 'All sessions have been revoked',
    })
  } catch (error) {
    console.error('Revoke all sessions error:', error)
    return errorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to revoke sessions'
    )
  }
}
