'use client'

import { useState, useEffect, useCallback } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Select } from '@/components/ui/Form'
import { NetworkError } from '@/components/ui/ErrorState'
import { format, parseISO } from 'date-fns'

interface ApiLog {
  id: string
  service: string
  endpoint: string
  method: string
  responseStatus: number | null
  duration: number | null
  errorMessage: string | null
  userId: string | null
  createdAt: string
}

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'success', label: 'Success' },
  { value: 'error', label: 'Errors' },
]

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<ApiLog[]>([])
  const [services, setServices] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [service, setService] = useState('')
  const [status, setStatus] = useState('')

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      })

      if (service) params.append('service', service)
      if (status) params.append('status', status)

      const response = await fetch(`/api/admin/logs?${params.toString()}`, {
        credentials: 'include',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch logs')
      }

      if (!data.data) {
        throw new Error('Invalid response format')
      }

      setLogs(data.data.items || [])
      setServices(data.data.services || [])
      setTotalPages(data.data.pagination?.totalPages || 1)
      setTotal(data.data.pagination?.total || 0)
    } catch (err) {
      console.error('Fetch logs error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load logs')
    } finally {
      setLoading(false)
    }
  }, [page, service, status])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const getStatusColor = (statusCode: number | null) => {
    if (!statusCode) return 'bg-gray-100 text-gray-800'
    if (statusCode < 300) return 'bg-green-100 text-green-800'
    if (statusCode < 400) return 'bg-[#E3F2FD] text-[#006AFF]'
    if (statusCode < 500) return 'bg-amber-100 text-amber-800'
    return 'bg-red-100 text-red-800'
  }

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'text-green-600'
      case 'POST':
        return 'text-[#006AFF]'
      case 'PUT':
      case 'PATCH':
        return 'text-amber-600'
      case 'DELETE':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const serviceOptions = [
    { value: '', label: 'All Services' },
    ...services.map((s) => ({ value: s, label: s })),
  ]

  if (error && logs.length === 0) {
    return <NetworkError onRetry={fetchLogs} />
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <Select
            options={serviceOptions}
            value={service}
            onChange={(e) => {
              setService(e.target.value)
              setPage(1)
            }}
            selectSize="md"
          />
          <Select
            options={statusOptions}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            selectSize="md"
          />
          <Button variant="outline" onClick={fetchLogs}>
            Refresh
          </Button>
        </div>
      </Card>

      {/* Stats */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {total} log{total !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Logs Table */}
      <Card padding="none">
        {loading && logs.length === 0 ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No logs found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Endpoint
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Error
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {format(parseISO(log.createdAt), 'MMM d, HH:mm:ss')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{log.service}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono font-medium ${getMethodColor(log.method)}`}>
                          {log.method}
                        </span>
                        <span className="text-sm text-gray-600 font-mono truncate max-w-xs">
                          {log.endpoint}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getStatusColor(log.responseStatus)}`}
                      >
                        {log.responseStatus || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {log.duration ? `${log.duration}ms` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {log.errorMessage && (
                        <span className="text-sm text-red-600 truncate max-w-xs block">
                          {log.errorMessage}
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
