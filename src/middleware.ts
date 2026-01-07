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
]

// API routes that don't require authentication
const PUBLIC_API_ROUTES = [
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/invites/validate',
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
    const token = request.cookies.get('auth-token')?.value
    if (token && (pathname === '/sign-in' || pathname.startsWith('/sign-up'))) {
      const payload = await verifyAuth(token)
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

  // For API routes, check Authorization header
  if (pathname.startsWith('/api/')) {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
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

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  // For page routes, check cookie
  const token = request.cookies.get('auth-token')?.value

  if (!token) {
    const signInUrl = new URL('/sign-in', request.url)
    signInUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(signInUrl)
  }

  const payload = await verifyAuth(token)

  if (!payload) {
    const response = NextResponse.redirect(new URL('/sign-in', request.url))
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
