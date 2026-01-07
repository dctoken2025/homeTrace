/**
 * Offline Queue - IndexedDB-based storage for offline recordings
 *
 * This module provides:
 * - Local storage for audio recordings when offline
 * - Queue management for pending uploads
 * - Automatic sync when connection is restored
 * - Recovery of partial recordings
 */

// ==================== TYPES ====================

export interface PendingRecording {
  id: string
  visitId: string
  roomId: string
  roomName: string
  audioBlob: Blob
  audioDuration: number
  audioSize: number
  photos: PendingPhoto[]
  status: 'pending' | 'uploading' | 'failed'
  retryCount: number
  errorMessage?: string
  createdAt: Date
  lastAttemptAt?: Date
}

export interface PendingPhoto {
  id: string
  blob: Blob
  size: number
  caption?: string
}

export interface OfflineQueueStats {
  pendingCount: number
  uploadingCount: number
  failedCount: number
  totalSize: number
}

// ==================== CONSTANTS ====================

const DB_NAME = 'hometrace-offline'
const DB_VERSION = 1
const STORE_RECORDINGS = 'recordings'
const MAX_RETRIES = 3

// ==================== DATABASE ====================

let dbInstance: IDBDatabase | null = null

async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(new Error('Failed to open offline database'))
    }

    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create recordings store
      if (!db.objectStoreNames.contains(STORE_RECORDINGS)) {
        const store = db.createObjectStore(STORE_RECORDINGS, { keyPath: 'id' })
        store.createIndex('visitId', 'visitId', { unique: false })
        store.createIndex('status', 'status', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }
  })
}

// ==================== QUEUE OPERATIONS ====================

/**
 * Save a recording to the offline queue
 */
export async function saveRecordingOffline(
  recording: Omit<PendingRecording, 'id' | 'status' | 'retryCount' | 'createdAt'>
): Promise<string> {
  const db = await getDB()
  const id = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const pendingRecording: PendingRecording = {
    ...recording,
    id,
    status: 'pending',
    retryCount: 0,
    createdAt: new Date(),
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_RECORDINGS], 'readwrite')
    const store = transaction.objectStore(STORE_RECORDINGS)
    const request = store.add(pendingRecording)

    request.onsuccess = () => resolve(id)
    request.onerror = () => reject(new Error('Failed to save recording offline'))
  })
}

/**
 * Get all pending recordings
 */
export async function getPendingRecordings(): Promise<PendingRecording[]> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_RECORDINGS], 'readonly')
    const store = transaction.objectStore(STORE_RECORDINGS)
    const index = store.index('status')
    const request = index.getAll(IDBKeyRange.only('pending'))

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('Failed to get pending recordings'))
  })
}

/**
 * Get all recordings (any status)
 */
export async function getAllOfflineRecordings(): Promise<PendingRecording[]> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_RECORDINGS], 'readonly')
    const store = transaction.objectStore(STORE_RECORDINGS)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('Failed to get recordings'))
  })
}

/**
 * Get recordings for a specific visit
 */
export async function getRecordingsForVisit(visitId: string): Promise<PendingRecording[]> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_RECORDINGS], 'readonly')
    const store = transaction.objectStore(STORE_RECORDINGS)
    const index = store.index('visitId')
    const request = index.getAll(IDBKeyRange.only(visitId))

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('Failed to get recordings for visit'))
  })
}

/**
 * Update recording status
 */
export async function updateRecordingStatus(
  id: string,
  status: PendingRecording['status'],
  errorMessage?: string
): Promise<void> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_RECORDINGS], 'readwrite')
    const store = transaction.objectStore(STORE_RECORDINGS)
    const getRequest = store.get(id)

    getRequest.onsuccess = () => {
      const recording = getRequest.result as PendingRecording
      if (!recording) {
        reject(new Error('Recording not found'))
        return
      }

      recording.status = status
      recording.lastAttemptAt = new Date()
      if (errorMessage) {
        recording.errorMessage = errorMessage
      }
      if (status === 'failed') {
        recording.retryCount += 1
      }

      const updateRequest = store.put(recording)
      updateRequest.onsuccess = () => resolve()
      updateRequest.onerror = () => reject(new Error('Failed to update recording'))
    }

    getRequest.onerror = () => reject(new Error('Failed to get recording'))
  })
}

