'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  PendingRecording,
  OfflineQueueStats,
  saveRecordingOffline,
  getPendingRecordings,
  getAllOfflineRecordings,
  getRecordingsForVisit,
  getQueueStats,
  uploadRecording,
  uploadAllPending,
  deleteOfflineRecording,
  isOnline,
  subscribeToConnectivity,
  formatBytes,
} from '@/lib/offline-queue'

// ==================== TYPES ====================

interface UseOfflineSyncOptions {
  autoSync?: boolean
  syncInterval?: number // ms
  onSyncStart?: () => void
  onSyncComplete?: (successful: number, failed: number) => void
  onSyncError?: (error: Error) => void
  onOnline?: () => void
  onOffline?: () => void
}

interface UseOfflineSyncReturn {
  // State
  isOnline: boolean
  isSyncing: boolean
  stats: OfflineQueueStats
  pendingRecordings: PendingRecording[]
  syncProgress: { current: number; total: number } | null

  // Actions
  saveRecording: (
    recording: Omit<PendingRecording, 'id' | 'status' | 'retryCount' | 'createdAt'>
  ) => Promise<string>
  syncAll: () => Promise<void>
  syncOne: (id: string) => Promise<boolean>
  deleteRecording: (id: string) => Promise<void>
  refreshStats: () => Promise<void>
  getRecordingsForVisit: (visitId: string) => Promise<PendingRecording[]>
}

// ==================== HOOK ====================

export function useOfflineSync(options: UseOfflineSyncOptions = {}): UseOfflineSyncReturn {
  const {
    autoSync = true,
    syncInterval = 30000, // 30 seconds
    onSyncStart,
    onSyncComplete,
    onSyncError,
    onOnline,
    onOffline,
  } = options

  // State
  const [online, setOnline] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [stats, setStats] = useState<OfflineQueueStats>({
    pendingCount: 0,
    uploadingCount: 0,
    failedCount: 0,
    totalSize: 0,
  })
  const [pendingRecordings, setPendingRecordings] = useState<PendingRecording[]>([])
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null)

  // Refs
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  // ==================== HELPERS ====================

  const refreshStats = useCallback(async () => {
    try {
      const [newStats, recordings] = await Promise.all([
        getQueueStats(),
        getPendingRecordings(),
      ])
      if (isMountedRef.current) {
        setStats(newStats)
        setPendingRecordings(recordings)
      }
    } catch (error) {
      console.error('Failed to refresh offline stats:', error)
    }
  }, [])

  // ==================== SYNC FUNCTIONS ====================

  const syncAll = useCallback(async () => {
    if (isSyncing || !online) return

    try {
      setIsSyncing(true)
      setSyncProgress({ current: 0, total: 0 })
      onSyncStart?.()

      const pending = await getPendingRecordings()
      if (pending.length === 0) {
        setIsSyncing(false)
        setSyncProgress(null)
        return
      }

      setSyncProgress({ current: 0, total: pending.length })

      const result = await uploadAllPending((current, total) => {
        if (isMountedRef.current) {
          setSyncProgress({ current, total })
        }
      })

      onSyncComplete?.(result.successful, result.failed)
      await refreshStats()
    } catch (error) {
      onSyncError?.(error instanceof Error ? error : new Error('Sync failed'))
    } finally {
      if (isMountedRef.current) {
        setIsSyncing(false)
        setSyncProgress(null)
      }
    }
  }, [isSyncing, online, onSyncStart, onSyncComplete, onSyncError, refreshStats])

  const syncOne = useCallback(
    async (id: string): Promise<boolean> => {
      if (!online) return false

      const recordings = await getAllOfflineRecordings()
      const recording = recordings.find((r) => r.id === id)

      if (!recording) return false

      const result = await uploadRecording(recording)
      await refreshStats()

      return result.success
    },
    [online, refreshStats]
  )

  // ==================== SAVE FUNCTION ====================

  const saveRecording = useCallback(
    async (
      recording: Omit<PendingRecording, 'id' | 'status' | 'retryCount' | 'createdAt'>
    ): Promise<string> => {
      const id = await saveRecordingOffline(recording)
      await refreshStats()

      // If online and autoSync, trigger sync after a short delay
      if (online && autoSync) {
        setTimeout(() => {
          syncAll()
        }, 1000)
      }

      return id
    },
    [online, autoSync, refreshStats, syncAll]
  )

  // ==================== DELETE FUNCTION ====================

  const deleteRecordingHandler = useCallback(
    async (id: string) => {
      await deleteOfflineRecording(id)
      await refreshStats()
    },
    [refreshStats]
  )

  // ==================== GET FOR VISIT ====================

  const getRecordingsForVisitHandler = useCallback(
    async (visitId: string): Promise<PendingRecording[]> => {
      return getRecordingsForVisit(visitId)
    },
    []
  )

  // ==================== EFFECTS ====================

  // Initialize and subscribe to connectivity
  useEffect(() => {
    isMountedRef.current = true

    // Set initial online status
    setOnline(isOnline())

    // Load initial stats
    refreshStats()

    // Subscribe to connectivity changes
    const unsubscribe = subscribeToConnectivity(
      () => {
        setOnline(true)
        onOnline?.()

        // Auto sync when coming back online
        if (autoSync) {
          syncAll()
        }
      },
      () => {
        setOnline(false)
        onOffline?.()
      }
    )

    return () => {
      isMountedRef.current = false
      unsubscribe()
    }
  }, [autoSync, onOnline, onOffline, refreshStats, syncAll])

  // Setup auto-sync interval
  useEffect(() => {
    if (!autoSync || !online) {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
        syncIntervalRef.current = null
      }
      return
    }

    syncIntervalRef.current = setInterval(() => {
      if (!isSyncing && stats.pendingCount > 0) {
        syncAll()
      }
    }, syncInterval)

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
        syncIntervalRef.current = null
      }
    }
  }, [autoSync, online, syncInterval, isSyncing, stats.pendingCount, syncAll])

  return {
    isOnline: online,
    isSyncing,
    stats,
    pendingRecordings,
    syncProgress,
    saveRecording,
    syncAll,
    syncOne,
    deleteRecording: deleteRecordingHandler,
    refreshStats,
    getRecordingsForVisit: getRecordingsForVisitHandler,
  }
}

