import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/jwt'
import { successResponse, Errors } from '@/lib/api-response'

/**
 * Logout endpoint
 *
 * For stateless JWT, the actual logout happens client-side by removing the token.
 * This endpoint:
 * - Validates the current token is still valid
 * - Could be extended for token blacklisting in the future
 * - Provides a consistent API response
 */
export async function POST(request: NextRequest) {
  // Verify the token is valid before "logging out"
  const authHeader = request.headers.get('authorization')
  const authUser = await getAuthUser(authHeader)

  if (!authUser) {
    return Errors.unauthorized()
  }

  // In the future, we could add token to a blacklist here
  // For now, just acknowledge the logout

  return successResponse({
    message: 'Logged out successfully',
  })
}
