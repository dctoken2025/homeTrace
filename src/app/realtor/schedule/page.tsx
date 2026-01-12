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

export default function RealtorSchedule() {
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch visits
  const fetchVisits = useCallback(async () => {
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

      const response = await fetch(`/api/visits?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch visits')
      }

      setVisits(data.data.items || [])
    } catch (err) {
      console.error('Fetch visits error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load visits')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVisits()
  }, [fetchVisits])

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
        <NetworkError onRetry={fetchVisits} />
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
          { label: 'Total', value: visits.length },
        ]}
      />

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
            Your clients haven't scheduled any visits yet.
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
    </div>
  )
}
