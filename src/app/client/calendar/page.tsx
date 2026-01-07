'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { startOfMonth, endOfMonth, format, addHours } from 'date-fns'
import Calendar, { CalendarEvent, CalendarSkeleton } from '@/components/Calendar'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { NetworkError } from '@/components/ui/ErrorState'
import { SlotInfo } from 'react-big-calendar'

interface House {
  id: string
  address: string
  city: string
  state: string
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

  // Fetch houses for new visit modal
  const fetchHouses = useCallback(async () => {
    setLoadingHouses(true)
    try {
      const response = await fetch('/api/houses?limit=100')
      const data = await response.json()

      if (response.ok) {
        setHouses(data.data.items.map((hb: any) => hb.house))
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
  }, [fetchEvents])

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visit Calendar</h1>
          <p className="text-gray-600">Schedule and manage your house visits</p>
        </div>

        <Button
          onClick={() => {
            setSelectedSlot(addHours(new Date(), 1))
            setNewVisitDate(format(new Date(), 'yyyy-MM-dd'))
            setNewVisitTime('10:00')
            setShowNewVisitModal(true)
            fetchHouses()
          }}
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Schedule Visit
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">Total Visits</div>
          </div>
          <div className="bg-white rounded-lg p-4" style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: '#BBDEFB' }}>
            <div className="text-2xl font-bold" style={{ color: '#006AFF' }}>{stats.scheduled}</div>
            <div className="text-sm text-gray-500">Scheduled</div>
          </div>
          <div className="bg-white rounded-lg border border-amber-200 p-4">
            <div className="text-2xl font-bold text-amber-600">{stats.inProgress}</div>
            <div className="text-sm text-gray-500">In Progress</div>
          </div>
          <div className="bg-white rounded-lg border border-green-200 p-4">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-500">Completed</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-400">{stats.cancelled}</div>
            <div className="text-sm text-gray-500">Cancelled</div>
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
