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

interface PriceHistoryItem {
  date: string
  price: number
  event_name: string
}

interface TaxHistoryItem {
  year: number
  tax: number
  assessment?: { total: number }
}

interface School {
  name: string
  distance_in_miles: number
  education_levels: string[]
  rating: number
  funding_type: string
}

interface Feature {
  category: string
  text: string[]
}

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
  sqft: number | null
  yearBuilt: number | null
  propertyType: string | null
  listingStatus: string | null
  images: string[]
  lastSyncedAt: string
  // Rich data
  lotSqft: number | null
  garage: number | null
  stories: number | null
  pool: boolean | null
  fireplace: boolean | null
  heating: string | null
  cooling: string | null
  bathsFull: number | null
  bathsHalf: number | null
  features: Feature[]
  priceHistory: PriceHistoryItem[]
  taxHistory: TaxHistoryItem[]
  schools: School[]
  neighborhood: string | null
  county: string | null
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
  realtorNotes?: string | null
  createdAt: string
  updatedAt: string
  house: House
  buyer: {
    id: string
    name: string
    email: string
  }
  addedByRealtor: {
    id: string
    name: string
  } | null
  visits: Visit[]
}

// Helper to generate listing site URLs
function generateListingUrls(house: House) {
  const fullAddress = `${house.address}, ${house.city}, ${house.state} ${house.zipCode}`
  const addressEncoded = encodeURIComponent(fullAddress)

  // For Zillow, use their search URL with the full address - most reliable method
  const zillowSearch = encodeURIComponent(`${house.address} ${house.city} ${house.state}`)

  // For Realtor.com, use their search with full address
  const realtorSearch = encodeURIComponent(`${house.address}, ${house.city}, ${house.state} ${house.zipCode}`)

  // For Redfin, use their search
  const redfinSearch = encodeURIComponent(`${house.address}, ${house.city}, ${house.state}`)

  // For Trulia, use their search
  const truliaSearch = encodeURIComponent(`${house.address}, ${house.city}, ${house.state}`)

  return {
    zillow: `https://www.zillow.com/homes/${zillowSearch}_rb/`,
    realtor: `https://www.realtor.com/realestateandhomes-search/${realtorSearch}`,
    redfin: `https://www.redfin.com/search?location=${redfinSearch}`,
    trulia: `https://www.trulia.com/search/${truliaSearch}`,
    googleMaps: `https://www.google.com/maps/search/?api=1&query=${addressEncoded}`,
  }
}