// ==================== OFFLINE INDICATOR COMPONENT ====================

interface OfflineIndicatorProps {
  className?: string
}

export function OfflineIndicator({ className = '' }: OfflineIndicatorProps) {
  const { isOnline, stats, isSyncing, syncProgress } = useOfflineSync({
    autoSync: true,
  })

  // Don't show if online and no pending
  if (isOnline && stats.pendingCount === 0 && !isSyncing) {
    return null
  }

  return (
    <div
      className={`fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80
        bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-40
        animate-slideUp ${className}`}
    >
      {!isOnline ? (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg
              className="w-5 h-5 text-yellow-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
              />
            </svg>
          </div>
          <div>
            <p className="font-medium text-gray-900">You're offline</p>
            <p className="text-sm text-gray-500">
              {stats.pendingCount > 0
                ? `${stats.pendingCount} recording${stats.pendingCount > 1 ? 's' : ''} saved locally`
                : 'Recordings will be saved locally'}
            </p>
          </div>
        </div>
      ) : isSyncing ? (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#E3F2FD' }}>
            <svg
              className="w-5 h-5 animate-spin"
              style={{ color: '#006AFF' }}
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
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900">Syncing recordings...</p>
            {syncProgress && (
              <p className="text-sm text-gray-500">
                {syncProgress.current} of {syncProgress.total}
              </p>
            )}
          </div>
        </div>
      ) : stats.pendingCount > 0 ? (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#E3F2FD' }}>
            <svg
              className="w-5 h-5"
              style={{ color: '#006AFF' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <div>
            <p className="font-medium text-gray-900">Pending upload</p>
            <p className="text-sm text-gray-500">
              {stats.pendingCount} recording{stats.pendingCount > 1 ? 's' : ''} ({formatBytes(stats.totalSize)})
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default useOfflineSync
