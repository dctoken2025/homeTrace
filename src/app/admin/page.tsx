'use client'

import { useState, useEffect, useCallback } from 'react'
import Card from '@/components/ui/Card'
import { NetworkError } from '@/components/ui/ErrorState'

interface Stats {
  users: {
    total: number
    buyers: number
    realtors: number
    admins: number
    newLast7Days: number
  }
  houses: {
    total: number
  }
  visits: {
    total: number
    completed: number
    completionRate: number
  }
  recordings: {
    total: number
  }
  reports: {
    total: number
  }
  api: {
    total: number
    success: number
    errors: number
    byService: Record<string, number>
  }
  userGrowth: Record<string, number>
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem('auth_token')

      if (!token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch stats')
      }

      if (!data.data) {
        throw new Error('Invalid response format')
      }

      setStats(data.data)
    } catch (err) {
      console.error('Fetch stats error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                <div className="h-8 bg-gray-200 rounded w-16" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return <NetworkError onRetry={fetchStats} />
  }

  if (!stats) return null

  return (
    <div className="space-y-8">
      {/* User Stats */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Users</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <p className="text-sm text-gray-500">Total Users</p>
            <p className="text-3xl font-bold text-gray-900">{stats.users.total}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Buyers</p>
            <p className="text-3xl font-bold" style={{ color: '#006AFF' }}>{stats.users.buyers}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Realtors</p>
            <p className="text-3xl font-bold" style={{ color: '#0D47A1' }}>{stats.users.realtors}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Admins</p>
            <p className="text-3xl font-bold text-purple-600">{stats.users.admins}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">New (7 days)</p>
            <p className="text-3xl font-bold text-amber-600">+{stats.users.newLast7Days}</p>
          </Card>
        </div>
      </div>

      {/* Activity Stats */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <p className="text-sm text-gray-500">Total Houses</p>
            <p className="text-3xl font-bold text-gray-900">{stats.houses.total}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Total Visits</p>
            <p className="text-3xl font-bold text-gray-900">{stats.visits.total}</p>
            <p className="text-xs text-gray-400 mt-1">
              {stats.visits.completed} completed ({stats.visits.completionRate}%)
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Total Recordings</p>
            <p className="text-3xl font-bold text-gray-900">{stats.recordings.total}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">AI Reports</p>
            <p className="text-3xl font-bold text-gray-900">{stats.reports.total}</p>
          </Card>
        </div>
      </div>

      {/* API Stats */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">API Usage (Last 24h)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <p className="text-sm text-gray-500">Total Requests</p>
            <p className="text-3xl font-bold text-gray-900">{stats.api.total}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Successful</p>
            <p className="text-3xl font-bold text-green-600">{stats.api.success}</p>
            <p className="text-xs text-gray-400 mt-1">
              {stats.api.total > 0
                ? Math.round((stats.api.success / stats.api.total) * 100)
                : 0}
              % success rate
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Errors</p>
            <p className="text-3xl font-bold text-red-600">{stats.api.errors}</p>
          </Card>
        </div>

        {Object.keys(stats.api.byService).length > 0 && (
          <Card className="mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Requests by Service</h3>
            <div className="space-y-2">
              {Object.entries(stats.api.byService)
                .sort((a, b) => b[1] - a[1])
                .map(([service, count]) => (
                  <div key={service} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{service}</span>
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                  </div>
                ))}
            </div>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/admin/users"
            className="block p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: '#E3F2FD' }}>
                <svg className="w-6 h-6" style={{ color: '#006AFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Manage Users</p>
                <p className="text-sm text-gray-500">View and edit user accounts</p>
              </div>
            </div>
          </a>

          <a
            href="/admin/houses"
            className="block p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: '#BBDEFB' }}>
                <svg className="w-6 h-6" style={{ color: '#0D47A1' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">View Houses</p>
                <p className="text-sm text-gray-500">Browse all property listings</p>
              </div>
            </div>
          </a>

          <a
            href="/admin/logs"
            className="block p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">API Logs</p>
                <p className="text-sm text-gray-500">View API request history</p>
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}
