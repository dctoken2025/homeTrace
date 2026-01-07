import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api-response'
import { getRequestUser } from '@/lib/auth'
import { uploadPhoto, deleteFile } from '@/lib/storage'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * POST /api/recordings/[id]/photos
 * Upload a photo for a recording
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    // Only buyers can upload photos
    if (user.role !== 'BUYER' && user.role !== 'ADMIN') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only buyers can upload photos')
    }

    const { id } = await params

    // Get recording
    const recording = await prisma.recording.findUnique({
      where: { id },
      select: {
        id: true,
        buyerId: true,
        deletedAt: true,
        visit: {
          select: {
            status: true,
          },
        },
      },
    })

    if (!recording || recording.deletedAt) {
      return errorResponse(ErrorCode.RECORDING_NOT_FOUND, 'Recording not found')
    }

    // Only the recording owner can add photos
    if (user.role !== 'ADMIN' && recording.buyerId !== user.userId) {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only the recording owner can add photos')
    }

    // Parse form data
    const formData = await request.formData()
    const photo = formData.get('photo') as Blob | null
    const caption = formData.get('caption') as string | null

    if (!photo || photo.size === 0) {
      return errorResponse(ErrorCode.VALIDATION_ERROR, 'Photo file is required')
    }

    // Upload photo
    let photoUrl: string
    let photoSize: number
    try {
      const uploadResult = await uploadPhoto(
        photo,
        id,
        photo.type || 'image/jpeg'
      )
      photoUrl = uploadResult.url
      photoSize = uploadResult.size
    } catch (err: any) {
      if (err.code === 'FILE_TOO_LARGE') {
        return errorResponse(ErrorCode.VALIDATION_ERROR, 'Photo file is too large (max 50MB)')
      }
      if (err.code === 'INVALID_TYPE') {
        return errorResponse(ErrorCode.VALIDATION_ERROR, 'Invalid image file type')
      }
      throw err
    }

    // Create photo record
    const recordingPhoto = await prisma.recordingPhoto.create({
      data: {
        recordingId: id,
        photoUrl,
        photoSize,
        caption,
      },
    })

    return successResponse({
        message: 'Photo uploaded',
        photo: {
          id: recordingPhoto.id,
          photoUrl: recordingPhoto.photoUrl,
          photoSize: recordingPhoto.photoSize,
          caption: recordingPhoto.caption,
          createdAt: recordingPhoto.createdAt,
        },
      })
  } catch (error) {
    console.error('Upload photo error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to upload photo')
  }
}

/**
 * DELETE /api/recordings/[id]/photos
 * Delete a photo (requires photoId in query params)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    const { id } = await params
    const photoId = request.nextUrl.searchParams.get('photoId')

    if (!photoId) {
      return errorResponse(ErrorCode.VALIDATION_ERROR, 'photoId is required')
    }

    // Get recording and photo
    const recording = await prisma.recording.findUnique({
      where: { id },
      select: {
        id: true,
        buyerId: true,
        deletedAt: true,
      },
    })

    if (!recording || recording.deletedAt) {
      return errorResponse(ErrorCode.RECORDING_NOT_FOUND, 'Recording not found')
    }

    // Only the recording owner or admin can delete photos
    if (user.role !== 'ADMIN' && recording.buyerId !== user.userId) {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only the recording owner can delete photos')
    }

    // Get photo
    const photo = await prisma.recordingPhoto.findUnique({
      where: { id: photoId },
    })

    if (!photo || photo.recordingId !== id) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Photo not found')
    }

    // Delete file from storage
    try {
      await deleteFile(photo.photoUrl)
    } catch {
      // Best effort, continue even if file deletion fails
    }

    // Delete photo record
    await prisma.recordingPhoto.delete({
      where: { id: photoId },
    })

    return successResponse({
        message: 'Photo deleted',
        id: photoId,
      })
  } catch (error) {
    console.error('Delete photo error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to delete photo')
  }
}
