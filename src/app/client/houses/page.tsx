'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import HouseCard, { HouseCardSkeleton } from '@/components/HouseCard'
import { NoHousesEmpty, NoSearchResultsEmpty } from '@/components/ui/EmptyState'
import { NetworkError } from '@/components/ui/ErrorState'
import { SearchInput, Select } from '@/components/ui/Form'
import Button from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'

interface House {
  id: string
  externalId: string
  address: string
  city: string
  state: string
  zipCode: string
  price: number | null
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  yearBuilt: number | null
  propertyType: string | null
  listingStatus: string | null
  photos: string[]
  lastUpdated: string
}

interface HouseBuyer {
  id: string
  houseId: string
  isFavorite: boolean
  matchScore: number | null
  notes: string | null
  createdAt: string
  house: House
  visitCount: number
}

interface ApiResponse {
  success: boolean
  data: {
    items: HouseBuyer[]
    pagination: {
      total: number
      page: number
      limit: number
      totalPages: number
    }
  }
  error?: {
    message: string
  }
}

const sortOptions = [
  { value: 'createdAt-desc', label: 'Recently Added' },
  { value: 'matchScore-desc', label: 'Best Match' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'beds-desc', label: 'Most Bedrooms' },
  { value: 'sqft-desc', label: 'Largest First' },
]

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'for_sale', label: 'For Sale' },
  { value: 'pending', label: 'Pending' },
  { value: 'sold', label: 'Sold' },
]

