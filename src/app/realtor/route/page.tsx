'use client'

import { useState, useEffect, useCallback } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { NetworkError } from '@/components/ui/ErrorState'
import PageHeader, { RouteIcon } from '@/components/ui/PageHeader'
import { format, parseISO, startOfDay, endOfDay, addDays } from 'date-fns'

interface House {
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

interface Buyer {
  id: string
  name: string
  email: string
}

interface Visit {
  id: string
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  scheduledAt: string
  house: House
  buyer: Buyer
}

export default function RealtorRoute() {
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Fetch upcoming scheduled visits
  const fetchVisits = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch next 14 days of visits
      const now = new Date()
      const end = addDays(now, 14)

      const params = new URLSearchParams({
        status: 'SCHEDULED',
        from: now.toISOString(),
        to: end.toISOString(),
        limit: '100',
      })

      const response = await fetch(`/api/visits?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch visits')
      }

      const fetchedVisits = data.data.items || []
      setVisits(fetchedVisits)

      // Set default selected date to first date with visits
      if (fetchedVisits.length > 0 && !selectedDate) {
        const firstDate = format(parseISO(fetchedVisits[0].scheduledAt), 'yyyy-MM-dd')
        setSelectedDate(firstDate)
      }
    } catch (err) {
      console.error('Fetch visits error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load visits')
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    fetchVisits()
  }, [])

  // Get unique dates
  const uniqueDates = [...new Set(visits.map((v) => format(parseISO(v.scheduledAt), 'yyyy-MM-dd')))].sort()

  // Get visits for selected date
  const visitsForDate = visits
    .filter((v) => format(parseISO(v.scheduledAt), 'yyyy-MM-dd') === selectedDate)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))

  // Houses for route
  const housesForRoute = visitsForDate.map((v) => ({
    house: v.house,
    visit: v,
  }))

  // Generate Google Maps URL
  const generateGoogleMapsUrl = () => {
    if (housesForRoute.length === 0) return ''

    const addresses = housesForRoute.map((item) =>
      encodeURIComponent(`${item.house.address}, ${item.house.city}, ${item.house.state} ${item.house.zipCode}`)
    )

    if (addresses.length === 1) {
      return `https://www.google.com/maps/search/?api=1&query=${addresses[0]}`
    }

    const origin = addresses[0]
    const destination = addresses[addresses.length - 1]
    const waypoints = addresses.slice(1, -1).join('|')

    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ''}`
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Plan Route"
          subtitle="Optimize your visit route for the day"
          icon={<RouteIcon />}
        />
        <div className="animate-pulse">
          <div className="flex gap-2 mb-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded-lg w-24" />
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded-xl" />
            <div className="h-64 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Plan Route"
          subtitle="Optimize your visit route for the day"
          icon={<RouteIcon />}
        />
        <NetworkError onRetry={fetchVisits} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plan Route"
        subtitle="Optimize your visit route for the day"
        icon={<RouteIcon />}
        stats={visits.length > 0 ? [
          { label: 'Days with Visits', value: uniqueDates.length },
          { label: 'Total Visits', value: visits.length },
        ] : undefined}
      />

      {uniqueDates.length === 0 ? (
        <Card className="text-center py-12">
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
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No upcoming visits</h3>
          <p className="text-gray-500">
            There are no scheduled visits to plan a route for.
          </p>
        </Card>
      ) : (
        <>
          {/* Date Selection */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {uniqueDates.map((date) => (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
                style={
                  selectedDate === date
                    ? { background: '#E3F2FD', color: '#006AFF' }
                    : { background: '#F3F4F6', color: '#4B5563' }
                }
              >
                {format(parseISO(date), 'EEE, MMM d')}
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Map Preview */}
            <Card padding="none" className="overflow-hidden">
              <div className="bg-gray-200 h-64 md:h-full min-h-[300px] flex items-center justify-center relative">
                {/* Mock Map Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-blue-100">
                  <svg className="w-full h-full opacity-20" viewBox="0 0 100 100">
                    <path
                      d="M10,50 Q30,20 50,50 T90,50"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="0.5"
                    />
                    <path
                      d="M20,30 Q40,60 60,30 T100,30"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="0.5"
                    />
                    <path
                      d="M0,70 Q20,40 40,70 T80,70"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="0.5"
                    />
                  </svg>
                </div>
                <div className="relative z-10 text-center p-4">
                  <svg
                    className="w-16 h-16 text-gray-400 mx-auto mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                    />
                  </svg>
                  <p className="text-gray-500 text-sm">Map preview</p>
                  <p className="text-gray-400 text-xs">{housesForRoute.length} stops</p>
                </div>
              </div>
            </Card>

            {/* Route List */}
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Route Order</h2>

              {housesForRoute.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No visits scheduled for this date</p>
              ) : (
                <>
                  <div className="space-y-3 mb-6">
                    {housesForRoute.map(({ house, visit }, index) => (
                      <div key={house.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 text-white rounded-full flex items-center justify-center font-bold text-sm" style={{ background: '#006AFF' }}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{house.address}</p>
                          <p className="text-sm text-gray-500">
                            {house.city}, {house.state}
                          </p>
                          <p className="text-xs text-gray-400">
                            Client: {visit.buyer.name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {format(parseISO(visit.scheduledAt), 'h:mm a')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => window.open(generateGoogleMapsUrl(), '_blank')}
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    Open in Google Maps
                  </Button>
                </>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
