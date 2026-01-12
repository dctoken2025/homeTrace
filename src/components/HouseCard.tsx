'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { IconButton } from '@/components/ui/Button'
import { formatPrice, getStatusLabel, getStatusColor, formatSqft } from '@/lib/format-utils'

// Transform low-res rdcpix URLs to high-res versions
const getHighResImageUrl = (url: string): string => {
  if (!url) return url
  // Convert URLs like image-m640s.jpg to image-m640od.jpg (original quality)
  return url.replace(/(-[mb]\d+)s\.jpg$/i, '$1od.jpg')
}

interface House {
  id: string
  externalId?: string
  address: string
  city: string
  state: string
  zipCode?: string
  price: number | null
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  yearBuilt?: number | null
  propertyType?: string | null
  listingStatus?: string | null
  photos?: string[]
  images?: string[]
  lastUpdated?: Date | string
}

interface HouseCardProps {
  house: House
  houseBuyerId?: string
  isFavorite?: boolean
  matchScore?: number | null
  visitCount?: number
  showActions?: boolean
  onFavoriteToggle?: (id: string) => void
  onRemove?: (id: string) => void
  className?: string
}

export default function HouseCard({
  house,
  houseBuyerId,
  isFavorite = false,
  matchScore,
  visitCount = 0,
  showActions = true,
  onFavoriteToggle,
  onRemove,
  className = '',
}: HouseCardProps) {
  const [imageError, setImageError] = useState(false)
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false)

  // Support both 'photos' and 'images' field names (API returns 'images')
  const photoUrl = house.photos?.[0] || house.images?.[0]
  const hasImage = photoUrl && !imageError
  const photoCount = house.photos?.length || house.images?.length || 0

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!houseBuyerId || !onFavoriteToggle || isTogglingFavorite) return

    setIsTogglingFavorite(true)
    try {
      await onFavoriteToggle(houseBuyerId)
    } finally {
      setIsTogglingFavorite(false)
    }
  }

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!houseBuyerId || !onRemove) return
    onRemove(houseBuyerId)
  }

  const detailUrl = houseBuyerId
    ? `/client/houses/${houseBuyerId}`
    : `/client/houses/preview/${house.externalId}`

  return (
    <Link
      href={detailUrl}
      className={`
        block bg-white rounded-xl shadow-sm border border-gray-200
        hover:shadow-md hover:border-gray-300
        transition-all duration-200
        overflow-hidden
        ${className}
      `}
    >
      {/* Image */}
      <div className="relative aspect-[16/10] bg-gray-100">
        {hasImage ? (
          <Image
            src={getHighResImageUrl(photoUrl)}
            alt={house.address}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            quality={90}
            unoptimized
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </div>
        )}

        {/* Status Badge */}
        {house.listingStatus && (
          <div className="absolute top-3 left-3">
            <span
              className={`
                inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                ${getStatusColor(house.listingStatus)}
              `}
            >
              {getStatusLabel(house.listingStatus)}
            </span>
          </div>
        )}

        {/* Match Score Badge */}
        {matchScore !== undefined && matchScore !== null && (
          <div className="absolute top-3 right-3">
            <span
              className={`
                inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                ${matchScore >= 80 ? 'bg-[#E3F2FD] text-[#0D47A1]' : ''}
                ${matchScore >= 60 && matchScore < 80 ? 'bg-amber-100 text-amber-800' : ''}
                ${matchScore < 60 ? 'bg-gray-100 text-gray-800' : ''}
              `}
            >
              {matchScore}% Match
            </span>
          </div>
        )}

        {/* Favorite Button */}
        {showActions && houseBuyerId && onFavoriteToggle && (
          <button
            onClick={handleFavoriteClick}
            disabled={isTogglingFavorite}
            className={`
              absolute bottom-3 right-3
              w-10 h-10 rounded-full
              flex items-center justify-center
              shadow-md
              transition-all duration-150
              ${isFavorite ? 'bg-red-500 text-white' : 'bg-white/90 text-gray-600 hover:text-red-500'}
              disabled:opacity-50
            `}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <svg
              className="w-5 h-5"
              fill={isFavorite ? 'currentColor' : 'none'}
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
          </button>
        )}

        {/* Photo count indicator */}
        {photoCount > 1 && (
          <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/60 text-white text-xs rounded-md">
            1/{photoCount}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Price */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xl font-bold text-gray-900">
            {house.price ? formatPrice(house.price) : 'Price not available'}
          </span>

          {/* Visit count badge */}
          {visitCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full" style={{ background: '#E3F2FD', color: '#006AFF' }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {visitCount} visit{visitCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Property Details */}
        <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
          {house.bedrooms !== null && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              {house.bedrooms} bd
            </span>
          )}
          {house.bathrooms !== null && (
            <span className="flex items-center gap-1">
              <span className="font-medium">·</span>
              {house.bathrooms} ba
            </span>
          )}
          {house.sqft !== null && (
            <span className="flex items-center gap-1">
              <span className="font-medium">·</span>
              {formatSqft(house.sqft)} sqft
            </span>
          )}
        </div>

        {/* Address */}
        <p className="text-sm text-gray-700 line-clamp-2">{house.address}</p>

        {/* Property Type */}
        {house.propertyType && (
          <p className="mt-1 text-xs text-gray-500 capitalize">
            {house.propertyType.replace(/_/g, ' ')}
          </p>
        )}

        {/* Actions */}
        {showActions && houseBuyerId && onRemove && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
            <button
              onClick={handleRemoveClick}
              className="text-sm text-gray-500 hover:text-red-600 transition-colors"
            >
              Remove
            </button>
          </div>
        )}
      </div>
    </Link>
  )
}

