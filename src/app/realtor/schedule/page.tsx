'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import Calendar, { CalendarEvent, CalendarSkeleton } from '@/components/Calendar'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { NetworkError } from '@/components/ui/ErrorState'
import PageHeader, { CalendarIcon } from '@/components/ui/PageHeader'

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

interface VisitSuggestion {
  id: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
  suggestedAt: string
  message: string | null
  createdAt: string
  isExpired?: boolean
  house: House
  buyer: Buyer
}

interface VisitStats {
  total: number
  scheduled: number
  inProgress: number
  completed: number
  cancelled: number
}

export default function RealtorSchedule() {
  const router = useRouter()

  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [stats, setStats] = useState<VisitStats | null>(null)
  const [suggestions, setSuggestions] = useState<VisitSuggestion[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showEventModal, setShowEventModal] = useState(false)

  // Fetch calendar events
  const fetchEvents = useCallback(async (start: Date, end: Date) => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        start: start.toISOString(),
        end: end.toISOString(),
      })

      const response = await fetch(`/api/visits/calendar?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch events')
      }

      setEvents(data.data.events)
      setStats(data.data.stats)
    } catch (err) {
      console.error('Fetch events error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load calendar')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch pending suggestions (sent by realtor)
  const fetchSuggestions = useCallback(async () => {
    setLoadingSuggestions(true)
    try {
      const response = await fetch('/api/visits/suggestions')
      const data = await response.json()

      if (response.ok) {
        const suggestionsArray = data.data?.items || data.data || []
        // Filter only pending suggestions
        const pendingSuggestions = suggestionsArray.filter(
          (s: VisitSuggestion) => s.status === 'PENDING' && !s.isExpired
        )
        setSuggestions(pendingSuggestions)
      }
    } catch (err) {
      console.error('Fetch suggestions error:', err)
    } finally {
      setLoadingSuggestions(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    const now = new Date()
    fetchEvents(startOfMonth(now), endOfMonth(now))
    fetchSuggestions()
  }, [fetchEvents, fetchSuggestions])

  // Handle range change
  const handleRangeChange = useCallback(
    (start: Date, end: Date) => {
      fetchEvents(start, end)
    },
    [fetchEvents]
  )

  // Handle event click
  const handleEventClick = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event)
    setShowEventModal(true)
  }, [])

  // Handle view visit details
  const handleViewVisit = (houseId: string) => {
    // Find the houseBuyerId for this visit
    router.push(`/realtor/houses/${houseId}`)
  }

  const pendingSuggestionsCount = suggestions.length

  if (error) {
    return (
      <div className="p-6">
        <NetworkError onRetry={() => {
          const now = new Date()
          fetchEvents(startOfMonth(now), endOfMonth(now))
        }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Visit Schedule"
        subtitle="Manage your clients' scheduled house visits"
        icon={<CalendarIcon />}
        stats={stats ? [
          { label: 'Total', value: stats.total },
          { label: 'Scheduled', value: stats.scheduled },
          { label: 'In Progress', value: stats.inProgress },
          { label: 'Completed', value: stats.completed },
        ] : undefined}
      />

      {/* Pending Suggestions Sent */}
      {!loadingSuggestions && pendingSuggestionsCount > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-100 rounded-lg">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Pending Suggestions</h2>
              <p className="text-sm text-gray-600">You have {pendingSuggestionsCount} suggestion{pendingSuggestionsCount !== 1 ? 's' : ''} awaiting client response</p>
            </div>
          </div>

          <div className="space-y-3">
            {suggestions.slice(0, 3).map((suggestion) => (
              <div key={suggestion.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex gap-4">
                  {/* House Image */}
                  {suggestion.house.images?.[0] && (
                    <img
                      src={suggestion.house.images[0]}
                      alt={suggestion.house.address}
                      className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    {/* House Info */}
                    <h3 className="font-medium text-gray-900 truncate">{suggestion.house.address}</h3>
                    <p className="text-sm text-gray-500">{suggestion.house.city}, {suggestion.house.state}</p>

                    {/* Suggested Date */}
                    <div className="flex items-center gap-2 mt-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700">
                        {format(new Date(suggestion.suggestedAt), 'PPP')} at {format(new Date(suggestion.suggestedAt), 'p')}
                      </span>
                    </div>

                    {/* Client Info */}
                    <p className="text-xs text-gray-500 mt-1">
                      Sent to: <span className="font-medium">{suggestion.buyer.name}</span>
                    </p>
                  </div>

                  {/* Status Badge */}
                  <div className="flex-shrink-0">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      Awaiting Response
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pendingSuggestionsCount > 3 && (
            <p className="text-sm text-gray-500 mt-3 text-center">
              And {pendingSuggestionsCount - 3} more pending suggestion{pendingSuggestionsCount - 3 !== 1 ? 's' : ''}...
            </p>
          )}
        </div>
      )}

      {/* Calendar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 relative">
        {loading && events.length === 0 ? (
          <CalendarSkeleton />
        ) : (
          <Calendar
            events={events}
            onEventClick={handleEventClick}
            onRangeChange={handleRangeChange}
            loading={loading}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#006AFF]" />
          <span className="text-gray-600">Scheduled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-gray-600">In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-gray-600">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-400" />
          <span className="text-gray-600">Cancelled</span>
        </div>
      </div>

      {/* Event Detail Modal */}
      <Modal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        title="Visit Details"
        size="md"
      >
        {selectedEvent && (
          <div className="space-y-4">
            {/* House image */}
            {selectedEvent.extendedProps?.house.images?.[0] && (
              <img
                src={selectedEvent.extendedProps.house.images[0]}
                alt={selectedEvent.extendedProps.house.address}
                className="w-full h-48 object-cover rounded-lg"
              />
            )}

            {/* House info */}
            <div>
              <h3 className="font-semibold text-lg">{selectedEvent.extendedProps?.house.address}</h3>
              <p className="text-gray-600">
                {selectedEvent.extendedProps?.house.city}, {selectedEvent.extendedProps?.house.state}
              </p>
              {selectedEvent.extendedProps?.house.price && (
                <p className="text-lg font-bold" style={{ color: '#006AFF' }}>
                  ${selectedEvent.extendedProps.house.price.toLocaleString()}
                </p>
              )}
            </div>

            {/* Client */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-500">Client</p>
              <p className="font-medium">{selectedEvent.extendedProps?.buyer.name}</p>
              <p className="text-sm text-gray-500">{selectedEvent.extendedProps?.buyer.email}</p>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-sm font-medium ${
                selectedEvent.extendedProps?.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
                selectedEvent.extendedProps?.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800' :
                selectedEvent.extendedProps?.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {selectedEvent.extendedProps?.status}
              </span>

              {selectedEvent.extendedProps?.overallImpression && (
                <span className="px-2 py-1 rounded text-sm font-medium bg-purple-100 text-purple-800">
                  {selectedEvent.extendedProps.overallImpression}
                </span>
              )}
            </div>

            {/* Schedule info */}
            <div className="text-sm text-gray-600">
              <p><strong>Scheduled:</strong> {format(selectedEvent.start, 'PPP p')}</p>
              {selectedEvent.extendedProps?.startedAt && (
                <p><strong>Started:</strong> {format(new Date(selectedEvent.extendedProps.startedAt), 'PPP p')}</p>
              )}
              {selectedEvent.extendedProps?.completedAt && (
                <p><strong>Completed:</strong> {format(new Date(selectedEvent.extendedProps.completedAt), 'PPP p')}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={() => handleViewVisit(selectedEvent.extendedProps?.house.id || '')}
                variant="primary"
              >
                View House Details
              </Button>
              <Button
                onClick={() => setShowEventModal(false)}
                variant="outline"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
