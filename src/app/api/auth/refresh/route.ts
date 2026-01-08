import { NextRequest, NextResponse } from 'next/server'
import { errorResponse, ErrorCode } from '@/lib/api-response'
import { refreshSession, setAuthCookies, clearAuthCookies } from '@/lib/auth-session'

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token from cookie
 */
export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refresh_token')?.value

    if (!refreshToken) {
      return errorResponse(
        ErrorCode.UNAUTHORIZED,
        'No refresh token provided'
      )
    }

    const result = await refreshSession(refreshToken)

    if (!result) {
      // Clear invalid cookies
      const response = errorResponse(
        ErrorCode.INVALID_TOKEN,
        'Session expired. Please login again.'
      )
      clearAuthCookies(response)
      return response
    }

    // Create response with user data
    const response = NextResponse.json({
      success: true,
      data: {
        user: result.user,
      },
    })

    // Set new access token (refresh token remains the same)
    response.cookies.set('access_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60, // 15 minutes
    })

    return response
  } catch (error) {
    console.error('Refresh token error:', error)
    return errorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to refresh session'
    )
  }
}
