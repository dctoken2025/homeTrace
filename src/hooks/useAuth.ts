'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  name: string
  role: string
  avatarUrl?: string
  hasCompletedOnboarding?: boolean
}

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
}

export function useAuth() {
  const router = useRouter()
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  })

  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 401) {
          // Try to refresh the token
          const refreshResponse = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
          })

          if (refreshResponse.ok) {
            // Token refreshed, try fetching user again
            const retryResponse = await fetch('/api/auth/me', {
              credentials: 'include',
            })

            if (retryResponse.ok) {
              const data = await retryResponse.json()
              setState({
                user: data.data.user,
                isLoading: false,
                isAuthenticated: true,
                error: null,
              })
              return
            }
          }
        }

        // Authentication failed
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: 'Authentication required',
        })
        return
      }

      const data = await response.json()
      setState({
        user: data.data.user,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      })
    } catch (error) {
      console.error('Auth fetch error:', error)
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: 'Failed to fetch user',
      })
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      console.error('Logout error:', error)
    }

    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    })

    router.push('/sign-in')
  }, [router])

  const refreshAuth = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }))
    await fetchUser()
  }, [fetchUser])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  return {
    ...state,
    logout,
    refreshAuth,
  }
}

export function useRequireAuth(requiredRole?: string) {
  const router = useRouter()
  const auth = useAuth()

  useEffect(() => {
    if (!auth.isLoading) {
      if (!auth.isAuthenticated) {
        router.push('/sign-in')
      } else if (requiredRole && auth.user?.role !== requiredRole) {
        // Redirect to appropriate dashboard based on role
        const redirectPath =
          auth.user?.role === 'ADMIN'
            ? '/admin'
            : auth.user?.role === 'REALTOR'
            ? '/realtor'
            : '/client'
        router.push(redirectPath)
      }
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.user?.role, requiredRole, router])

  return auth
}
