'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import { NetworkError } from '@/components/ui/ErrorState'
import PageHeader, { CalendarIcon } from '@/components/ui/PageHeader'
import { format, parseISO, startOfMonth, endOfMonth, addMonths } from 'date-fns'

interface House {
  id: string
  address: string
  city: string
  state: string
  price: number | null
  bedrooms: number | null
  bathrooms: number | null
  images: string[]
}

interface Buyer {
  id: string
  name: string
  email: string
}

interface Visit {
  id: string
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  scheduledAt: string
  startedAt: string | null
  completedAt: string | null
  overallImpression: string | null
  wouldBuy: boolean | null
  notes: string | null
  house: House
  buyer: Buyer
  recordingCount: number
}

interface VisitSuggestion {
  id: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
  suggestedAt: string
  message: string | null
  createdAt: string
  house: House
  buyer: Buyer
}

export default function RealtorSchedule() {
  const [visits, setVisits] = useState<Visit[]>([])
  const [suggestions, setSuggestions] = useState<VisitSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'visits' | 'suggestions'>('visits')

  // Fetch visits and suggestions
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch visits for a 3-month window
      const now = new Date()
      const start = startOfMonth(addMonths(now, -1))
      const end = endOfMonth(addMonths(now, 2))

      const params = new URLSearchParams({
        from: start.toISOString(),
        to: end.toISOString(),
        limit: '100',
      })

      // Fetch both visits and suggestions in parallel
      const [visitsResponse, suggestionsResponse] = await Promise.all([
        fetch(`/api/visits?${params.toString()}`),
        fetch(`/api/visits/suggestions?${params.toString()}`),
      ])

      const visitsData = await visitsResponse.json()
      const suggestionsData = await suggestionsResponse.json()

      if (!visitsResponse.ok) {
        throw new Error(visitsData.error?.message || 'Failed to fetch visits')
      }

      setVisits(visitsData.data?.items || visitsData.data || [])
      setSuggestions(suggestionsData.data || [])
    } catch (err) {
      console.error('Fetch data error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Group visits by date
  const groupedVisits = visits.reduce(
    (acc, visit) => {
      const dateKey = format(parseISO(visit.scheduledAt), 'yyyy-MM-dd')
      if (!acc[dateKey]) {
        acc[dateKey] = []
      }
      acc[dateKey].push(visit)
      return acc
    },
    {} as Record<string, Visit[]>
  )

  const sortedDates = Object.keys(groupedVisits).sort()

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-50 border-green-200'
      case 'CANCELLED':
        return 'bg-red-50 border-red-200'
      case 'IN_PROGRESS':
        return 'bg-amber-50 border-amber-200'
      default:
        return 'bg-blue-50 border-blue-200'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-700'
      case 'CANCELLED':
        return 'bg-red-100 text-red-700'
      case 'IN_PROGRESS':
        return 'bg-amber-100 text-amber-700'
      default:
        return 'bg-blue-100 text-blue-700'
    }
  }

  const scheduledCount = visits.filter(v => v.status === 'SCHEDULED').length
  const completedCount = visits.filter(v => v.status === 'COMPLETED').length
  const pendingSuggestionsCount = suggestions.filter(s => s.status === 'PENDING').length

  // Group suggestions by date
  const groupedSuggestions = suggestions.reduce(
    (acc, suggestion) => {
      const dateKey = format(parseISO(suggestion.suggestedAt), 'yyyy-MM-dd')
      if (!acc[dateKey]) {
        acc[dateKey] = []
      }
      acc[dateKey].push(suggestion)
      return acc
    },
    {} as Record<string, VisitSuggestion[]>
  )

  const sortedSuggestionDates = Object.keys(groupedSuggestions).sort()

  const getSuggestionStatusColor = (status: string, suggestedAt: string) => {
    const isExpired = status === 'PENDING' && new Date(suggestedAt) < new Date()
    if (isExpired) return 'bg-gray-50 border-gray-200'
    switch (status) {
      case 'ACCEPTED':
        return 'bg-green-50 border-green-200'
      case 'REJECTED':
        return 'bg-red-50 border-red-200'
      case 'EXPIRED':
        return 'bg-gray-50 border-gray-200'
      default:
        return 'bg-amber-50 border-amber-200'
    }
  }

  const getSuggestionBadgeColor = (status: string, suggestedAt: string) => {
    const isExpired = status === 'PENDING' && new Date(suggestedAt) < new Date()
    if (isExpired) return 'bg-gray-100 text-gray-700'
    switch (status) {
      case 'ACCEPTED':
        return 'bg-green-100 text-green-700'
      case 'REJECTED':
        return 'bg-red-100 text-red-700'
      case 'EXPIRED':
        return 'bg-gray-100 text-gray-700'
      default:
        return 'bg-amber-100 text-amber-700'
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Visit Schedule"
          subtitle="Manage your clients' scheduled house visits"
          icon={<CalendarIcon />}
        />
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-4" />
                <div className="space-y-3">
                  <div className="h-16 bg-gray-200 rounded" />
                  <div className="h-16 bg-gray-200 rounded" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Visit Schedule"
          subtitle="Manage your clients' scheduled house visits"
          icon={<CalendarIcon />}
        />
        <NetworkError onRetry={fetchData} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visit Schedule"
        subtitle="Manage your clients' scheduled house visits"
        icon={<CalendarIcon />}
        stats={[
          { label: 'Scheduled', value: scheduledCount },
          { label: 'Completed', value: completedCount },
          { label: 'Pending Suggestions', value: pendingSuggestionsCount },
        ]}
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('visits')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'visits'
              ? 'border-[#006AFF] text-[#006AFF]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Visits ({visits.length})
        </button>
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'suggestions'
              ? 'border-[#006AFF] text-[#006AFF]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Sent Suggestions ({suggestions.length})
          {pendingSuggestionsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">
              {pendingSuggestionsCount} pending
            </span>
          )}
        </button>
      </div>

      {/* Visits Tab */}
      {activeTab === 'visits' && (
        <>
          {sortedDates.length === 0 ? (
            <Card className="text-center py-12 mt-0">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No scheduled visits</h3>
              <p className="text-gray-500">
                Your clients haven&apos;t scheduled any visits yet.
              </p>
            </Card>
          ) : (
            <div className="space-y-6">
              {sortedDates.map((dateKey) => {
                const dayVisits = groupedVisits[dateKey]
                const date = parseISO(dateKey)

                return (
                  <Card key={dateKey}>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      {format(date, 'EEEE, MMMM d, yyyy')}
                    </h2>
                    <div className="space-y-3">
                      {dayVisits
                        .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
                        .map((visit) => (
                          <Link
                            key={visit.id}
                            href={`/realtor/houses/${visit.house.id}`}
                            className={`flex items-center justify-between p-4 rounded-lg border transition-colors hover:border-gray-300 ${getStatusColor(visit.status)}`}
                          >
                            <div className="flex items-center gap-4">
                              <div
                                className={`w-16 text-center py-1 rounded font-medium text-sm ${getStatusBadgeColor(visit.status)}`}
                              >
                                {format(parseISO(visit.scheduledAt), 'h:mm a')}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{visit.house.address}</p>
                                <p className="text-sm text-gray-500">
                                  {visit.house.city}, {visit.house.state}
                                  {visit.house.bedrooms && ` - ${visit.house.bedrooms} bed`}
                                  {visit.house.bathrooms && `, ${visit.house.bathrooms} bath`}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  Client: {visit.buyer.name}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {visit.recordingCount > 0 && (
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
                                  </svg>
                                  {visit.recordingCount}
                                </span>
                              )}
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(visit.status)}`}
                              >
                                {visit.status.charAt(0) + visit.status.slice(1).toLowerCase().replace('_', ' ')}
                              </span>
                            </div>
                          </Link>
                        ))}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Suggestions Tab */}
      {activeTab === 'suggestions' && (
        <>
          {sortedSuggestionDates.length === 0 ? (
            <Card className="text-center py-12 mt-0">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No suggestions sent</h3>
              <p className="text-gray-500">
                You haven&apos;t sent any visit suggestions to your clients yet.
              </p>
            </Card>
          ) : (
            <div className="space-y-6">
              {sortedSuggestionDates.map((dateKey) => {
                const daySuggestions = groupedSuggestions[dateKey]
                const date = parseISO(dateKey)

                return (
                  <Card key={dateKey}>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      {format(date, 'EEEE, MMMM d, yyyy')}
                    </h2>
                    <div className="space-y-3">
                      {daySuggestions
                        .sort((a, b) => a.suggestedAt.localeCompare(b.suggestedAt))
                        .map((suggestion) => {
                          const isExpired = suggestion.status === 'PENDING' && new Date(suggestion.suggestedAt) < new Date()
                          const displayStatus = isExpired ? 'Expired' : suggestion.status

                          return (
                            <div
                              key={suggestion.id}
                              className={`flex items-center justify-between p-4 rounded-lg border ${getSuggestionStatusColor(suggestion.status, suggestion.suggestedAt)}`}
                            >
                              <div className="flex items-center gap-4">
                                <div
                                  className={`w-16 text-center py-1 rounded font-medium text-sm ${getSuggestionBadgeColor(suggestion.status, suggestion.suggestedAt)}`}
                                >
                                  {format(parseISO(suggestion.suggestedAt), 'h:mm a')}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{suggestion.house.address}</p>
                                  <p className="text-sm text-gray-500">
                                    {suggestion.house.city}, {suggestion.house.state}
                                    {suggestion.house.bedrooms && ` - ${suggestion.house.bedrooms} bed`}
                                    {suggestion.house.bathrooms && `, ${suggestion.house.bathrooms} bath`}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    Sent to: {suggestion.buyer.name}
                                    {suggestion.message && ` • "${suggestion.message}"`}
                                  </p>
                                </div>
                              </div>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${getSuggestionBadgeColor(suggestion.status, suggestion.suggestedAt)}`}
                              >
                                {displayStatus.charAt(0) + displayStatus.slice(1).toLowerCase()}
                              </span>
                            </div>
                          )
                        })}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
