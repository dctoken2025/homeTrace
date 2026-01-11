'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { SearchInput, Select } from '@/components/ui/Form'
import { NetworkError } from '@/components/ui/ErrorState'
import { formatPrice } from '@/lib/format-utils'
import { format, parseISO } from 'date-fns'

interface House {
  id: string
  externalId: string | null
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
  createdAt: string
  deletedAt: string | null
  buyersCount: number
  visitsCount: number
}

export default function AdminHousesPage() {
  const [houses, setHouses] = useState<House[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('')

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchHouses = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })

      if (search) params.append('search', search)
      if (city) params.append('city', city)

      const response = await fetch(`/api/admin/houses?${params.toString()}`, {
        credentials: 'include',
      })

      // If admin houses endpoint doesn't exist yet, use regular houses endpoint
      if (response.status === 404) {
        // Fallback to basic implementation
        const housesResponse = await fetch('/api/houses?limit=20', {
          credentials: 'include',
        })
        const data = await housesResponse.json()

        if (housesResponse.ok && data.data) {
          setHouses(data.data.items?.map((h: any) => ({
            id: h.house?.id || h.id,
            externalId: h.house?.externalId || h.externalId,
            address: h.house?.address || h.address,
            city: h.house?.city || h.city,
            state: h.house?.state || h.state,
            zipCode: h.house?.zipCode || h.zipCode,
            price: h.house?.price || h.price,
            bedrooms: h.house?.bedrooms || h.bedrooms,
            bathrooms: h.house?.bathrooms || h.bathrooms,
            sqft: h.house?.sqft || h.sqft,
            propertyType: h.house?.propertyType || h.propertyType,
            listingStatus: h.house?.listingStatus || h.listingStatus,
            images: h.house?.photos || h.photos || [],
            createdAt: h.createdAt,
            deletedAt: null,
            buyersCount: 1,
            visitsCount: h.visitCount || 0,
          })) || [])
          setTotal(data.data.pagination?.total || 0)
          setTotalPages(data.data.pagination?.totalPages || 1)
        }
        setLoading(false)
        return
      }

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
  }, [page, search, city])

  useEffect(() => {
    fetchHouses()
  }, [fetchHouses])

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  if (error && houses.length === 0) {
    return <NetworkError onRetry={fetchHouses} />
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchInput
              placeholder="Search by address..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              onClear={() => handleSearch('')}
            />
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {total} house{total !== 1 ? 's' : ''} in the system
        </p>
      </div>

      {/* Houses Grid */}
      {loading && houses.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <div className="animate-pulse">
                <div className="h-48 bg-gray-200 rounded-lg mb-4" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            </Card>
          ))}
        </div>
      ) : houses.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-500">No houses found</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {houses.map((house) => (
            <Card key={house.id} padding="none" className="overflow-hidden">
              <div className="relative h-48 bg-gray-200">
                {house.images && house.images.length > 0 ? (
                  <Image
                    src={house.images[0]}
                    alt={house.address}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                )}
                {house.listingStatus && (
                  <div className="absolute top-2 left-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                      house.listingStatus === 'for_sale' ? 'bg-green-100 text-green-800' :
                      house.listingStatus === 'pending' ? 'bg-amber-100 text-amber-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {house.listingStatus.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="font-semibold text-gray-900">
                  {house.price ? formatPrice(house.price) : 'Price N/A'}
                </p>
                <p className="text-sm text-gray-600">{house.address}</p>
                <p className="text-sm text-gray-500">
                  {house.city}, {house.state} {house.zipCode}
                </p>
                <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                  {house.bedrooms && <span>{house.bedrooms} bd</span>}
                  {house.bathrooms && <span>{house.bathrooms} ba</span>}
                  {house.sqft && <span>{house.sqft.toLocaleString()} sqft</span>}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
                  <span>{house.buyersCount} buyer{house.buyersCount !== 1 ? 's' : ''}</span>
                  <span>{house.visitsCount} visit{house.visitsCount !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
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
    </div>
  )
}