export default function RealtorHouseDetailPage() {
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

  const handleRemove = async () => {
    setIsRemoving(true)
    try {
      const response = await fetch(`/api/houses/${houseBuyerId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to remove house')
      }

      success('House removed from client\'s list')
      router.push('/realtor/houses')
    } catch {
      showError('Failed to remove house')
    } finally {
      setIsRemoving(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Error states
  if (error === 'not_found') {
    return (
      <div className="py-12">
        <NotFoundError onGoBack={() => router.push('/realtor/houses')} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-12">
        <NetworkError onRetry={() => window.location.reload()} />
      </div>
    )
  }

  if (!houseDetail) return null

  const { house, buyer, visits } = houseDetail
  const photos = house.images || []
  const listingUrls = generateListingUrls(house)

  return (
    <div className="pb-24">
      {/* Back button */}
      <Link
        href="/realtor/houses"
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
                  unoptimized
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
                      unoptimized
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* View on Listing Sites */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">View on Listing Sites</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <a
                href={listingUrls.zillow}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 bg-[#006AFF] text-white rounded-lg hover:bg-[#0052CC] transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 8.5V22h7v-7h6v7h7V8.5L12 2z"/>
                </svg>
                <span className="font-medium">Zillow</span>
              </a>
              <a
                href={listingUrls.realtor}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 bg-[#D92228] text-white rounded-lg hover:bg-[#B71C1C] transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 8.5V22h7v-7h6v7h7V8.5L12 2z"/>
                </svg>
                <span className="font-medium">Realtor.com</span>
              </a>
              <a
                href={listingUrls.redfin}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 bg-[#A02021] text-white rounded-lg hover:bg-[#8B1A1B] transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 8.5V22h7v-7h6v7h7V8.5L12 2z"/>
                </svg>
                <span className="font-medium">Redfin</span>
              </a>
              <a
                href={listingUrls.trulia}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 bg-[#00B67A] text-white rounded-lg hover:bg-[#009966] transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 8.5V22h7v-7h6v7h7V8.5L12 2z"/>
                </svg>
                <span className="font-medium">Trulia</span>
              </a>
              <a
                href={listingUrls.googleMaps}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 bg-[#4285F4] text-white rounded-lg hover:bg-[#3367D6] transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                <span className="font-medium">Google Maps</span>
              </a>
            </div>
          </div>

          {/* Property Details */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Property Details</h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {house.bedrooms !== null && (
                <div>
                  <p className="text-sm text-gray-500">Bedrooms</p>
                  <p className="text-lg font-medium text-gray-900">{house.bedrooms}</p>
                </div>
              )}
              {house.bathrooms !== null && (
                <div>
                  <p className="text-sm text-gray-500">Bathrooms</p>
                  <p className="text-lg font-medium text-gray-900">
                    {house.bathrooms}
                    {(house.bathsFull || house.bathsHalf) && (
                      <span className="text-sm text-gray-500 ml-1">
                        ({house.bathsFull ? `${house.bathsFull} full` : ''}{house.bathsFull && house.bathsHalf ? ', ' : ''}{house.bathsHalf ? `${house.bathsHalf} half` : ''})
                      </span>
                    )}
                  </p>
                </div>
              )}
              {house.sqft !== null && (
                <div>
                  <p className="text-sm text-gray-500">Living Area</p>
                  <p className="text-lg font-medium text-gray-900">{formatSqft(house.sqft)} sqft</p>
                </div>
              )}
              {house.lotSqft !== null && (
                <div>
                  <p className="text-sm text-gray-500">Lot Size</p>
                  <p className="text-lg font-medium text-gray-900">{formatSqft(house.lotSqft)} sqft</p>
                </div>
              )}
              {house.yearBuilt !== null && (
                <div>
                  <p className="text-sm text-gray-500">Year Built</p>
                  <p className="text-lg font-medium text-gray-900">{house.yearBuilt}</p>
                </div>
              )}
              {house.stories !== null && (
                <div>
                  <p className="text-sm text-gray-500">Stories</p>
                  <p className="text-lg font-medium text-gray-900">{house.stories}</p>
                </div>
              )}
              {house.garage !== null && (
                <div>
                  <p className="text-sm text-gray-500">Garage</p>
                  <p className="text-lg font-medium text-gray-900">{house.garage} car</p>
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

            {/* Amenities */}
            {(house.pool || house.fireplace || house.heating || house.cooling) && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-700 mb-2">Amenities</p>
                <div className="flex flex-wrap gap-2">
                  {house.pool && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      Pool
                    </span>
                  )}
                  {house.fireplace && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-sm">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8zm0 18c-3.35 0-6-2.57-6-6.2 0-2.34 1.95-5.44 6-9.14 4.05 3.7 6 6.79 6 9.14 0 3.63-2.65 6.2-6 6.2z"/>
                      </svg>
                      Fireplace
                    </span>
                  )}
                  {house.heating && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                      </svg>
                      {house.heating}
                    </span>
                  )}
                  {house.cooling && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-cyan-50 text-cyan-700 rounded-full text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {house.cooling}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Location Info */}
            {(house.neighborhood || house.county) && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-700 mb-2">Location</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  {house.neighborhood && (
                    <div>
                      <span className="text-gray-500">Neighborhood:</span>{' '}
                      <span className="text-gray-900">{house.neighborhood}</span>
                    </div>
                  )}
                  {house.county && (
                    <div>
                      <span className="text-gray-500">County:</span>{' '}
                      <span className="text-gray-900">{house.county}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
              <span>Last updated: {new Date(house.lastSyncedAt).toLocaleDateString()}</span>
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

          {/* Features */}
          {house.features && house.features.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Features</h2>
              <div className="space-y-4">
                {house.features.map((feature, index) => (
                  <div key={index}>
                    <p className="text-sm font-medium text-gray-700 mb-2">{feature.category}</p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {feature.text.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                          <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Schools */}
          {house.schools && house.schools.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Nearby Schools</h2>
              <div className="space-y-3">
                {house.schools.map((school, index) => (
                  <div key={index} className="p-3 rounded-lg border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{school.name}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {school.education_levels.join(', ')} • {school.funding_type}
                        </p>
                      </div>
                      <div className="text-right">
                        {school.rating > 0 && (
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-900">{school.rating}/10</span>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">{school.distance_in_miles.toFixed(1)} mi</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Price History */}
          {house.priceHistory && house.priceHistory.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Price History</h2>
              <div className="space-y-2">
                {house.priceHistory.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.event_name}</p>
                      <p className="text-xs text-gray-500">{new Date(item.date).toLocaleDateString()}</p>
                    </div>
                    <p className="font-medium text-gray-900">{formatPrice(item.price)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tax History */}
          {house.taxHistory && house.taxHistory.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Tax History</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 text-gray-500 font-medium">Year</th>
                      <th className="text-right py-2 text-gray-500 font-medium">Tax</th>
                      <th className="text-right py-2 text-gray-500 font-medium">Assessment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {house.taxHistory.slice(0, 5).map((item, index) => (
                      <tr key={index} className="border-b border-gray-100 last:border-0">
                        <td className="py-2 text-gray-900">{item.year}</td>
                        <td className="py-2 text-right text-gray-900">{formatPrice(item.tax)}</td>
                        <td className="py-2 text-right text-gray-500">
                          {item.assessment?.total ? formatPrice(item.assessment.total) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Client's Visits */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Client&apos;s Visits</h2>

            {visits.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No visits scheduled yet for this property.
              </p>
            ) : (
              <div className="space-y-3">
                {visits.map((visit) => (
                  <div
                    key={visit.id}
                    className="p-4 rounded-lg border border-gray-200"
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
                  </div>
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
            <p className="text-gray-600 mb-1">{house.address}</p>
            <p className="text-gray-500 text-sm mb-4">{house.city}, {house.state} {house.zipCode}</p>

            <div className="flex items-center gap-2 text-gray-500 text-sm mb-6">
              {house.bedrooms !== null && <span>{house.bedrooms} bd</span>}
              {house.bathrooms !== null && (
                <>
                  <span className="text-gray-300">•</span>
                  <span>{house.bathrooms} ba</span>
                </>
              )}
              {house.sqft !== null && (
                <>
                  <span className="text-gray-300">•</span>
                  <span>{formatSqft(house.sqft)} sqft</span>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                variant="danger"
                fullWidth
                onClick={() => setRemoveModalOpen(true)}
              >
                Remove from Client&apos;s List
              </Button>
            </div>
          </div>

          {/* Client Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Client</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#E3F2FD] flex items-center justify-center">
                <span className="text-[#006AFF] font-medium">
                  {buyer.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{buyer.name}</p>
                <p className="text-sm text-gray-500">{buyer.email}</p>
              </div>
            </div>
          </div>

          {/* Client's Notes */}
          {houseDetail.notes && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Client&apos;s Notes</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{houseDetail.notes}</p>
            </div>
          )}

          {/* Favorite Status */}
          {houseDetail.isFavorite && (
            <div className="bg-red-50 rounded-xl p-4 flex items-center gap-3">
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              <span className="text-sm font-medium text-red-700">Client&apos;s Favorite</span>
            </div>
          )}

          {/* Added by info */}
          {houseDetail.addedByRealtor && (
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
              <p>
                Added by <span className="font-medium text-gray-900">{houseDetail.addedByRealtor.name}</span>
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
        message={`Are you sure you want to remove "${house.address}" from ${buyer.name}'s list?`}
        confirmLabel="Remove"
        variant="danger"
        isLoading={isRemoving}
      />
    </div>
  )
}
