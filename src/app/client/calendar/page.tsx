'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { startOfMonth, endOfMonth, format, addHours } from 'date-fns'
import Calendar, { CalendarEvent, CalendarSkeleton } from '@/components/Calendar'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { NetworkError } from '@/components/ui/ErrorState'
import PageHeader, { CalendarIcon, PlusIcon } from '@/components/ui/PageHeader'
import { SlotInfo } from 'react-big-calendar'

interface House {
  id: string
  address: string
  city: string
  state: string
  images?: string[]
  price?: number
}

interface VisitSuggestion {
  id: string
  status: string
  suggestedAt: string
  message: string | null
  createdAt: string
  isExpired: boolean
  house: {
    id: string
    address: string
    city: string
    state: string
    zipCode: string
    price: number | null
    bedrooms: number | null
    bathrooms: number | null
    images: string[]
  }
  suggestedByRealtor: {
    id: string
    name: string
    email: string
  }
}

interface VisitStats {
  total: number
  scheduled: number
  inProgress: number
  completed: number
  cancelled: number
}

export default function CalendarPage() {
  const router = useRouter()
  const { success, error: showError, warning } = useToast()

  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [stats, setStats] = useState<VisitStats | null>(null)
  const [suggestions, setSuggestions] = useState<VisitSuggestion[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showEventModal, setShowEventModal] = useState(false)
  const [showNewVisitModal, setShowNewVisitModal] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null)

  // New visit form
  const [houses, setHouses] = useState<House[]>([])
  const [loadingHouses, setLoadingHouses] = useState(false)
  const [newVisitHouseId, setNewVisitHouseId] = useState('')
  const [newVisitDate, setNewVisitDate] = useState('')
  const [newVisitTime, setNewVisitTime] = useState('10:00')
  const [newVisitNotes, setNewVisitNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

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

  // Fetch pending suggestions
  const fetchSuggestions = useCallback(async () => {
    setLoadingSuggestions(true)
    try {
      const response = await fetch('/api/visits/suggestions?status=PENDING')
      const data = await response.json()

      if (response.ok) {
        // Filter out expired suggestions
        const suggestionsArray = data.data?.items || data.data || []
        const pendingSuggestions = suggestionsArray.filter(
          (s: VisitSuggestion) => !s.isExpired && s.status === 'PENDING'
        )
        setSuggestions(pendingSuggestions)
      }
    } catch (err) {
      console.error('Fetch suggestions error:', err)
    } finally {
      setLoadingSuggestions(false)
    }
  }, [])

  // Fetch houses for new visit modal
  const fetchHouses = useCallback(async () => {
    setLoadingHouses(true)
    try {
      const response = await fetch('/api/houses?limit=100')
      const data = await response.json()

      if (response.ok) {
        const housesArray = data.data?.items || data.data || []
        setHouses(housesArray.map((hb: any) => hb.house))
      }
    } catch (err) {
      console.error('Fetch houses error:', err)
    } finally {
      setLoadingHouses(false)
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

  // Handle slot select (new visit)
  const handleSlotSelect = useCallback(
    (slotInfo: SlotInfo) => {
      const selectedDate = slotInfo.start
      // Don't allow scheduling in the past
      if (selectedDate < new Date()) {
        warning('Invalid Date', 'Cannot schedule a visit in the past')
        return
      }

      setSelectedSlot(selectedDate)
      setNewVisitDate(format(selectedDate, 'yyyy-MM-dd'))
      setNewVisitTime(format(selectedDate, 'HH:mm'))
      setShowNewVisitModal(true)
      fetchHouses()
    },
    [fetchHouses, warning]
  )

  // Handle create visit
  const handleCreateVisit = async () => {
    if (!newVisitHouseId) {
      warning('Select a house', 'Please select a house for the visit')
      return
    }

    setSubmitting(true)

    try {
      const scheduledAt = new Date(`${newVisitDate}T${newVisitTime}:00`)

      const response = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          houseId: newVisitHouseId,
          scheduledAt: scheduledAt.toISOString(),
          notes: newVisitNotes || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create visit')
      }

      success('Visit Scheduled', `Visit scheduled for ${format(scheduledAt, 'PPP p')}`)

      // Refresh calendar
      const now = new Date()
      fetchEvents(startOfMonth(now), endOfMonth(now))

      // Close modal and reset form
      setShowNewVisitModal(false)
      setNewVisitHouseId('')
      setNewVisitDate('')
      setNewVisitTime('10:00')
      setNewVisitNotes('')
    } catch (err) {
      showError('Error', err instanceof Error ? err.message : 'Failed to create visit')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle start visit
  const handleStartVisit = async (visitId: string) => {
    try {
      const response = await fetch(`/api/visits/${visitId}/start`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to start visit')
      }

      success('Visit Started', 'Good luck with your visit!')

      // Navigate to visit page
      router.push(`/client/house/${selectedEvent?.extendedProps?.house.id}/visit?visitId=${visitId}`)
    } catch (err) {
      showError('Error', err instanceof Error ? err.message : 'Failed to start visit')
    }
  }

  // Handle view visit
  const handleViewVisit = (visitId: string, houseId: string) => {
    router.push(`/client/house/${houseId}/visit?visitId=${visitId}`)
  }

  // Handle accept suggestion
  const handleAcceptSuggestion = async (suggestionId: string) => {
    try {
      const response = await fetch(`/api/visits/suggestions/${suggestionId}/accept`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to accept suggestion')
      }

      success('Visit Scheduled', 'The visit has been added to your calendar!')

      // Refresh calendar and suggestions
      const now = new Date()
      fetchEvents(startOfMonth(now), endOfMonth(now))
      fetchSuggestions()
    } catch (err) {
      showError('Error', err instanceof Error ? err.message : 'Failed to accept suggestion')
    }
  }

  // Handle reject suggestion
  const handleRejectSuggestion = async (suggestionId: string, reason?: string) => {
    try {
      const response = await fetch(`/api/visits/suggestions/${suggestionId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to decline suggestion')
      }

      success('Suggestion Declined', 'The realtor will be notified.')
      fetchSuggestions()
    } catch (err) {
      showError('Error', err instanceof Error ? err.message : 'Failed to decline suggestion')
    }
  }

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
        title="Visit Calendar"
        subtitle="Schedule and manage your house visits"
        icon={<CalendarIcon />}
        stats={stats ? [
          { label: 'Total', value: stats.total },
          { label: 'Scheduled', value: stats.scheduled },
          { label: 'In Progress', value: stats.inProgress },
          { label: 'Completed', value: stats.completed },
        ] : undefined}
        action={{
          label: 'Schedule Visit',
          icon: <PlusIcon />,
          onClick: () => {
            setSelectedSlot(addHours(new Date(), 1))
            setNewVisitDate(format(new Date(), 'yyyy-MM-dd'))
            setNewVisitTime('10:00')
            setShowNewVisitModal(true)
            fetchHouses()
          },
        }}
      />

      {/* Pending Suggestions */}
      {!loadingSuggestions && suggestions.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Pending Visit Suggestions</h2>
              <p className="text-sm text-gray-600">Your realtor has suggested {suggestions.length} visit{suggestions.length !== 1 ? 's' : ''} for you</p>
            </div>
          </div>

          <div className="space-y-4">
            {suggestions.map((suggestion) => (
              <div key={suggestion.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex gap-4">
                  {/* House Image */}
                  {suggestion.house.images?.[0] && (
                    <img
                      src={suggestion.house.images[0]}
                      alt={suggestion.house.address}
                      className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    {/* House Info */}
                    <h3 className="font-medium text-gray-900 truncate">{suggestion.house.address}</h3>
                    <p className="text-sm text-gray-500">{suggestion.house.city}, {suggestion.house.state}</p>

                    {/* Price and Details */}
                    <div className="flex items-center gap-2 mt-1 text-sm">
                      {suggestion.house.price && (
                        <span className="font-semibold text-[#006AFF]">
                          ${suggestion.house.price.toLocaleString()}
                        </span>
                      )}
                      {suggestion.house.bedrooms && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="text-gray-600">{suggestion.house.bedrooms} bd</span>
                        </>
                      )}
                      {suggestion.house.bathrooms && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="text-gray-600">{suggestion.house.bathrooms} ba</span>
                        </>
                      )}
                    </div>

                    {/* Suggested Date */}
                    <div className="flex items-center gap-2 mt-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700">
                        {format(new Date(suggestion.suggestedAt), 'PPP')} at {format(new Date(suggestion.suggestedAt), 'p')}
                      </span>
                    </div>

                    {/* Realtor Info */}
                    <p className="text-xs text-gray-500 mt-1">
                      Suggested by <span className="font-medium">{suggestion.suggestedByRealtor.name}</span>
                    </p>

                    {/* Message */}
                    {suggestion.message && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-600 italic">
                        &ldquo;{suggestion.message}&rdquo;
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleAcceptSuggestion(suggestion.id)}
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejectSuggestion(suggestion.id)}
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Decline
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
            onSlotSelect={handleSlotSelect}
            onRangeChange={handleRangeChange}
            loading={loading}
          />
        )}
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
              {selectedEvent.extendedProps?.status === 'SCHEDULED' && (
                <Button
                  onClick={() => handleStartVisit(selectedEvent.id)}
                  variant="primary"
                >
                  Start Visit
                </Button>
              )}
              {(selectedEvent.extendedProps?.status === 'IN_PROGRESS' ||
                selectedEvent.extendedProps?.status === 'COMPLETED') && (
                <Button
                  onClick={() => handleViewVisit(
                    selectedEvent.id,
                    selectedEvent.extendedProps?.house.id || ''
                  )}
                  variant="primary"
                >
                  View Visit
                </Button>
              )}
              <Button
                onClick={() => router.push(`/client/houses/${selectedEvent.extendedProps?.house.id}`)}
                variant="outline"
              >
                View House
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* New Visit Modal */}
      <Modal
        isOpen={showNewVisitModal}
        onClose={() => setShowNewVisitModal(false)}
        title="Schedule New Visit"
        size="md"
      >
        <div className="space-y-4">
          {/* House selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select House *
            </label>
            {loadingHouses ? (
              <div className="h-10 bg-gray-100 rounded animate-pulse" />
            ) : (
              <select
                value={newVisitHouseId}
                onChange={(e) => setNewVisitHouseId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': '#006AFF' } as React.CSSProperties}
              >
                <option value="">Choose a house...</option>
                {houses.map((house) => (
                  <option key={house.id} value={house.id}>
                    {house.address}, {house.city}, {house.state}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date *
            </label>
            <input
              type="date"
              value={newVisitDate}
              onChange={(e) => setNewVisitDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time *
            </label>
            <input
              type="time"
              value={newVisitTime}
              onChange={(e) => setNewVisitTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={newVisitNotes}
              onChange={(e) => setNewVisitNotes(e.target.value)}
              rows={3}
              placeholder="Any notes for this visit..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={handleCreateVisit}
              isLoading={submitting}
              disabled={!newVisitHouseId || !newVisitDate || !newVisitTime}
            >
              Schedule Visit
            </Button>
            <Button
              onClick={() => setShowNewVisitModal(false)}
              variant="outline"
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
