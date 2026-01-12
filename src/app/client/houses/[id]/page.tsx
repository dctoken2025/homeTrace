'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/Modal'
import { NetworkError, NotFoundError } from '@/components/ui/ErrorState'
import { useToast } from '@/components/ui/Toast'
import { formatPrice, getStatusLabel, getStatusColor, formatSqft } from '@/lib/format-utils'

// Transform low-res rdcpix URLs to high-res versions
const getHighResImageUrl = (url: string): string => {
  if (!url) return url
  return url.replace(/(-[mb]\d+)s\.jpg$/i, '$1od.jpg')
}

// Helper to generate listing site URLs
function generateListingUrls(house: House) {
  const fullAddress = `${house.address}, ${house.city}, ${house.state} ${house.zipCode}`
  const addressEncoded = encodeURIComponent(fullAddress)
  const zillowSearch = encodeURIComponent(`${house.address} ${house.city} ${house.state}`)
  const realtorSearch = encodeURIComponent(`${house.address}, ${house.city}, ${house.state} ${house.zipCode}`)
  const redfinSearch = encodeURIComponent(`${house.address}, ${house.city}, ${house.state}`)
  const truliaSearch = encodeURIComponent(`${house.address}, ${house.city}, ${house.state}`)

  return {
    zillow: `https://www.zillow.com/homes/${zillowSearch}_rb/`,
    realtor: `https://www.realtor.com/realestateandhomes-search/${realtorSearch}`,
    redfin: `https://www.redfin.com/search?location=${redfinSearch}`,
    trulia: `https://www.trulia.com/search/${truliaSearch}`,
    googleMaps: `https://www.google.com/maps/search/?api=1&query=${addressEncoded}`,
  }
}

interface PriceHistoryItem {
  date: string
  price: number
  event_name: string
}

interface TaxHistoryDetailedItem {
  year: number
  tax: number
  assessment: {
    building: number | null
    land: number | null
    total: number | null
  } | null
}

interface PropertyHistoryItem {
  date: string
  price: number
  event_name: string
  source: string | null
  photos: string[]
}

interface SchoolDetailed {
  name: string
  distance_in_miles: number
  education_levels: string[]
  rating: number | null
  parentRating: number | null
  funding_type: string
  grades: string[]
  studentCount: number | null
  assigned: boolean | null
}

interface Feature {
  category: string
  text: string[]
}

interface MortgageDetail {
  type: string
  amount: number
  displayName: string
}

interface Mortgage {
  monthlyPayment: number
  loanAmount: number
  downPayment: number
  totalPayment: number
  interestRate: number
  loanTerm: number
  details: MortgageDetail[]
}

interface Agent {
  name: string
  email: string | null
  phone: string | null
  photo: string | null
  license: string | null
  officeName: string | null
  officePhone: string | null
  officePhoto: string | null
}

interface ValueEstimate {
  source: string
  estimate: number
  estimateHigh: number
  estimateLow: number
  date: string
}

interface PropertyFlags {
  isNewConstruction: boolean | null
  isForeclosure: boolean | null
  isNewListing: boolean | null
  isComingSoon: boolean | null
  isContingent: boolean | null
  isPending: boolean | null
  isPriceReduced: boolean | null
  isShortSale: boolean | null
}

interface FloodInfo {
  floodFactorScore: number | null
  femaZones: string[]
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
  // Rich data
  pool: boolean | null
  fireplace: boolean | null
  heating: string | null
  cooling: string | null
  bathsFull: number | null
  bathsHalf: number | null
  descriptionText: string | null
  neighborhood: string | null
  county: string | null
  streetViewUrl: string | null
  // Features and history
  features: Feature[]
  details: Feature[]
  priceHistory: PriceHistoryItem[]
  taxHistoryDetailed: TaxHistoryDetailedItem[]
  propertyHistory: PropertyHistoryItem[]
  schoolsDetailed: SchoolDetailed[]
  // Financial
  mortgage: Mortgage | null
  hoa: { fee: number; frequency: string } | null
  // Agent
  agent: Agent | null
  // Estimates
  estimates: ValueEstimate[] | null
  // Flags
  flags: PropertyFlags | null
  // Local info
  flood: FloodInfo | null
  // Other
  lastSoldPrice: number | null
  lastSoldDate: string | null
  pricePerSqft: number | null
  daysOnMarket: number | null
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
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [expandedDetails, setExpandedDetails] = useState<Set<number>>(new Set())