export default function HousesPage() {
  const router = useRouter()
  const { success, error: showError } = useToast()

  const [houses, setHouses] = useState<HouseBuyer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('createdAt-desc')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Modal state
  const [removeModalOpen, setRemoveModalOpen] = useState(false)
  const [houseToRemove, setHouseToRemove] = useState<HouseBuyer | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  // Match score calculation
  const [isCalculatingScores, setIsCalculatingScores] = useState(false)

  // Calculate match scores for all houses
  const calculateMatchScores = async () => {
    setIsCalculatingScores(true)
    try {
      const response = await fetch('/api/houses/calculate-scores', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to calculate scores')
      }

      success(`Calculated scores for ${data.data.scores.length} houses`)
      // Refresh the list to show updated scores
      fetchHouses()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to calculate scores')
    } finally {
      setIsCalculatingScores(false)
    }
  }

  // Fetch houses
  const fetchHouses = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [sortBy, sortOrder] = sort.split('-')
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        sortBy,
        sortOrder,
      })

      if (search) params.append('search', search)
      if (status) params.append('status', status)
      if (showFavoritesOnly) params.append('isFavorite', 'true')

      const response = await fetch(`/api/houses?${params.toString()}`)
      const data: ApiResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch houses')
      }

      setHouses(data.data.items)
      setTotalPages(data.data.pagination.totalPages)
      setTotal(data.data.pagination.total)
    } catch (err) {
      console.error('Fetch houses error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load houses')
    } finally {
      setIsLoading(false)
    }
  }, [page, search, status, sort, showFavoritesOnly])

  useEffect(() => {
    fetchHouses()
  }, [fetchHouses])

  // Handle favorite toggle
  const handleFavoriteToggle = async (houseBuyerId: string) => {
    const house = houses.find((h) => h.id === houseBuyerId)
    if (!house) return

    try {
      const response = await fetch(`/api/houses/${houseBuyerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !house.isFavorite }),
      })

      if (!response.ok) {
        throw new Error('Failed to update favorite')
      }

      // Update local state
      setHouses((prev) =>
        prev.map((h) =>
          h.id === houseBuyerId ? { ...h, isFavorite: !h.isFavorite } : h
        )
      )

      success(
        house.isFavorite ? 'Removed from favorites' : 'Added to favorites'
      )
    } catch {
      showError('Failed to update favorite')
    }
  }

  // Handle remove
  const handleRemoveClick = (houseBuyerId: string) => {
    const house = houses.find((h) => h.id === houseBuyerId)
    if (house) {
      setHouseToRemove(house)
      setRemoveModalOpen(true)
    }
  }

  const confirmRemove = async () => {
    if (!houseToRemove) return

    setIsRemoving(true)
    try {
      const response = await fetch(`/api/houses/${houseToRemove.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to remove house')
      }

      setHouses((prev) => prev.filter((h) => h.id !== houseToRemove.id))
      setTotal((prev) => prev - 1)
      success('House removed from your list')
      setRemoveModalOpen(false)
    } catch {
      showError('Failed to remove house')
    } finally {
      setIsRemoving(false)
    }
  }

  // Handle search with debounce
  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handleClearSearch = () => {
    setSearch('')
    setPage(1)
  }

  // Render loading state
  if (isLoading && houses.length === 0) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Houses</h1>
          <Button onClick={() => router.push('/client/houses/add')}>
            Add House
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <HouseCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  // Render error state
  if (error && houses.length === 0) {
    return (
      <div className="container mx-auto px-4 py-6">
        <NetworkError onRetry={fetchHouses} />
      </div>
    )
  }

  // Render empty state
  const showEmptyState = !isLoading && houses.length === 0

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Houses</h1>
          {total > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              {total} house{total !== 1 ? 's' : ''} in your list
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {houses.length > 0 && (
            <Button
              variant="outline"
              onClick={calculateMatchScores}
              disabled={isCalculatingScores}
            >
              {isCalculatingScores ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Calculating...
                </>
              ) : (
                <>
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
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  Calculate Scores
                </>
              )}
            </Button>
          )}
          <Button onClick={() => router.push('/client/houses/add')}>
            Add House
          </Button>
        </div>
      </div>

      {/* Filters */}
      {(houses.length > 0 || search || status || showFavoritesOnly) && (
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <SearchInput
              placeholder="Search by address, city, or state..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              onClear={handleClearSearch}
            />
          </div>
          <div className="flex gap-2">
            <Select
              options={statusOptions}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
              selectSize="md"
            />
            <Select
              options={sortOptions}
              value={sort}
              onChange={(e) => {
                setSort(e.target.value)
                setPage(1)
              }}
              selectSize="md"
            />
            <button
              onClick={() => {
                setShowFavoritesOnly(!showFavoritesOnly)
                setPage(1)
              }}
              className={`
                px-4 py-2 rounded-lg border transition-colors
                ${
                  showFavoritesOnly
                    ? 'bg-red-50 border-red-200 text-red-600'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }
              `}
              aria-pressed={showFavoritesOnly}
            >
              <svg
                className="w-5 h-5"
                fill={showFavoritesOnly ? 'currentColor' : 'none'}
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
          </div>
        </div>
      )}

      {/* Empty State */}
      {showEmptyState && !search && !status && !showFavoritesOnly && (
        <NoHousesEmpty onAddHouse={() => router.push('/client/houses/add')} />
      )}

      {showEmptyState && (search || status || showFavoritesOnly) && (
        <NoSearchResultsEmpty onClearSearch={handleClearSearch} />
      )}

      {/* Houses Grid */}
      {houses.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {houses.map((houseBuyer) => (
              <HouseCard
                key={houseBuyer.id}
                house={houseBuyer.house}
                houseBuyerId={houseBuyer.id}
                isFavorite={houseBuyer.isFavorite}
                matchScore={houseBuyer.matchScore}
                visitCount={houseBuyer.visitCount}
                onFavoriteToggle={handleFavoriteToggle}
                onRemove={handleRemoveClick}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="px-4 text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Remove Confirmation Modal */}
      <ConfirmModal
        isOpen={removeModalOpen}
        onClose={() => setRemoveModalOpen(false)}
        onConfirm={confirmRemove}
        title="Remove House"
        message={`Are you sure you want to remove "${houseToRemove?.house.address}" from your list? Your visits and recordings will also be removed.`}
        confirmLabel="Remove"
        variant="danger"
        isLoading={isRemoving}
      />
    </div>
  )
}
