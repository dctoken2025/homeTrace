'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { SearchInput, Select } from '@/components/ui/Form'
import { NetworkError } from '@/components/ui/ErrorState'
import { format, parseISO } from 'date-fns'

interface User {
  id: string
  email: string
  name: string
  phone: string | null
  role: string
  hasCompletedOnboarding: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  housesCount: number
  visitsCount: number
  recordingsCount: number
}

const roleOptions = [
  { value: '', label: 'All Roles' },
  { value: 'BUYER', label: 'Buyers' },
  { value: 'REALTOR', label: 'Realtors' },
  { value: 'ADMIN', label: 'Admins' },
]

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [includeDeleted, setIncludeDeleted] = useState(false)

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })

      if (search) params.append('search', search)
      if (role) params.append('role', role)
      if (includeDeleted) params.append('includeDeleted', 'true')

      const response = await fetch(`/api/admin/users?${params.toString()}`, {
        credentials: 'include',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch users')
      }

      if (!data.data) {
        throw new Error('Invalid response format')
      }

      setUsers(data.data.items || [])
      setTotalPages(data.data.pagination?.totalPages || 1)
      setTotal(data.data.pagination?.total || 0)
    } catch (err) {
      console.error('Fetch users error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [page, search, role, includeDeleted])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800'
      case 'REALTOR':
        return 'bg-[#BBDEFB] text-[#0D47A1]'
      case 'BUYER':
        return 'bg-[#E3F2FD] text-[#006AFF]'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (error && users.length === 0) {
    return <NetworkError onRetry={fetchUsers} />
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchInput
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              onClear={() => handleSearch('')}
            />
          </div>
          <Select
            options={roleOptions}
            value={role}
            onChange={(e) => {
              setRole(e.target.value)
              setPage(1)
            }}
            selectSize="md"
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(e) => {
                setIncludeDeleted(e.target.checked)
                setPage(1)
              }}
              className="w-4 h-4 rounded border-gray-300"
              style={{ accentColor: '#006AFF' }}
            />
            <span className="text-sm text-gray-600">Show deleted</span>
          </label>
        </div>
      </Card>

      {/* Stats */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {total} user{total !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Users Table */}
      <Card padding="none">
        {loading && users.length === 0 ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className={`hover:bg-gray-50 ${user.deletedAt ? 'opacity-50' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {user.housesCount} houses
                      </div>
                      <div className="text-sm text-gray-500">
                        {user.visitsCount} visits, {user.recordingsCount} recordings
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(parseISO(user.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.deletedAt ? (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          Deleted
                        </span>
                      ) : user.hasCompletedOnboarding ? (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

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
