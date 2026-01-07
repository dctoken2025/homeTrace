'use client'

import { useState, useCallback, useMemo } from 'react'
import { Calendar as BigCalendar, dateFnsLocalizer, Views, SlotInfo } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'

// Localization setup
const locales = { 'en-US': enUS }
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
})

// Types
export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  color?: string
  extendedProps?: {
    status: string
    house: {
      id: string
      address: string
      city: string
      state: string
      price: number | null
      images: string[]
    }
    buyer: {
      id: string
      name: string
      email: string
    }
    overallImpression?: string
    wouldBuy?: boolean
    startedAt?: string
    completedAt?: string
  }
}

interface CalendarProps {
  events: CalendarEvent[]
  onEventClick?: (event: CalendarEvent) => void
  onSlotSelect?: (slotInfo: SlotInfo) => void
  onRangeChange?: (start: Date, end: Date) => void
  loading?: boolean
  className?: string
}

// Custom event component
function EventComponent({ event }: { event: CalendarEvent }) {
  const statusColors: Record<string, string> = {
    SCHEDULED: 'bg-[#006AFF]',
    IN_PROGRESS: 'bg-amber-500',
    COMPLETED: 'bg-green-500',
    CANCELLED: 'bg-gray-400',
  }

  const status = event.extendedProps?.status || 'SCHEDULED'
  const bgColor = statusColors[status] || 'bg-[#006AFF]'

  return (
    <div
      className={`${bgColor} text-white text-xs p-1 rounded truncate`}
      title={event.title}
    >
      {event.title}
    </div>
  )
}

// Custom toolbar component
function Toolbar({
  date,
  onNavigate,
  onView,
  view,
}: {
  date: Date
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void
  onView: (view: string) => void
  view: string
}) {
  const viewLabels: Record<string, string> = {
    month: 'Month',
    week: 'Week',
    day: 'Day',
    agenda: 'Agenda',
  }

  return (
    <div className="flex items-center justify-between mb-4 px-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onNavigate('TODAY')}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#006AFF]"
        >
          Today
        </button>
        <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
          <button
            onClick={() => onNavigate('PREV')}
            className="px-2 py-1.5 text-gray-600 hover:bg-gray-100"
            aria-label="Previous"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => onNavigate('NEXT')}
            className="px-2 py-1.5 text-gray-600 hover:bg-gray-100"
            aria-label="Next"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-gray-900">
        {format(date, 'MMMM yyyy')}
      </h2>

      <div className="flex items-center gap-1 border border-gray-300 rounded-md overflow-hidden">
        {['month', 'week', 'day', 'agenda'].map((v) => (
          <button
            key={v}
            onClick={() => onView(v)}
            className={`px-3 py-1.5 text-sm font-medium ${
              view === v
                ? 'bg-[#006AFF] text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {viewLabels[v]}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Calendar({
  events,
  onEventClick,
  onSlotSelect,
  onRangeChange,
  loading = false,
  className = '',
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'month' | 'week' | 'day' | 'agenda'>('month')

  // Transform events to have Date objects
  const calendarEvents = useMemo(() => {
    return events.map((event) => ({
      ...event,
      start: new Date(event.start),
      end: new Date(event.end),
    }))
  }, [events])

  // Handle navigation
  const handleNavigate = useCallback(
    (action: 'PREV' | 'NEXT' | 'TODAY') => {
      let newDate: Date
      if (action === 'TODAY') {
        newDate = new Date()
      } else if (action === 'PREV') {
        newDate = subMonths(currentDate, 1)
      } else {
        newDate = addMonths(currentDate, 1)
      }
      setCurrentDate(newDate)

      // Notify parent of range change
      if (onRangeChange) {
        const start = startOfMonth(newDate)
        const end = endOfMonth(newDate)
        onRangeChange(start, end)
      }
    },
    [currentDate, onRangeChange]
  )

  // Handle view change
  const handleViewChange = useCallback((newView: string) => {
    setView(newView as 'month' | 'week' | 'day' | 'agenda')
  }, [])

  // Handle event click
  const handleEventClick = useCallback(
    (event: CalendarEvent) => {
      if (onEventClick) {
        onEventClick(event)
      }
    },
    [onEventClick]
  )

  // Handle slot select (clicking on empty slot)
  const handleSlotSelect = useCallback(
    (slotInfo: SlotInfo) => {
      if (onSlotSelect) {
        onSlotSelect(slotInfo)
      }
    },
    [onSlotSelect]
  )

  // Custom event style
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    return {
      style: {
        backgroundColor: event.color || '#006AFF',
        borderRadius: '4px',
        opacity: 1,
        color: 'white',
        border: 'none',
        display: 'block',
      },
    }
  }, [])

  return (
    <div className={`calendar-container ${className}`}>
      {loading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#006AFF]" />
        </div>
      )}

      <BigCalendar
        localizer={localizer}
        events={calendarEvents}
        startAccessor="start"
        endAccessor="end"
        date={currentDate}
        view={view}
        onNavigate={(date) => setCurrentDate(date)}
        onView={handleViewChange}
        onSelectEvent={handleEventClick}
        onSelectSlot={handleSlotSelect}
        selectable
        eventPropGetter={eventStyleGetter}
        components={{
          toolbar: (props) => (
            <Toolbar
              date={props.date}
              onNavigate={handleNavigate}
              onView={handleViewChange}
              view={view}
            />
          ),
          event: EventComponent,
        }}
        style={{ height: 600 }}
        views={['month', 'week', 'day', 'agenda']}
        popup
        showMultiDayTimes
      />

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-[#006AFF]" />
          <span>Scheduled</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-amber-500" />
          <span>In Progress</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-500" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-gray-400" />
          <span>Cancelled</span>
        </div>
      </div>
    </div>
  )
}

// Loading skeleton for calendar
export function CalendarSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-8 w-20 bg-gray-200 rounded" />
        <div className="h-6 w-32 bg-gray-200 rounded" />
        <div className="h-8 w-48 bg-gray-200 rounded" />
      </div>

      <div className="border border-gray-200 rounded-lg">
        {/* Header row */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-2 text-center text-gray-400 text-sm">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {[...Array(5)].map((_, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-b border-gray-200 last:border-b-0">
            {[...Array(7)].map((_, dayIndex) => (
              <div
                key={dayIndex}
                className="h-24 p-1 border-r border-gray-200 last:border-r-0"
              >
                <div className="h-4 w-4 bg-gray-200 rounded mb-1" />
                {weekIndex % 2 === 0 && dayIndex % 3 === 0 && (
                  <div className="h-5 w-full bg-gray-200 rounded" />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
