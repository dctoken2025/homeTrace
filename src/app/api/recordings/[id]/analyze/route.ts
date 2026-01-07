import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api-response'
import { getRequestUser } from '@/lib/auth'
import { analyzeRecordingTranscript } from '@/lib/ai-match'
import { transcribeAudio, detectLanguage } from '@/lib/transcription'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * POST /api/recordings/[id]/analyze
 * Transcribe and analyze a recording
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    const { id } = await params

    // Get recording
    const recording = await prisma.recording.findUnique({
      where: { id },
      include: {
        visit: {
          select: {
            id: true,
            buyerId: true,
          },
        },
      },
    })

    if (!recording || recording.deletedAt) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Recording not found')
    }

    // Check ownership
    if (recording.buyerId !== user.userId && user.role !== 'ADMIN') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Access denied')
    }

    // Check if already analyzed
    if (recording.status === 'ANALYZED') {
      return successResponse({
          message: 'Recording already analyzed',
          recording: {
            id: recording.id,
            status: recording.status,
            transcript: recording.transcript,
            detectedLanguage: recording.detectedLanguage,
            sentiment: recording.sentiment,
            keyPoints: recording.keyPoints,
          },
        })
    }

    // Check if audio exists
    if (!recording.audioUrl) {
      return errorResponse(ErrorCode.VALIDATION_ERROR, 'No audio file to analyze')
    }

    // Update status to transcribing
    await prisma.recording.update({
      where: { id },
      data: { status: 'TRANSCRIBING' },
    })

    try {
      // Step 1: Transcribe audio
      const transcriptionResult = await transcribeAudio(recording.audioUrl)

      // Detect language if not detected
      const language =
        transcriptionResult.detectedLanguage ||
        (await detectLanguage(transcriptionResult.transcript))

      // Update with transcript
      await prisma.recording.update({
        where: { id },
        data: {
          status: 'TRANSCRIBED',
          transcript: transcriptionResult.transcript,
          detectedLanguage: language,
        },
      })

      // Step 2: Analyze transcript if we have one
      let analysisResult = null
      if (
        transcriptionResult.transcript &&
        transcriptionResult.confidence > 0
      ) {
        analysisResult = await analyzeRecordingTranscript(
          transcriptionResult.transcript,
          recording.roomName
        )

        // Update with analysis
        await prisma.recording.update({
          where: { id },
          data: {
            status: 'ANALYZED',
            sentiment: analysisResult.sentiment,
            keyPoints: analysisResult.keyPoints,
          },
        })
      } else {
        // Mark as transcribed but not analyzed (placeholder transcript)
        await prisma.recording.update({
          where: { id },
          data: {
            status: 'TRANSCRIBED',
          },
        })
      }

      // Fetch updated recording
      const updatedRecording = await prisma.recording.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          transcript: true,
          detectedLanguage: true,
          sentiment: true,
          keyPoints: true,
        },
      })

      return successResponse({
          message: 'Recording analyzed successfully',
          recording: updatedRecording,
          analysis: analysisResult,
        })
    } catch (analysisError) {
      // Update status to failed
      await prisma.recording.update({
        where: { id },
        data: {
          status: 'FAILED',
          errorMessage:
            analysisError instanceof Error
              ? analysisError.message
              : 'Analysis failed',
          retryCount: { increment: 1 },
        },
      })

      throw analysisError
    }
  } catch (error) {
    console.error('Analyze recording error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to analyze recording')
  }
}

/**
 * GET /api/recordings/[id]/analyze
 * Get analysis status and results
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
      select: {
        id: true,
        buyerId: true,
        status: true,
        transcript: true,
        detectedLanguage: true,
        sentiment: true,
        keyPoints: true,
        errorMessage: true,
        retryCount: true,
      },
    })

    if (!recording) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Recording not found')
    }

    // Check ownership
    if (recording.buyerId !== user.userId && user.role !== 'ADMIN') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Access denied')
    }

    return successResponse({
        id: recording.id,
        status: recording.status,
        transcript: recording.transcript,
        detectedLanguage: recording.detectedLanguage,
        sentiment: recording.sentiment,
        keyPoints: recording.keyPoints,
        errorMessage: recording.errorMessage,
        canRetry: recording.status === 'FAILED' && recording.retryCount < 3,
      })
  } catch (error) {
    console.error('Get analysis error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to get analysis')
  }
}
