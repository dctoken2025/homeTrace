import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, revokeSession, clearAuthCookies } from '@/lib/auth-session'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api-response'

/**
 * POST /api/auth/logout
 * Logout endpoint - revokes the current session in the database
 * and clears auth cookies
 */
export async function POST(request: NextRequest) {
  try {
    // Get session from cookies or Authorization header
    const session = await getSessionUser(request)

    if (!session) {
      // Even if no valid session, clear cookies
      const response = successResponse({
        message: 'Logged out successfully',
      })
      clearAuthCookies(response as NextResponse)
      return response
    }

    // Revoke session in database
    if (session.sessionId) {
      await revokeSession(session.sessionId, 'logout')
    }

    // Create response and clear cookies
    const response = NextResponse.json({
      success: true,
      data: {
        message: 'Logged out successfully',
      },
    })

    clearAuthCookies(response)

    return response
  } catch (error) {
    console.error('Logout error:', error)
    // Even on error, try to clear cookies
    const response = NextResponse.json({
      success: true,
      data: {
        message: 'Logged out successfully',
      },
    })
    clearAuthCookies(response)
    return response
  }
}
