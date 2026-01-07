'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { SearchInput, Select } from '@/components/ui/Form'
import { NetworkError } from '@/components/ui/ErrorState'
import { useToast } from '@/components/ui/Toast'
import Modal from '@/components/ui/Modal'

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
  propertyType: string | null
  listingStatus: string | null
  images: string[]
}

interface Buyer {
  id: string
  name: string
  email: string
}

interface HouseBuyer {
  id: string
  houseId: string
  isFavorite: boolean
  matchScore: number | null
  notes: string | null
  createdAt: string
  house: House
  buyer: Buyer
  addedByRealtor: { id: string; name: string } | null
}

interface Client {
  id: string
  name: string
  email: string
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price)
}

function getStatusColor(status: string | null): string {
  switch (status) {
    case 'for_sale':
      return 'bg-green-100 text-green-800'
    case 'pending':
      return 'bg-yellow-100 text-yellow-800'
    case 'sold':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

function getStatusLabel(status: string | null): string {
  switch (status) {
    case 'for_sale':
      return 'For Sale'
    case 'pending':
      return 'Pending'
    case 'sold':
      return 'Sold'
    default:
      return 'Unknown'
  }
}

type Filter = 'all' | 'realtor' | 'client'

export default function RealtorHouses() {
  const { success, error: showError } = useToast()

  const [houses, setHouses] = useState<HouseBuyer[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')

  // Add house modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [propertyUrl, setPropertyUrl] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Fetch houses
  const fetchHouses = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
      })

      if (search) params.append('search', search)

      const response = await fetch(`/api/houses?${params.toString()}`)
      const data = await response.json()

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
      setLoading(false)
    }
  }, [page, search])

  // Fetch clients for the add modal
  const fetchClients = useCallback(async () => {
    try {
      const response = await fetch('/api/clients')
      const data = await response.json()

      if (response.ok) {
        setClients(data.data.items || [])
      }
    } catch (err) {
      console.error('Fetch clients error:', err)
    }
  }, [])

  useEffect(() => {
    fetchHouses()
  }, [fetchHouses])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  // Filter houses locally
  const filteredHouses = houses.filter((hb) => {
    if (filter === 'all') return true
    if (filter === 'realtor') return hb.addedByRealtor !== null
    if (filter === 'client') return hb.addedByRealtor === null
    return true
  })

  // Extract property ID from URL
  const extractPropertyId = (url: string): string | null => {
    // Handle various URL formats
    const patterns = [
      /zpid[_=](\d+)/i,
      /\/(\d+)_zpid/i,
      /property\/(\d+)/i,
      /homedetails\/[^/]+\/(\d+)_zpid/i,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }

    // If it's just a number, use it directly
    if (/^\d+$/.test(url.trim())) {
      return url.trim()
    }

    return null
  }

  // Handle add house
  const handleAddHouse = async () => {
    if (!propertyUrl || !selectedClientId) {
      showError('Please fill all fields')
      return
    }

    const propertyId = extractPropertyId(propertyUrl)
    if (!propertyId) {
      showError('Could not extract property ID from URL')
      return
    }

    setIsAdding(true)

    try {
      const response = await fetch('/api/houses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          buyerId: selectedClientId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to add house')
      }

      success('House added successfully')
      setIsModalOpen(false)
      setPropertyUrl('')
      setSelectedClientId('')
      fetchHouses()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to add house')
    } finally {
      setIsAdding(false)
    }
  }

  // Handle search
  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  // Loading state
  if (loading && houses.length === 0) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Houses</h1>
            <p className="text-gray-600">Manage houses for your clients</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
              <div className="aspect-[16/10] bg-gray-200" />
              <div className="p-4">
                <div className="h-6 bg-gray-200 rounded w-2/3 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <NetworkError onRetry={fetchHouses} />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Houses</h1>
          <p className="text-gray-600">
            {total > 0 ? `${total} house${total !== 1 ? 's' : ''} for your clients` : 'Manage houses for your clients'}
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add House
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <SearchInput
            placeholder="Search by address, city, or state..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onClear={() => handleSearchChange('')}
          />
        </div>
        <div className="flex gap-2">
          {[
            { value: 'all', label: 'All Houses' },
            { value: 'realtor', label: 'Added by Me' },
            { value: 'client', label: 'Added by Client' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value as Filter)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={
                filter === option.value
                  ? { background: '#E3F2FD', color: '#006AFF' }
                  : { background: '#F3F4F6', color: '#4B5563' }
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* House Grid */}
      {filteredHouses.length === 0 ? (
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
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No houses found</h3>
          <p className="text-gray-500">
            {search ? 'Try a different search term' : 'Add houses for your clients to get started'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHouses.map((hb) => (
            <Link
              key={hb.id}
              href={`/realtor/houses/${hb.id}`}
              className="block bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all overflow-hidden"
            >
              {/* Image */}
              <div className="relative aspect-[16/10] bg-gray-100">
                {hb.house.images?.[0] ? (
                  <Image
                    src={hb.house.images[0]}
                    alt={hb.house.address}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
                {hb.house.listingStatus && (
                  <div className="absolute top-3 left-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(hb.house.listingStatus)}`}>
                      {getStatusLabel(hb.house.listingStatus)}
                    </span>
                  </div>
                )}

                {/* Favorite Badge */}
                {hb.isFavorite && (
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                      Favorite
                    </span>
                  </div>
                )}

                {/* Added By Badge */}
                <div className="absolute bottom-3 left-3">
                  <span
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                    style={hb.addedByRealtor ? { background: '#E8DEF8', color: '#6750A4' } : { background: '#E3F2FD', color: '#006AFF' }}
                  >
                    {hb.addedByRealtor ? 'Added by You' : 'Added by Client'}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                {/* Price */}
                <p className="text-xl font-bold text-gray-900 mb-1">
                  {hb.house.price ? formatPrice(hb.house.price) : 'Price TBD'}
                </p>

                {/* Property Details */}
                <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
                  {hb.house.bedrooms !== null && <span>{hb.house.bedrooms} bd</span>}
                  {hb.house.bathrooms !== null && (
                    <>
                      <span className="text-gray-400">·</span>
                      <span>{hb.house.bathrooms} ba</span>
                    </>
                  )}
                  {hb.house.sqft !== null && (
                    <>
                      <span className="text-gray-400">·</span>
                      <span>{hb.house.sqft.toLocaleString()} sqft</span>
                    </>
                  )}
                </div>

                {/* Address */}
                <p className="text-sm text-gray-700 line-clamp-1">{hb.house.address}</p>
                <p className="text-sm text-gray-500">
                  {hb.house.city}, {hb.house.state}
                </p>

                {/* Client */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Client: <span className="font-medium text-gray-700">{hb.buyer.name}</span>
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

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

      {/* Add House Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add House for Client"
        size="md"
      >
        <div className="space-y-4">
          {/* Client Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Client *
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choose a client...</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} ({client.email})
                </option>
              ))}
            </select>
          </div>

          {/* Property URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Property URL or ID *
            </label>
            <input
              type="text"
              value={propertyUrl}
              onChange={(e) => setPropertyUrl(e.target.value)}
              placeholder="Paste Zillow URL or property ID..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': '#006AFF' } as React.CSSProperties}
            />
            <p className="mt-1 text-xs text-gray-500">
              Paste a Zillow property URL or enter the property ID directly
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={handleAddHouse}
              isLoading={isAdding}
              disabled={!propertyUrl || !selectedClientId}
            >
              Add House
            </Button>
            <Button
              onClick={() => setIsModalOpen(false)}
              variant="outline"
              disabled={isAdding}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
