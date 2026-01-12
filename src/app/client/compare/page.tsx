'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import AudioTimeline from '@/components/audio/AudioTimeline'
import { NetworkError } from '@/components/ui/ErrorState'
import { useToast } from '@/components/ui/Toast'
import PageHeader, { CompareIcon } from '@/components/ui/PageHeader'
import { DEFAULT_ROOMS, IMPRESSION_EMOJIS } from '@/types'

interface House {
  id: string
  address: string
  city: string
  state: string
  price: number | null
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  images: string[]
  isFavorite?: boolean
}

interface Recording {
  id: string
  roomId: string
  roomName: string
  audioUrl: string | null
  duration: number | null
  status: string
  transcript: string | null
  sentiment: string | null
  keyPoints: string[] | null
  recordedAt: string
}

interface Visit {
  id: string
  houseId: string
  visitedAt: string
  completedAt: string | null
  overallImpression: string | null
  wouldBuy: boolean | null
  notes: string | null
  house: House
  recordings: Recording[]
}

interface CompareData {
  visitedHouses: House[]
  visits: Visit[]
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price)
}

export default function ComparePage() {
  const { error: showError } = useToast()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [visitedHouses, setVisitedHouses] = useState<House[]>([])
  const [visits, setVisits] = useState<Visit[]>([])

  const [selectedHouses, setSelectedHouses] = useState<string[]>([])
  const [selectedRoom, setSelectedRoom] = useState<string>('all')

  // Fetch compare data
  const fetchCompareData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/visits/compare')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to load comparison data')
      }

      setVisitedHouses(data.data.visitedHouses || [])
      setVisits(data.data.visits || [])
    } catch (err) {
      console.error('Fetch compare error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load comparison data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCompareData()
  }, [fetchCompareData])

  const toggleHouseSelection = (houseId: string) => {
    setSelectedHouses((prev) => {
      if (prev.includes(houseId)) {
        return prev.filter((id) => id !== houseId)
      }
      if (prev.length >= 3) {
        return prev
      }
      return [...prev, houseId]
    })
  }

  const getVisitForHouse = (houseId: string): Visit | undefined => {
    return visits.find((v) => v.houseId === houseId)
  }

  const getHouseById = (houseId: string): House | undefined => {
    return visitedHouses.find((h) => h.id === houseId)
  }

  const selectedHousesData = selectedHouses
    .map((id) => ({
      house: getHouseById(id),
      visit: getVisitForHouse(id),
    }))
    .filter((d): d is { house: House; visit: Visit } => !!d.house && !!d.visit)

  const allRoomsWithRecordings = [
    ...new Set(selectedHousesData.flatMap((d) => d.visit.recordings.map((r) => r.roomId))),
  ]

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Compare Houses"
          subtitle="Listen to your recordings side by side"
          icon={<CompareIcon />}
        />
        <Card className="mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="w-full h-20 bg-gray-200 rounded mb-2" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Compare Houses"
          subtitle="Listen to your recordings side by side"
          icon={<CompareIcon />}
        />
        <NetworkError onRetry={fetchCompareData} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compare Houses"
        subtitle="Listen to your recordings side by side"
        icon={<CompareIcon />}
        stats={visitedHouses.length > 0 ? [
          { label: 'Visited', value: visitedHouses.length },
          { label: 'Selected', value: selectedHouses.length },
        ] : undefined}
      />

      {/* House Selector */}
      <Card className="mb-6">
        <h2 className="text-sm font-medium text-gray-500 mb-3">
          Select houses to compare (up to 3)
        </h2>

        {visitedHouses.length === 0 ? (
          <div className="text-center py-8">
            <svg
              className="w-12 h-12 mx-auto mb-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <p className="text-gray-500">No visited houses yet.</p>
            <p className="text-sm text-gray-400 mt-1">
              Complete some house visits to compare them here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {visitedHouses.map((house) => {
              const visit = getVisitForHouse(house.id)
              const isSelected = selectedHouses.includes(house.id)

              return (
                <button
                  key={house.id}
                  onClick={() => toggleHouseSelection(house.id)}
                  disabled={!isSelected && selectedHouses.length >= 3}
                  className="relative p-2 rounded-lg text-left transition-all"
                  style={
                    isSelected
                      ? { background: '#E3F2FD', boxShadow: '0 0 0 2px #006AFF' }
                      : selectedHouses.length >= 3
                        ? { background: '#F9FAFB', opacity: 0.5, cursor: 'not-allowed' }
                        : { background: '#F9FAFB' }
                  }
                >
                  <div className="relative w-full h-20 rounded overflow-hidden mb-2">
                    {house.images?.[0] ? (
                      <Image
                        src={house.images[0]}
                        alt={house.address}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <svg
                          className="w-8 h-8 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                          />
                        </svg>
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#006AFF' }}>
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-medium text-gray-900 truncate">{house.address}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500">
                      {house.price ? formatPrice(house.price) : 'Price TBD'}
                    </span>
                    {visit?.overallImpression && (
                      <span>
                        {IMPRESSION_EMOJIS[visit.overallImpression as keyof typeof IMPRESSION_EMOJIS]}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </Card>

      {/* Comparison View */}
      {selectedHousesData.length > 0 && (
        <>
          {/* Room Filter */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedRoom('all')}
              className="px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
              style={
                selectedRoom === 'all'
                  ? { background: '#E3F2FD', color: '#006AFF' }
                  : { background: '#F3F4F6', color: '#4B5563' }
              }
            >
              All Rooms
            </button>
            {allRoomsWithRecordings.map((roomId) => {
              const room = DEFAULT_ROOMS.find((r) => r.id === roomId)
              return (
                <button
                  key={roomId}
                  onClick={() => setSelectedRoom(roomId)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1"
                  style={
                    selectedRoom === roomId
                      ? { background: '#E3F2FD', color: '#006AFF' }
                      : { background: '#F3F4F6', color: '#4B5563' }
                  }
                >
                  <span>{room?.icon}</span>
                  <span>{room?.name || roomId}</span>
                </button>
              )
            })}
          </div>

          {/* Comparison Grid */}
          <div
            className={`grid gap-4 ${
              selectedHousesData.length === 1
                ? 'grid-cols-1'
                : selectedHousesData.length === 2
                  ? 'grid-cols-1 md:grid-cols-2'
                  : 'grid-cols-1 md:grid-cols-3'
            }`}
          >
            {selectedHousesData.map(({ house, visit }) => {
              const filteredRecordings =
                selectedRoom === 'all'
                  ? visit.recordings
                  : visit.recordings.filter((r) => r.roomId === selectedRoom)

              // Transform recordings to the format expected by AudioTimeline
              const timelineRecordings = filteredRecordings.map((r) => ({
                id: r.id,
                houseId: house.id,
                roomId: r.roomId,
                audioUrl: r.audioUrl || '',
                duration: r.duration || 0,
                recordedAt: new Date(r.recordedAt),
              }))

              return (
                <Card key={house.id} className="overflow-hidden">
                  {/* House Header */}
                  <div className="relative h-32 -mx-4 -mt-4 mb-4">
                    {house.images?.[0] ? (
                      <Image
                        src={house.images[0]}
                        alt={house.address}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-2 left-3 right-3">
                      <p className="text-white font-semibold truncate">{house.address}</p>
                      <p className="text-white/80 text-sm">
                        {house.price ? formatPrice(house.price) : 'Price TBD'}
                      </p>
                    </div>
                    {visit.overallImpression && (
                      <span className="absolute top-2 right-2 text-2xl">
                        {IMPRESSION_EMOJIS[visit.overallImpression as keyof typeof IMPRESSION_EMOJIS]}
                      </span>
                    )}
                  </div>

                  {/* House Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-xs text-gray-500">Beds</p>
                      <p className="font-semibold text-gray-900">
                        {house.bedrooms ?? '-'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-xs text-gray-500">Baths</p>
                      <p className="font-semibold text-gray-900">
                        {house.bathrooms ?? '-'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-xs text-gray-500">Sqft</p>
                      <p className="font-semibold text-gray-900">
                        {house.sqft ? `${(house.sqft / 1000).toFixed(1)}k` : '-'}
                      </p>
                    </div>
                  </div>

                  {/* Notes */}
                  {visit.notes && (
                    <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-sm text-amber-800">{visit.notes}</p>
                    </div>
                  )}

                  {/* Recordings */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">
                      {selectedRoom === 'all'
                        ? 'All Recordings'
                        : DEFAULT_ROOMS.find((r) => r.id === selectedRoom)?.name}{' '}
                      ({filteredRecordings.length})
                    </h3>
                    {filteredRecordings.length > 0 ? (
                      <AudioTimeline
                        recordings={timelineRecordings}
                        groupByRoom={selectedRoom === 'all'}
                      />
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-4">
                        No recordings for this room
                      </p>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {selectedHousesData.length === 0 && visitedHouses.length > 0 && (
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
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Select houses to compare</h3>
          <p className="text-gray-500">Choose up to 3 houses from the list above</p>
        </Card>
      )}
    </div>
  )
}
