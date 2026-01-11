'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/Modal'
import { NetworkError, NotFoundError } from '@/components/ui/ErrorState'
import { useToast } from '@/components/ui/Toast'
import { formatPrice, getStatusLabel, getStatusColor, formatSqft } from '@/lib/format-utils'

interface House {
  id: string
  externalId: string
  address: string
  city: string
  state: string
  zipCode: string
  latitude: number | null
  longitude: number | null
  price: number | null
  bedrooms: number | null
  bathrooms: number | null
  squareFeet: number | null
  yearBuilt: number | null
  propertyType: string | null
  lotSize: number | null
  garage: number | null
  stories: number | null
  listingStatus: string | null
  listingDate: string | null
  photos: string[]
  lastUpdated: string
}

interface Visit {
  id: string
  status: string
  scheduledAt: string
  visitedAt: string | null
  overallImpression: string | null
  notes: string | null
  recordingCount: number
}

interface HouseDetail {
  id: string
  isFavorite: boolean
  matchScore: number | null
  notes: string | null
  createdAt: string
  updatedAt: string
  house: House
  buyer: {
    id: string
    name: string
    email: string
  }
  addedBy: {
    id: string
    name: string
  } | null
  visits: Visit[]
}

export default function HouseDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { success, error: showError } = useToast()

  const [houseDetail, setHouseDetail] = useState<HouseDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activePhotoIndex, setActivePhotoIndex] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [removeModalOpen, setRemoveModalOpen] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  const houseBuyerId = params.id as string

  useEffect(() => {
    const fetchHouseDetail = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`/api/houses/${houseBuyerId}`)
        const data = await response.json()

        if (!response.ok) {
          if (response.status === 404) {
            setError('not_found')
          } else {
            throw new Error(data.error?.message || 'Failed to load house')
          }
          return
        }

        setHouseDetail(data.data)
      } catch (err) {
        console.error('Fetch house detail error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load house')
      } finally {
        setIsLoading(false)
      }
    }

    if (houseBuyerId) {
      fetchHouseDetail()
    }
  }, [houseBuyerId])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch(`/api/houses/${houseBuyerId}/refresh`, {
        method: 'POST',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to refresh')
      }

      if (data.data.hasChanges) {
        success('House data updated with changes')
        // Refetch to get updated data
        window.location.reload()
      } else {
        success('House data is already up to date')
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to refresh')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleFavoriteToggle = async () => {
    if (!houseDetail) return

    try {
      const response = await fetch(`/api/houses/${houseBuyerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !houseDetail.isFavorite }),
      })

      if (!response.ok) {
        throw new Error('Failed to update favorite')
      }

      setHouseDetail((prev) =>
        prev ? { ...prev, isFavorite: !prev.isFavorite } : prev
      )

      success(
        houseDetail.isFavorite ? 'Removed from favorites' : 'Added to favorites'
      )
    } catch {
      showError('Failed to update favorite')
    }
  }

  const handleRemove = async () => {
    setIsRemoving(true)
    try {
      const response = await fetch(`/api/houses/${houseBuyerId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to remove house')
      }

      success('House removed from your list')
      router.push('/client/houses')
    } catch {
      showError('Failed to remove house')
    } finally {
      setIsRemoving(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Error states
  if (error === 'not_found') {
    return (
      <div className="container mx-auto px-4 py-12">
        <NotFoundError onGoBack={() => router.push('/client/houses')} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <NetworkError onRetry={() => window.location.reload()} />
      </div>
    )
  }

  if (!houseDetail) return null

  const { house, visits } = houseDetail
  const photos = house.photos || []

  return (
    <div className="container mx-auto px-4 py-6 pb-24">
      {/* Back button */}
      <Link
        href="/client/houses"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Houses
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Photos & Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Photo Gallery */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Main photo */}
            <div className="relative aspect-[16/10] bg-gray-100">
              {photos.length > 0 ? (
                <Image
                  src={photos[activePhotoIndex]}
                  alt={house.address}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                </div>
              )}

              {/* Status badge */}
              {house.listingStatus && (
                <div className="absolute top-4 left-4">
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(house.listingStatus)}`}>
                    {getStatusLabel(house.listingStatus)}
                  </span>
                </div>
              )}

              {/* Match score */}
              {houseDetail.matchScore !== null && (
                <div className="absolute top-4 right-4">
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                    houseDetail.matchScore >= 80 ? 'bg-[#E3F2FD] text-[#0D47A1]' :
                    houseDetail.matchScore >= 60 ? 'bg-amber-100 text-amber-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {houseDetail.matchScore}% Match
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {photos.length > 1 && (
              <div className="flex gap-2 p-4 overflow-x-auto">
                {photos.map((photo, index) => (
                  <button
                    key={index}
                    onClick={() => setActivePhotoIndex(index)}
                    className={`relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden ${
                      index === activePhotoIndex ? 'ring-2 ring-[#006AFF]' : ''
                    }`}
                  >
                    <Image
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Property Details */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Property Details</h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {house.bedrooms !== null && (
                <div>
                  <p className="text-sm text-gray-500">Bedrooms</p>
                  <p className="text-lg font-medium text-gray-900">{house.bedrooms}</p>
                </div>
              )}
              {house.bathrooms !== null && (
                <div>
                  <p className="text-sm text-gray-500">Bathrooms</p>
                  <p className="text-lg font-medium text-gray-900">{house.bathrooms}</p>
                </div>
              )}
              {house.squareFeet !== null && (
                <div>
                  <p className="text-sm text-gray-500">Square Feet</p>
                  <p className="text-lg font-medium text-gray-900">{formatSqft(house.squareFeet)}</p>
                </div>
              )}
              {house.yearBuilt !== null && (
                <div>
                  <p className="text-sm text-gray-500">Year Built</p>
                  <p className="text-lg font-medium text-gray-900">{house.yearBuilt}</p>
                </div>
              )}
              {house.lotSize !== null && (
                <div>
                  <p className="text-sm text-gray-500">Lot Size</p>
                  <p className="text-lg font-medium text-gray-900">{formatSqft(house.lotSize)} sqft</p>
                </div>
              )}
              {house.garage !== null && (
                <div>
                  <p className="text-sm text-gray-500">Garage</p>
                  <p className="text-lg font-medium text-gray-900">{house.garage} car</p>
                </div>
              )}
              {house.stories !== null && (
                <div>
                  <p className="text-sm text-gray-500">Stories</p>
                  <p className="text-lg font-medium text-gray-900">{house.stories}</p>
                </div>
              )}
              {house.propertyType && (
                <div>
                  <p className="text-sm text-gray-500">Property Type</p>
                  <p className="text-lg font-medium text-gray-900 capitalize">
                    {house.propertyType.replace(/_/g, ' ')}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
              <span>Last updated: {new Date(house.lastUpdated).toLocaleDateString()}</span>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1"
                style={{ color: '#006AFF' }}
              >
                {isRefreshing ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh Data
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Visits */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Visits</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/client/visits/new?houseId=${houseBuyerId}`)}
              >
                Schedule Visit
              </Button>
            </div>

            {visits.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No visits scheduled yet. Schedule your first visit to start recording your thoughts.
              </p>
            ) : (
              <div className="space-y-3">
                {visits.map((visit) => (
                  <Link
                    key={visit.id}
                    href={`/client/visits/${visit.id}`}
                    className="block p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {new Date(visit.scheduledAt).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {visit.recordingCount} recording{visit.recordingCount !== 1 ? 's' : ''}
                          {visit.overallImpression && ` • ${visit.overallImpression.replace(/_/g, ' ')}`}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        visit.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        visit.status === 'IN_PROGRESS' ? 'bg-[#E3F2FD] text-[#006AFF]' :
                        visit.status === 'SCHEDULED' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {visit.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column - Actions & Info */}
        <div className="space-y-6">
          {/* Price & Address Card */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-3xl font-bold text-gray-900 mb-2">
              {house.price ? formatPrice(house.price) : 'Price not available'}
            </p>
            <p className="text-gray-600 mb-4">{house.address}</p>

            <div className="flex items-center gap-2 text-gray-500 text-sm mb-6">
              {house.bedrooms !== null && <span>{house.bedrooms} bd</span>}
              {house.bathrooms !== null && (
                <>
                  <span className="text-gray-300">•</span>
                  <span>{house.bathrooms} ba</span>
                </>
              )}
              {house.squareFeet !== null && (
                <>
                  <span className="text-gray-300">•</span>
                  <span>{formatSqft(house.squareFeet)} sqft</span>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                variant={houseDetail.isFavorite ? 'secondary' : 'outline'}
                fullWidth
                leftIcon={
                  <svg
                    className="w-5 h-5"
                    fill={houseDetail.isFavorite ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                }
                onClick={handleFavoriteToggle}
              >
                {houseDetail.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
              </Button>

              <Button
                variant="primary"
                fullWidth
                onClick={() => router.push(`/client/visits/new?houseId=${houseBuyerId}`)}
              >
                Schedule a Visit
              </Button>

              <Button
                variant="danger"
                fullWidth
                onClick={() => setRemoveModalOpen(true)}
              >
                Remove from List
              </Button>
            </div>
          </div>

          {/* Notes */}
          {houseDetail.notes && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{houseDetail.notes}</p>
            </div>
          )}

          {/* Added by info */}
          {houseDetail.addedBy && (
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
              <p>
                Added by <span className="font-medium text-gray-900">{houseDetail.addedBy.name}</span>
              </p>
              <p className="mt-1">
                on {new Date(houseDetail.createdAt).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Remove Confirmation Modal */}
      <ConfirmModal
        isOpen={removeModalOpen}
        onClose={() => setRemoveModalOpen(false)}
        onConfirm={handleRemove}
        title="Remove House"
        message={`Are you sure you want to remove "${house.address}" from your list? Your visits and recordings will also be removed.`}
        confirmLabel="Remove"
        variant="danger"
        isLoading={isRemoving}
      />
    </div>
  )
}
