import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, ErrorCode, paginatedResponse, Errors } from '@/lib/api-response'
import { getSessionUser } from '@/lib/auth-session'
import { uploadAudio } from '@/lib/storage'
import { z } from 'zod'
import { DEFAULT_ROOMS } from '@/types'

// Schema for query params
const querySchema = z.object({
  visitId: z.string().uuid().optional(),
  roomId: z.string().optional(),
  status: z.enum(['UPLOADING', 'UPLOADED', 'TRANSCRIBING', 'TRANSCRIBED', 'ANALYZED', 'FAILED']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
})

// Schema for creating a recording
const createRecordingSchema = z.object({
  visitId: z.string().uuid(),
  roomId: z.string().min(1),
  roomName: z.string().min(1).optional(),
  audioDuration: z.number().min(0).optional(),
})

/**
 * GET /api/recordings
 * List recordings with filters
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries())
    const queryValidation = querySchema.safeParse(searchParams)

    if (!queryValidation.success) {
      return errorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid query parameters',
          queryValidation.error.flatten().fieldErrors
        )
    }

    const { visitId, roomId, status, page, limit } = queryValidation.data
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {
      deletedAt: null,
    }

    // Role-based filtering
    if (session.role === 'BUYER') {
      where.buyerId = session.userId
    } else if (session.role === 'REALTOR') {
      // Get connected buyers
      const connectedBuyers = await prisma.buyerRealtor.findMany({
        where: { realtorId: session.userId },
        select: { buyerId: true },
      })
      const buyerIds = connectedBuyers.map((c) => c.buyerId)
      where.buyerId = { in: buyerIds }
    }

    if (visitId) where.visitId = visitId
    if (roomId) where.roomId = roomId
    if (status) where.status = status

    // Get recordings with count
    const [recordings, total] = await Promise.all([
      prisma.recording.findMany({
        where,
        include: {
          visit: {
            select: {
              id: true,
              status: true,
              house: {
                select: {
                  id: true,
                  address: true,
                  city: true,
                  state: true,
                },
              },
            },
          },
          buyer: {
            select: {
              id: true,
              name: true,
            },
          },
          photos: {
            select: {
              id: true,
              photoUrl: true,
              caption: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.recording.count({ where }),
    ])

    return paginatedResponse(
      recordings.map((r) => ({
        id: r.id,
        visitId: r.visitId,
        roomId: r.roomId,
        roomName: r.roomName,
        audioUrl: r.audioUrl,
        audioSize: r.audioSize,
        audioDuration: r.audioDuration,
        status: r.status,
        transcript: r.transcript,
        detectedLanguage: r.detectedLanguage,
        sentiment: r.sentiment,
        keyPoints: r.keyPoints,
        photos: r.photos,
        visit: r.visit,
        buyer: r.buyer,
        createdAt: r.createdAt,
      })),
      page,
      limit,
      total
    )
  } catch (error) {
    console.error('List recordings error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to list recordings')
  }
}

/**
 * POST /api/recordings
 * Create a new recording with audio upload
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    // Only buyers can create recordings
    if (session.role !== 'BUYER' && session.role !== 'ADMIN') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only buyers can create recordings')
    }

    // Handle multipart form data
    const formData = await request.formData()
    const audio = formData.get('audio') as Blob | null
    const visitId = formData.get('visitId') as string
    const roomId = formData.get('roomId') as string
    const roomName = formData.get('roomName') as string | null
    const audioDuration = formData.get('audioDuration')

    // Validate required fields
    const validation = createRecordingSchema.safeParse({
      visitId,
      roomId,
      roomName,
      audioDuration: audioDuration ? parseFloat(audioDuration as string) : undefined,
    })

    if (!validation.success) {
      return errorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid request data',
          validation.error.flatten().fieldErrors
        )
    }

    // Check if visit exists and is accessible
    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      select: {
        id: true,
        buyerId: true,
        status: true,
        houseId: true,
        deletedAt: true,
      },
    })

    if (!visit || visit.deletedAt) {
      return errorResponse(ErrorCode.VISIT_NOT_FOUND, 'Visit not found')
    }

    // Only the visit owner can add recordings
    if (session.role !== 'ADMIN' && visit.buyerId !== session.userId) {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only the visit owner can add recordings')
    }

    // Visit must be in progress (or scheduled for quick recordings)
    if (visit.status !== 'IN_PROGRESS' && visit.status !== 'SCHEDULED') {
      return errorResponse(
          ErrorCode.INVALID_STATE_TRANSITION,
          'Can only add recordings to active visits'
        )
    }

    // Get room name from defaults if not provided
    const finalRoomName = roomName || DEFAULT_ROOMS.find((r) => r.id === roomId)?.name || roomId

    // Create recording with initial status
    let audioUrl: string | null = null
    let audioSize: number | null = null
    let status: 'UPLOADING' | 'UPLOADED' = 'UPLOADING'

    // If audio file is provided, upload it
    if (audio && audio.size > 0) {
      try {
        const uploadResult = await uploadAudio(
          audio,
          visitId,
          roomId,
          audio.type || 'audio/webm'
        )
        audioUrl = uploadResult.url
        audioSize = uploadResult.size
        status = 'UPLOADED'
      } catch (err: any) {
        if (err.code === 'FILE_TOO_LARGE') {
          return errorResponse(ErrorCode.VALIDATION_ERROR, 'Audio file is too large (max 50MB)')
        }
        if (err.code === 'INVALID_TYPE') {
          return errorResponse(ErrorCode.VALIDATION_ERROR, 'Invalid audio file type')
        }
        throw err
      }
    }

    // Create recording in database
    const recording = await prisma.recording.create({
      data: {
        visitId,
        buyerId: session.userId,
        roomId,
        roomName: finalRoomName,
        audioUrl,
        audioSize,
        audioDuration: validation.data.audioDuration ? Math.round(validation.data.audioDuration) : null,
        status,
      },
      include: {
        visit: {
          select: {
            id: true,
            house: {
              select: {
                id: true,
                address: true,
              },
            },
          },
        },
        photos: true,
      },
    })

    return successResponse({
        message: 'Recording created',
        recording: {
          id: recording.id,
          visitId: recording.visitId,
          roomId: recording.roomId,
          roomName: recording.roomName,
          audioUrl: recording.audioUrl,
          audioSize: recording.audioSize,
          audioDuration: recording.audioDuration,
          status: recording.status,
          photos: recording.photos,
          visit: recording.visit,
          createdAt: recording.createdAt,
        },
      })
  } catch (error) {
    console.error('Create recording error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to create recording')
  }
}