/**
 * Delete a recording from the queue (after successful upload)
 */
export async function deleteOfflineRecording(id: string): Promise<void> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_RECORDINGS], 'readwrite')
    const store = transaction.objectStore(STORE_RECORDINGS)
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error('Failed to delete recording'))
  })
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<OfflineQueueStats> {
  const recordings = await getAllOfflineRecordings()

  return recordings.reduce(
    (stats, recording) => {
      stats.totalSize += recording.audioSize
      switch (recording.status) {
        case 'pending':
          stats.pendingCount += 1
          break
        case 'uploading':
          stats.uploadingCount += 1
          break
        case 'failed':
          stats.failedCount += 1
          break
      }
      return stats
    },
    { pendingCount: 0, uploadingCount: 0, failedCount: 0, totalSize: 0 }
  )
}

/**
 * Clear all offline data (use with caution)
 */
export async function clearOfflineQueue(): Promise<void> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_RECORDINGS], 'readwrite')
    const store = transaction.objectStore(STORE_RECORDINGS)
    const request = store.clear()

    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error('Failed to clear queue'))
  })
}

// ==================== UPLOAD FUNCTIONS ====================

/**
 * Upload a single recording
 */
export async function uploadRecording(
  recording: PendingRecording,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; recordingId?: string; error?: string }> {
  try {
    // Update status to uploading
    await updateRecordingStatus(recording.id, 'uploading')

    // Create FormData
    const formData = new FormData()
    formData.append('visitId', recording.visitId)
    formData.append('roomId', recording.roomId)
    formData.append('roomName', recording.roomName)
    formData.append('audio', recording.audioBlob, `recording-${recording.id}.webm`)
    formData.append('duration', String(recording.audioDuration))

    // Upload with progress tracking
    const response = await fetch('/api/recordings', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Upload failed')
    }

    const result = await response.json()

    // Upload photos if any
    if (recording.photos.length > 0) {
      for (const photo of recording.photos) {
        const photoFormData = new FormData()
        photoFormData.append('photo', photo.blob, `photo-${photo.id}.jpg`)
        if (photo.caption) {
          photoFormData.append('caption', photo.caption)
        }

        await fetch(`/api/recordings/${result.data.id}/photos`, {
          method: 'POST',
          body: photoFormData,
        })
      }
    }

    // Delete from offline queue
    await deleteOfflineRecording(recording.id)

    return { success: true, recordingId: result.data.id }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Check if should retry
    if (recording.retryCount < MAX_RETRIES) {
      await updateRecordingStatus(recording.id, 'pending', errorMessage)
    } else {
      await updateRecordingStatus(recording.id, 'failed', errorMessage)
    }

    return { success: false, error: errorMessage }
  }
}

/**
 * Upload all pending recordings
 */
export async function uploadAllPending(
  onProgress?: (current: number, total: number) => void
): Promise<{ successful: number; failed: number }> {
  const pending = await getPendingRecordings()
  let successful = 0
  let failed = 0

  for (let i = 0; i < pending.length; i++) {
    const recording = pending[i]
    const result = await uploadRecording(recording)

    if (result.success) {
      successful += 1
    } else {
      failed += 1
    }

    onProgress?.(i + 1, pending.length)
  }

  return { successful, failed }
}

// ==================== CONNECTIVITY ====================

/**
 * Check if we're online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

/**
 * Subscribe to online/offline events
 */
export function subscribeToConnectivity(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)

  return () => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  }
}

// ==================== HELPERS ====================

/**
 * Generate a unique ID for offline recordings
 */
export function generateOfflineId(): string {
  return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
