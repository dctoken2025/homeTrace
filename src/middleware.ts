import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/sign-in',
  '/sign-up',
  '/sign-up/buyer',
  '/sign-up/realtor',
  '/reset-password',
  '/invite',
  '/accept-invite',
]

// API routes that don't require authentication
const PUBLIC_API_ROUTES = [
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/refresh',
  '/api/invites/validate',
  '/api/invites/accept',
]

// Routes restricted to specific roles
const ROLE_ROUTES: Record<string, string[]> = {
  BUYER: ['/client'],
  REALTOR: ['/realtor'],
  ADMIN: ['/admin'],
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'development-secret-key-min-32-characters-long'
)

async function verifyAuth(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: 'hometrace',
      audience: 'hometrace-users',
    })
    return payload
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
    // If user is authenticated and trying to access auth pages, redirect to dashboard
    const accessToken = request.cookies.get('access_token')?.value
    if (accessToken && (pathname === '/sign-in' || pathname.startsWith('/sign-up'))) {
      const payload = await verifyAuth(accessToken)
      if (payload) {
        const role = payload.role as string
        const redirectPath = role === 'ADMIN' ? '/admin' : role === 'REALTOR' ? '/realtor' : '/client'
        return NextResponse.redirect(new URL(redirectPath, request.url))
      }
    }
    return NextResponse.next()
  }

  // Allow public API routes
  if (PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // For API routes, check access_token cookie or Authorization header
  if (pathname.startsWith('/api/')) {
    // First try access_token cookie
    let token = request.cookies.get('access_token')?.value

    // Fallback to Authorization header for API clients
    if (!token) {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7)
      }
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const payload = await verifyAuth(token)

    if (!payload) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } },
        { status: 401 }
      )
    }

    // Add user info to request headers for API routes
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.userId as string)
    requestHeaders.set('x-user-email', payload.email as string)
    requestHeaders.set('x-user-role', payload.role as string)
    if (payload.sessionId) {
      requestHeaders.set('x-session-id', payload.sessionId as string)
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  // For page routes, check access_token cookie
  const accessToken = request.cookies.get('access_token')?.value

  if (!accessToken) {
    const signInUrl = new URL('/sign-in', request.url)
    signInUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(signInUrl)
  }

  const payload = await verifyAuth(accessToken)

  if (!payload) {
    // Token invalid, clear cookies and redirect to sign-in
    const response = NextResponse.redirect(new URL('/sign-in', request.url))
    response.cookies.delete('access_token')
    response.cookies.delete('refresh_token')
    // Also clear legacy cookie
    response.cookies.delete('auth-token')
    return response
  }

  const userRole = payload.role as string

  // Check role-based access
  for (const [role, paths] of Object.entries(ROLE_ROUTES)) {
    for (const path of paths) {
      if (pathname.startsWith(path) && userRole !== role) {
        // Redirect to appropriate dashboard based on role
        const redirectPath = userRole === 'ADMIN' ? '/admin' : userRole === 'REALTOR' ? '/realtor' : '/client'
        return NextResponse.redirect(new URL(redirectPath, request.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
}