// Skeleton version for loading states
export function HouseCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-pulse">
      <div className="aspect-[16/10] bg-gray-200" />
      <div className="p-4">
        <div className="h-7 bg-gray-200 rounded w-2/3 mb-2" />
        <div className="flex gap-3 mb-2">
          <div className="h-4 bg-gray-200 rounded w-12" />
          <div className="h-4 bg-gray-200 rounded w-12" />
          <div className="h-4 bg-gray-200 rounded w-20" />
        </div>
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-2/3 mt-1" />
      </div>
    </div>
  )
}

// Compact version for lists
export function HouseCardCompact({
  house,
  houseBuyerId,
  isFavorite = false,
  onFavoriteToggle,
}: Omit<HouseCardProps, 'showActions' | 'onRemove' | 'matchScore' | 'visitCount'>) {
  const [imageError, setImageError] = useState(false)

  // Support both 'photos' and 'images' field names (API returns 'images')
  const photoUrl = house.photos?.[0] || house.images?.[0]
  const hasImage = photoUrl && !imageError

  const detailUrl = houseBuyerId
    ? `/client/houses/${houseBuyerId}`
    : `/client/houses/preview/${house.externalId}`

  return (
    <Link
      href={detailUrl}
      className="flex gap-4 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
    >
      {/* Thumbnail */}
      <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
        {hasImage ? (
          <Image
            src={getHighResImageUrl(photoUrl)}
            alt={house.address}
            fill
            className="object-cover"
            sizes="96px"
            quality={90}
            unoptimized
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900">
          {house.price ? formatPrice(house.price) : 'Price TBD'}
        </p>
        <div className="flex items-center gap-2 text-sm text-gray-600 mt-0.5">
          {house.bedrooms !== null && <span>{house.bedrooms} bd</span>}
          {house.bathrooms !== null && (
            <>
              <span className="text-gray-400">·</span>
              <span>{house.bathrooms} ba</span>
            </>
          )}
          {house.sqft !== null && (
            <>
              <span className="text-gray-400">·</span>
              <span>{formatSqft(house.sqft)} sqft</span>
            </>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1 truncate">{house.address}</p>
      </div>

      {/* Favorite */}
      {houseBuyerId && onFavoriteToggle && (
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onFavoriteToggle(houseBuyerId)
          }}
          className="flex-shrink-0 self-center p-2 text-gray-400 hover:text-red-500"
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <svg
            className="w-5 h-5"
            fill={isFavorite ? 'currentColor' : 'none'}
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
        </button>
      )}
    </Link>
  )
}
