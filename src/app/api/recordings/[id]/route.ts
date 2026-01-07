import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api-response'
import { getRequestUser } from '@/lib/auth'
import { deleteFile } from '@/lib/storage'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// Schema for updating a recording
const updateRecordingSchema = z.object({
  roomId: z.string().min(1).optional(),
  roomName: z.string().min(1).optional(),
  transcript: z.string().optional(),
  sentiment: z.string().optional(),
  keyPoints: z.array(z.string()).optional(),
})

/**
 * GET /api/recordings/[id]
 * Get a single recording
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    const { id } = await params

    const recording = await prisma.recording.findUnique({
      where: { id },
      include: {
        visit: {
          select: {
            id: true,
            status: true,
            scheduledAt: true,
            house: {
              select: {
                id: true,
                address: true,
                city: true,
                state: true,
                price: true,
                images: true,
              },
            },
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        photos: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!recording || recording.deletedAt) {
      return errorResponse(ErrorCode.RECORDING_NOT_FOUND, 'Recording not found')
    }

    // Check access
    if (user.role === 'BUYER' && recording.buyerId !== user.userId) {
      return errorResponse(ErrorCode.FORBIDDEN, 'Access denied')
    }

    if (user.role === 'REALTOR') {
      const connection = await prisma.buyerRealtor.findFirst({
        where: {
          realtorId: user.userId,
          buyerId: recording.buyerId,
          deletedAt: null,
        },
      })
      if (!connection) {
        return errorResponse(ErrorCode.FORBIDDEN, 'Not connected to this buyer')
      }
    }

    return successResponse({
        id: recording.id,
        visitId: recording.visitId,
        roomId: recording.roomId,
        roomName: recording.roomName,
        audioUrl: recording.audioUrl,
        audioSize: recording.audioSize,
        audioDuration: recording.audioDuration,
        status: recording.status,
        transcript: recording.transcript,
        detectedLanguage: recording.detectedLanguage,
        sentiment: recording.sentiment,
        keyPoints: recording.keyPoints,
        photos: recording.photos,
        visit: recording.visit,
        buyer: recording.buyer,
        createdAt: recording.createdAt,
        updatedAt: recording.updatedAt,
      })
  } catch (error) {
    console.error('Get recording error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to get recording')
  }
}

/**
 * PATCH /api/recordings/[id]
 * Update a recording
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    const { id } = await params
    const body = await request.json()

    const validation = updateRecordingSchema.safeParse(body)
    if (!validation.success) {
      return errorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid request body',
          validation.error.flatten().fieldErrors
        )
    }

    const recording = await prisma.recording.findUnique({
      where: { id },
      select: {
        id: true,
        buyerId: true,
        deletedAt: true,
        status: true,
      },
    })

    if (!recording || recording.deletedAt) {
      return errorResponse(ErrorCode.RECORDING_NOT_FOUND, 'Recording not found')
    }

    // Only the buyer who owns the recording or admin can update it
    if (user.role !== 'ADMIN' && recording.buyerId !== user.userId) {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only the recording owner can update it')
    }

    const updated = await prisma.recording.update({
      where: { id },
      data: validation.data,
      include: {
        photos: true,
      },
    })

    return successResponse({
        message: 'Recording updated',
        recording: {
          id: updated.id,
          roomId: updated.roomId,
          roomName: updated.roomName,
          status: updated.status,
          transcript: updated.transcript,
          sentiment: updated.sentiment,
          keyPoints: updated.keyPoints,
          photos: updated.photos,
          updatedAt: updated.updatedAt,
        },
      })
  } catch (error) {
    console.error('Update recording error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to update recording')
  }
}

/**
 * DELETE /api/recordings/[id]
 * Delete a recording (soft delete)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    const { id } = await params

    const recording = await prisma.recording.findUnique({
      where: { id },
      include: {
        photos: true,
      },
    })

    if (!recording || recording.deletedAt) {
      return errorResponse(ErrorCode.RECORDING_NOT_FOUND, 'Recording not found')
    }

    // Only the buyer who owns the recording or admin can delete it
    if (user.role !== 'ADMIN' && recording.buyerId !== user.userId) {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only the recording owner can delete it')
    }

    // Delete files from storage
    const filesToDelete: string[] = []
    if (recording.audioUrl) {
      filesToDelete.push(recording.audioUrl)
    }
    for (const photo of recording.photos) {
      filesToDelete.push(photo.photoUrl)
    }

    // Delete files in parallel (best effort)
    await Promise.allSettled(filesToDelete.map((url) => deleteFile(url)))

    // Soft delete recording
    await prisma.recording.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    return successResponse({
        message: 'Recording deleted',
        id,
      })
  } catch (error) {
    console.error('Delete recording error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to delete recording')
  }
}
