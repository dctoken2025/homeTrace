import { mkdir, writeFile, unlink, stat, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

// Storage configuration
const STORAGE_BASE = process.env.STORAGE_PATH || './uploads'
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_AUDIO_TYPES = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg']
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export interface UploadResult {
  url: string
  size: number
  filename: string
}

export interface StorageError extends Error {
  code: 'FILE_TOO_LARGE' | 'INVALID_TYPE' | 'STORAGE_ERROR' | 'FILE_NOT_FOUND'
}

/**
 * Ensure storage directory exists
 */
async function ensureDirectory(dir: string): Promise<void> {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
}

/**
 * Get the full storage path for a given subdirectory
 */
function getStoragePath(...subPaths: string[]): string {
  return path.join(STORAGE_BASE, ...subPaths)
}

/**
 * Generate a unique filename with extension
 */
function generateFilename(originalName: string, prefix: string = ''): string {
  const ext = path.extname(originalName) || '.webm'
  const id = randomUUID()
  return prefix ? `${prefix}_${id}${ext}` : `${id}${ext}`
}

/**
 * Validate file type
 */
function validateFileType(mimeType: string, allowedTypes: string[]): boolean {
  return allowedTypes.includes(mimeType)
}

/**
 * Upload an audio file for a recording
 */
export async function uploadAudio(
  file: Buffer | Blob,
  visitId: string,
  roomId: string,
  mimeType: string = 'audio/webm'
): Promise<UploadResult> {
  // Validate file type
  if (!validateFileType(mimeType, ALLOWED_AUDIO_TYPES)) {
    const error = new Error(`Invalid audio type: ${mimeType}. Allowed: ${ALLOWED_AUDIO_TYPES.join(', ')}`) as StorageError
    error.code = 'INVALID_TYPE'
    throw error
  }

  // Convert Blob to Buffer if needed
  const buffer = file instanceof Blob
    ? Buffer.from(await file.arrayBuffer())
    : file

  // Validate file size
  if (buffer.length > MAX_FILE_SIZE) {
    const error = new Error(`File too large: ${buffer.length} bytes. Max: ${MAX_FILE_SIZE} bytes`) as StorageError
    error.code = 'FILE_TOO_LARGE'
    throw error
  }

  // Create storage path: /uploads/audio/{visitId}/{filename}
  const audioDir = getStoragePath('audio', visitId)
  await ensureDirectory(audioDir)

  // Generate filename
  const ext = mimeType === 'audio/webm' ? '.webm' :
              mimeType === 'audio/mp4' ? '.m4a' :
              mimeType === 'audio/mpeg' ? '.mp3' :
              mimeType === 'audio/wav' ? '.wav' : '.audio'
  const filename = `${roomId}_${randomUUID()}${ext}`
  const filePath = path.join(audioDir, filename)

  try {
    await writeFile(filePath, buffer)

    return {
      url: `/api/storage/audio/${visitId}/${filename}`,
      size: buffer.length,
      filename,
    }
  } catch (err) {
    const error = new Error(`Failed to save audio file: ${err}`) as StorageError
    error.code = 'STORAGE_ERROR'
    throw error
  }
}

/**
 * Upload a photo for a recording
 */
export async function uploadPhoto(
  file: Buffer | Blob,
  recordingId: string,
  mimeType: string = 'image/jpeg'
): Promise<UploadResult> {
  // Validate file type
  if (!validateFileType(mimeType, ALLOWED_IMAGE_TYPES)) {
    const error = new Error(`Invalid image type: ${mimeType}. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`) as StorageError
    error.code = 'INVALID_TYPE'
    throw error
  }

  // Convert Blob to Buffer if needed
  const buffer = file instanceof Blob
    ? Buffer.from(await file.arrayBuffer())
    : file

  // Validate file size
  if (buffer.length > MAX_FILE_SIZE) {
    const error = new Error(`File too large: ${buffer.length} bytes. Max: ${MAX_FILE_SIZE} bytes`) as StorageError
    error.code = 'FILE_TOO_LARGE'
    throw error
  }

  // Create storage path: /uploads/photos/{recordingId}/{filename}
  const photoDir = getStoragePath('photos', recordingId)
  await ensureDirectory(photoDir)

  // Generate filename
  const ext = mimeType === 'image/jpeg' ? '.jpg' :
              mimeType === 'image/png' ? '.png' :
              mimeType === 'image/webp' ? '.webp' :
              mimeType === 'image/gif' ? '.gif' : '.img'
  const filename = `${randomUUID()}${ext}`
  const filePath = path.join(photoDir, filename)

  try {
    await writeFile(filePath, buffer)

    return {
      url: `/api/storage/photos/${recordingId}/${filename}`,
      size: buffer.length,
      filename,
    }
  } catch (err) {
    const error = new Error(`Failed to save photo file: ${err}`) as StorageError
    error.code = 'STORAGE_ERROR'
    throw error
  }
}

/**
 * Delete a file from storage
 */
export async function deleteFile(url: string): Promise<void> {
  // Parse URL to get file path
  // URL format: /api/storage/{type}/{id}/{filename}
  const match = url.match(/\/api\/storage\/(\w+)\/([^/]+)\/(.+)$/)
  if (!match) {
    const error = new Error(`Invalid storage URL: ${url}`) as StorageError
    error.code = 'FILE_NOT_FOUND'
    throw error
  }

  const [, type, id, filename] = match
  const filePath = getStoragePath(type, id, filename)

  try {
    await unlink(filePath)
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      // File doesn't exist, that's okay
      return
    }
    const error = new Error(`Failed to delete file: ${err}`) as StorageError
    error.code = 'STORAGE_ERROR'
    throw error
  }
}

/**
 * Get file from storage
 */
export async function getFile(type: string, id: string, filename: string): Promise<{ buffer: Buffer; stats: { size: number } } | null> {
  const filePath = getStoragePath(type, id, filename)

  try {
    const [buffer, stats] = await Promise.all([
      readFile(filePath),
      stat(filePath),
    ])
    return { buffer, stats: { size: stats.size } }
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return null
    }
    throw err
  }
}

/**
 * Get file stats
 */
export async function getFileStats(url: string): Promise<{ size: number } | null> {
  const match = url.match(/\/api\/storage\/(\w+)\/([^/]+)\/(.+)$/)
  if (!match) {
    return null
  }

  const [, type, id, filename] = match
  const filePath = getStoragePath(type, id, filename)

  try {
    const stats = await stat(filePath)
    return { size: stats.size }
  } catch {
    return null
  }
}

/**
 * Get content type from filename
 */
export function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  const types: Record<string, string> = {
    '.webm': 'audio/webm',
    '.m4a': 'audio/mp4',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  }
  return types[ext] || 'application/octet-stream'
}