  // Lightbox keyboard navigation
  const handleLightboxKeyDown = useCallback((e: KeyboardEvent) => {
    if (!lightboxOpen) return

    const photos = houseDetail?.house.photos || []
    if (e.key === 'Escape') {
      setLightboxOpen(false)
    } else if (e.key === 'ArrowLeft') {
      setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1))
    } else if (e.key === 'ArrowRight') {
      setActivePhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0))
    }
  }, [lightboxOpen, houseDetail?.house.photos])

  useEffect(() => {
    window.addEventListener('keydown', handleLightboxKeyDown)
    return () => window.removeEventListener('keydown', handleLightboxKeyDown)
  }, [handleLightboxKeyDown])

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [lightboxOpen])

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
  const listingUrls = generateListingUrls(house)

  const toggleDetails = (index: number) => {
    setExpandedDetails(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const formatPhone = (phone: string | null) => {
    if (!phone) return null
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
  }

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
            <div
              className="relative aspect-[16/10] bg-gray-100 cursor-pointer"
              onClick={() => photos.length > 0 && setLightboxOpen(true)}
            >
              {photos.length > 0 ? (
                <Image
                  src={getHighResImageUrl(photos[activePhotoIndex])}
                  alt={house.address}
                  fill
                  className="object-cover"
                  quality={90}
                  unoptimized
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
                      src={getHighResImageUrl(photo)}
                      alt={`Photo ${index + 1}`}
                      fill
                      className="object-cover"
                      quality={80}
                      unoptimized
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Click hint */}
            {photos.length > 0 && (
              <div className="px-4 pb-3 text-xs text-gray-500 text-center">
                Tap image to view full screen
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
              {house.streetViewUrl && (
                <a
                  href={house.streetViewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-3 bg-[#34A853] text-white rounded-lg hover:bg-[#2E8B47] transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                  </svg>
                  <span className="font-medium">Street View</span>
                </a>
              )}
            </div>
          </div>

          {/* Property Description */}
          {house.descriptionText && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Property Description</h2>
              <div className="text-gray-700 leading-relaxed">
                <p className={!isDescriptionExpanded ? 'line-clamp-4' : ''}>
                  {house.descriptionText}
                </p>
                {house.descriptionText.length > 300 && (
                  <button
                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                    className="mt-2 text-[#006AFF] hover:text-[#0052CC] font-medium text-sm"
                  >
                    {isDescriptionExpanded ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Mortgage Calculator */}
          {house.mortgage && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Estimated Monthly Payment</h2>
              <div className="text-center mb-6">
                <p className="text-4xl font-bold text-[#006AFF]">
                  {formatPrice(house.mortgage.monthlyPayment)}
                  <span className="text-lg font-normal text-gray-500">/mo</span>
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {(house.mortgage.interestRate * 100).toFixed(2)}% rate • {house.mortgage.loanTerm} year loan
                </p>
              </div>

              {/* Payment Breakdown */}
              <div className="space-y-3">
                {house.mortgage.details.map((detail, index) => {
                  const total = house.mortgage!.monthlyPayment
                  const percentage = (detail.amount / total) * 100
                  const colors: Record<string, string> = {
                    principal_and_interest: 'bg-[#006AFF]',
                    home_insurance: 'bg-[#00B67A]',
                    hoa_fees: 'bg-[#FF9800]',
                    property_tax: 'bg-[#9C27B0]',
                    mortgage_insurance: 'bg-[#F44336]',
                  }
                  return (
                    <div key={index}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{detail.displayName}</span>
                        <span className="font-medium text-gray-900">{formatPrice(detail.amount)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${colors[detail.type] || 'bg-gray-400'}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Loan Details */}
              <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Down Payment (20%)</p>
                  <p className="font-medium text-gray-900">{formatPrice(house.mortgage.downPayment)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Loan Amount</p>
                  <p className="font-medium text-gray-900">{formatPrice(house.mortgage.loanAmount)}</p>
                </div>
              </div>
            </div>
          )}

          {/* HOA Fee Card */}
          {house.hoa && (
            <div className="bg-amber-50 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <svg className="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-amber-900">HOA Fee</p>
                  <p className="text-sm text-amber-700">Monthly association fee</p>
                </div>
              </div>
              <p className="text-xl font-bold text-amber-900">{formatPrice(house.hoa.fee)}/mo</p>
            </div>
          )}

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

          {/* Property Details by Category (Accordion) */}
          {house.details && house.details.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Property Features</h2>
              <div className="space-y-2">
                {house.details.map((category, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleDetails(index)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-medium text-gray-900">{category.category}</span>
                      <svg
                        className={`w-5 h-5 text-gray-500 transition-transform ${expandedDetails.has(index) ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {expandedDetails.has(index) && (
                      <div className="px-4 pb-4 border-t border-gray-100">
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                          {category.text.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                              <svg className="w-4 h-4 text-[#006AFF] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Enhanced Schools */}
          {house.schoolsDetailed && house.schoolsDetailed.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Nearby Schools</h2>
              <div className="space-y-3">
                {house.schoolsDetailed.map((school, index) => (
                  <div key={index} className="p-4 rounded-lg border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{school.name}</p>
                          {school.assigned && (
                            <span className="px-2 py-0.5 bg-[#E3F2FD] text-[#006AFF] text-xs font-medium rounded">
                              Assigned
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {school.education_levels.map(l => l.charAt(0).toUpperCase() + l.slice(1)).join(', ')} • {school.funding_type === 'public' ? 'Public' : 'Private'}
                        </p>
                        {school.grades && school.grades.length > 0 && (
                          <p className="text-xs text-gray-400 mt-1">
                            Grades: {school.grades[0]}-{school.grades[school.grades.length - 1]}
                            {school.studentCount && ` • ${school.studentCount.toLocaleString()} students`}
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        {school.rating !== null && school.rating > 0 && (
                          <div className="flex items-center justify-end gap-1 mb-1">
                            <div className={`px-2 py-1 rounded-lg text-sm font-bold ${
                              school.rating >= 8 ? 'bg-green-100 text-green-800' :
                              school.rating >= 6 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {school.rating}/10
                            </div>
                          </div>
                        )}
                        {school.parentRating !== null && school.parentRating > 0 && (
                          <div className="flex items-center justify-end gap-1 text-xs text-gray-500">
                            <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            {school.parentRating}/5 parents
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">{school.distance_in_miles.toFixed(1)} miles</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Property History Timeline */}
          {house.propertyHistory && house.propertyHistory.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Property History</h2>
              <div className="relative">
                <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200"></div>
                <div className="space-y-4">
                  {house.propertyHistory.map((item, index) => (
                    <div key={index} className="relative pl-10">
                      <div className="absolute left-2 w-4 h-4 bg-white border-2 border-[#006AFF] rounded-full"></div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{item.event_name}</p>
                            <p className="text-sm text-gray-500">{new Date(item.date).toLocaleDateString()}</p>
                            {item.source && <p className="text-xs text-gray-400 mt-1">Source: {item.source}</p>}
                          </div>
                          {item.price > 0 && (
                            <p className="text-lg font-semibold text-gray-900">{formatPrice(item.price)}</p>
                          )}
                        </div>
                        {item.photos && item.photos.length > 0 && (
                          <div className="flex gap-2 mt-3 overflow-x-auto">
                            {item.photos.slice(0, 4).map((photo, idx) => (
                              <div key={idx} className="relative w-16 h-16 flex-shrink-0 rounded overflow-hidden">
                                <Image src={getHighResImageUrl(photo)} alt="" fill className="object-cover" unoptimized />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tax History with Assessment Breakdown */}
          {house.taxHistoryDetailed && house.taxHistoryDetailed.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Tax History</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 text-gray-500 font-medium">Year</th>
                      <th className="text-right py-2 text-gray-500 font-medium">Tax</th>
                      <th className="text-right py-2 text-gray-500 font-medium">Land</th>
                      <th className="text-right py-2 text-gray-500 font-medium">Building</th>
                      <th className="text-right py-2 text-gray-500 font-medium">Total Assessment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {house.taxHistoryDetailed.slice(0, 5).map((item, index) => (
                      <tr key={index} className="border-b border-gray-100 last:border-0">
                        <td className="py-3 text-gray-900 font-medium">{item.year}</td>
                        <td className="py-3 text-right text-[#006AFF] font-medium">{formatPrice(item.tax)}</td>
                        <td className="py-3 text-right text-gray-500">
                          {item.assessment?.land ? formatPrice(item.assessment.land) : '-'}
                        </td>
                        <td className="py-3 text-right text-gray-500">
                          {item.assessment?.building ? formatPrice(item.assessment.building) : '-'}
                        </td>
                        <td className="py-3 text-right text-gray-900 font-medium">
                          {item.assessment?.total ? formatPrice(item.assessment.total) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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

            <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
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

            {/* Additional Stats */}
            {(house.pricePerSqft || house.daysOnMarket !== null) && (
              <div className="flex items-center gap-4 py-3 border-t border-gray-100 mb-4 text-sm">
                {house.pricePerSqft && (
                  <div>
                    <p className="text-gray-500">$/sqft</p>
                    <p className="font-medium text-gray-900">${Math.round(house.pricePerSqft)}</p>
                  </div>
                )}
                {house.daysOnMarket !== null && (
                  <div>
                    <p className="text-gray-500">Days on Market</p>
                    <p className="font-medium text-gray-900">{house.daysOnMarket}</p>
                  </div>
                )}
              </div>
            )}

            {/* Property Flags */}
            {house.flags && (
              <div className="flex flex-wrap gap-2 mb-4">
                {house.flags.isNewListing && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">New Listing</span>
                )}
                {house.flags.isPriceReduced && (
                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">Price Reduced</span>
                )}
                {house.flags.isNewConstruction && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">New Construction</span>
                )}
                {house.flags.isForeclosure && (
                  <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">Foreclosure</span>
                )}
                {house.flags.isContingent && (
                  <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">Contingent</span>
                )}
                {house.flags.isPending && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">Pending</span>
                )}
              </div>
            )}

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

          {/* Listing Agent */}
          {house.agent && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Listing Agent</h3>
              <div className="flex items-start gap-3">
                {house.agent.photo ? (
                  <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                    <Image src={house.agent.photo} alt={house.agent.name} fill className="object-cover" unoptimized />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#E3F2FD] flex items-center justify-center flex-shrink-0">
                    <span className="text-[#006AFF] font-medium text-lg">
                      {house.agent.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{house.agent.name}</p>
                  {house.agent.license && (
                    <p className="text-xs text-gray-400 mt-0.5">License: {house.agent.license}</p>
                  )}
                  {house.agent.officeName && (
                    <p className="text-sm text-gray-500 mt-1">{house.agent.officeName}</p>
                  )}
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {house.agent.phone && (
                  <a
                    href={`tel:${house.agent.phone}`}
                    className="flex items-center gap-2 text-sm text-[#006AFF] hover:text-[#0052CC]"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {formatPhone(house.agent.phone)}
                  </a>
                )}
                {house.agent.email && (
                  <a
                    href={`mailto:${house.agent.email}`}
                    className="flex items-center gap-2 text-sm text-[#006AFF] hover:text-[#0052CC]"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {house.agent.email}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Value Estimates */}
          {house.estimates && house.estimates.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Estimated Value</h3>
              <div className="space-y-3">
                {house.estimates.map((estimate, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500">{estimate.source}</p>
                      <p className="font-semibold text-gray-900">{formatPrice(estimate.estimate)}</p>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                      <span>Low: {formatPrice(estimate.estimateLow)}</span>
                      <span>-</span>
                      <span>High: {formatPrice(estimate.estimateHigh)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Flood Risk */}
          {house.flood && house.flood.floodFactorScore !== null && (
            <div className={`rounded-xl p-4 ${
              house.flood.floodFactorScore <= 3 ? 'bg-green-50' :
              house.flood.floodFactorScore <= 6 ? 'bg-yellow-50' :
              'bg-red-50'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  house.flood.floodFactorScore <= 3 ? 'bg-green-100' :
                  house.flood.floodFactorScore <= 6 ? 'bg-yellow-100' :
                  'bg-red-100'
                }`}>
                  <svg className={`w-5 h-5 ${
                    house.flood.floodFactorScore <= 3 ? 'text-green-700' :
                    house.flood.floodFactorScore <= 6 ? 'text-yellow-700' :
                    'text-red-700'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <p className={`font-medium ${
                    house.flood.floodFactorScore <= 3 ? 'text-green-900' :
                    house.flood.floodFactorScore <= 6 ? 'text-yellow-900' :
                    'text-red-900'
                  }`}>
                    Flood Risk: {house.flood.floodFactorScore}/10
                  </p>
                  <p className={`text-sm ${
                    house.flood.floodFactorScore <= 3 ? 'text-green-700' :
                    house.flood.floodFactorScore <= 6 ? 'text-yellow-700' :
                    'text-red-700'
                  }`}>
                    {house.flood.floodFactorScore <= 3 ? 'Minimal risk' :
                     house.flood.floodFactorScore <= 6 ? 'Moderate risk' :
                     'High risk'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Last Sold Info */}
          {house.lastSoldPrice && house.lastSoldDate && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-500">Last Sold</p>
              <p className="font-medium text-gray-900">{formatPrice(house.lastSoldPrice)}</p>
              <p className="text-xs text-gray-400 mt-1">
                on {new Date(house.lastSoldDate).toLocaleDateString()}
              </p>
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

      {/* Image Lightbox */}
      {lightboxOpen && photos.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 z-10 p-2 text-white/80 hover:text-white transition-colors"
            aria-label="Close lightbox"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Photo counter */}
          <div className="absolute top-4 left-4 text-white/80 text-sm">
            {activePhotoIndex + 1} / {photos.length}
          </div>

          {/* Previous button */}
          {photos.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1))
              }}
              className="absolute left-2 sm:left-4 z-10 p-2 text-white/80 hover:text-white transition-colors bg-black/30 rounded-full"
              aria-label="Previous photo"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Main image */}
          <div
            className="relative w-full h-full max-w-5xl max-h-[85vh] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={getHighResImageUrl(photos[activePhotoIndex])}
              alt={`Photo ${activePhotoIndex + 1}`}
              fill
              className="object-contain"
              quality={100}
              unoptimized
              priority
            />
          </div>

          {/* Next button */}
          {photos.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setActivePhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0))
              }}
              className="absolute right-2 sm:right-4 z-10 p-2 text-white/80 hover:text-white transition-colors bg-black/30 rounded-full"
              aria-label="Next photo"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Thumbnail strip at bottom */}
          {photos.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4 overflow-x-auto">
              {photos.map((photo, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation()
                    setActivePhotoIndex(index)
                  }}
                  className={`relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden transition-all ${
                    index === activePhotoIndex
                      ? 'ring-2 ring-white opacity-100'
                      : 'opacity-50 hover:opacity-80'
                  }`}
                >
                  <Image
                    src={getHighResImageUrl(photo)}
                    alt={`Thumbnail ${index + 1}`}
                    fill
                    className="object-cover"
                    quality={60}
                    unoptimized
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
