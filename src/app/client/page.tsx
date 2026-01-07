'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { NetworkError } from '@/components/ui/ErrorState'
import { format, parseISO } from 'date-fns'
import { BuyerOnboarding, NextStepsChecklist } from '@/components/onboarding'

interface House {
  id: string
  address: string
  city: string
  state: string
  price: number | null
  images?: string[]
}

interface UpcomingVisit {
  id: string
  scheduledAt: string
  house: House
}

interface FavoriteHouse {
  id: string
  house: House
  recordingCount: number
  overallImpression: string | null
}

interface DashboardStats {
  totalHouses: number
  visitedHouses: number
  totalRecordings: number
  favorites: number
}

interface OnboardingStats {
  hasHouses: boolean
  hasVisits: boolean
  hasRecordings: boolean
  hasDreamProfile: boolean
  hasReport: boolean
}

interface DashboardData {
  user: {
    name: string
    hasCompletedOnboarding: boolean
  }
  stats: DashboardStats
  upcomingVisits: UpcomingVisit[]
  favoriteHouses: FavoriteHouse[]
  onboarding: OnboardingStats
}

const IMPRESSION_EMOJIS: Record<string, string> = {
  LOVED: '❤️',
  LIKED: '👍',
  NEUTRAL: '😐',
  DISLIKED: '👎',
}

export default function ClientDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/dashboard/buyer')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to fetch dashboard')
      }

      setData(result.data)
      // Show onboarding if user hasn't completed it
      if (!result.data.user?.hasCompletedOnboarding) {
        setShowOnboarding(true)
      }
    } catch (err) {
      console.error('Fetch dashboard error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  // Loading state
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
          <div className="h-5 bg-gray-200 rounded w-64 mt-2 animate-pulse" />
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
                <div className="h-8 bg-gray-200 rounded w-12" />
              </div>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded" />
                ))}
              </div>
            </div>
          </Card>
          <Card>
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded" />
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <NetworkError onRetry={fetchDashboard} />
      </div>
    )
  }

  const user = data?.user || { name: '', hasCompletedOnboarding: false }
  const stats = data?.stats || {
    totalHouses: 0,
    visitedHouses: 0,
    totalRecordings: 0,
    favorites: 0,
  }
  const upcomingVisits = data?.upcomingVisits || []
  const favoriteHouses = data?.favoriteHouses || []
  const onboarding = data?.onboarding || {
    hasHouses: false,
    hasVisits: false,
    hasRecordings: false,
    hasDreamProfile: false,
    hasReport: false,
  }

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
    setData((prev) =>
      prev ? { ...prev, user: { ...prev.user, hasCompletedOnboarding: true } } : prev
    )
  }

  const firstName = user.name?.split(' ')[0] || 'there'

  return (
    <div className="max-w-6xl mx-auto">
      {/* Onboarding Modal */}
      {showOnboarding && (
        <BuyerOnboarding userName={user.name || 'Friend'} onComplete={handleOnboardingComplete} />
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome Back, {firstName}!</h1>
        <p className="text-gray-600">Track your house hunting journey</p>
      </div>

      {/* Getting Started Checklist */}
      <div className="mb-6">
        <NextStepsChecklist role="BUYER" stats={onboarding} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <p className="text-sm text-gray-500">Houses to Visit</p>
          <p className="text-3xl font-bold text-gray-900">{stats.totalHouses}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Houses Visited</p>
          <p className="text-3xl font-bold text-green-600">{stats.visitedHouses}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Recordings</p>
          <p className="text-3xl font-bold" style={{ color: '#006AFF' }}>{stats.totalRecordings}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Favorites</p>
          <p className="text-3xl font-bold text-red-500">{stats.favorites}</p>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming Visits */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Visits</h2>
          </div>

          {upcomingVisits.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No upcoming visits</p>
          ) : (
            <div className="space-y-3">
              {upcomingVisits.map((visit) => (
                <Link
                  key={visit.id}
                  href={`/client/houses/${visit.house.id}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900">{visit.house.address}</p>
                    <p className="text-sm text-gray-500">
                      {visit.house.city}, {visit.house.state}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {format(parseISO(visit.scheduledAt), 'MMM d')}
                    </p>
                    <p className="text-sm text-gray-500">
                      {format(parseISO(visit.scheduledAt), 'h:mm a')}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Favorite Houses */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Your Favorites</h2>
            <Link href="/client/compare">
              <Button variant="ghost" size="sm">
                Compare
              </Button>
            </Link>
          </div>

          {favoriteHouses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-2">No favorites yet</p>
              <p className="text-sm text-gray-400">Visit houses and mark your favorites</p>
            </div>
          ) : (
            <div className="space-y-3">
              {favoriteHouses.map((fav) => (
                <Link
                  key={fav.id}
                  href={`/client/houses/${fav.house.id}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {fav.overallImpression
                        ? IMPRESSION_EMOJIS[fav.overallImpression] || '❤️'
                        : '❤️'}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{fav.house.address}</p>
                      <p className="text-sm text-gray-500">{fav.recordingCount} recordings</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {fav.house.price && (
                      <p className="font-bold text-gray-900">
                        ${(fav.house.price / 1000).toFixed(0)}k
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <Link href="/client/houses">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: '#E3F2FD' }}>
                <svg
                  className="w-6 h-6"
                  style={{ color: '#006AFF' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">View All Houses</p>
                <p className="text-sm text-gray-500">Browse your house list</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/client/compare">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Compare Houses</p>
                <p className="text-sm text-gray-500">Listen to your recordings side by side</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  )
}
