/**
 * Job Queue using the database Job model
 * A simplified job queue that uses PostgreSQL for persistence
 * without requiring additional dependencies like pg-boss
 */

import { prisma } from './prisma'
import { transcribeAudio } from './transcription'
import { analyzeRecordingTranscript, calculateMatchScore } from './ai-match'
import { generateReport } from './ai-reports'
import { DreamHousePreferences } from './ai'

// Job types
export type JobType =
  | 'transcribe_recording'
  | 'analyze_recording'
  | 'calculate_match_score'
  | 'generate_report'
  | 'send_email'

export interface JobPayload {
  transcribe_recording: { recordingId: string }
  analyze_recording: { recordingId: string }
  calculate_match_score: { buyerId: string; houseId: string }
  generate_report: { reportId: string }
  send_email: { to: string; template: string; data: Record<string, unknown> }
}

/**
 * Create a new job
 */
export async function createJob<T extends JobType>(
  type: T,
  payload: JobPayload[T],
  options?: {
    runAt?: Date
    maxRetries?: number
  }
): Promise<string> {
  const job = await prisma.job.create({
    data: {
      type,
      payload: payload as object,
      maxRetries: options?.maxRetries ?? 3,
      runAt: options?.runAt ?? new Date(),
    },
  })

  return job.id
}

/**
 * Process pending jobs
 * This should be called periodically (e.g., every 10 seconds)
 */
export async function processJobs(limit: number = 10): Promise<number> {
  const now = new Date()

  // Get pending jobs that are ready to run
  const jobs = await prisma.job.findMany({
    where: {
      status: 'pending',
      runAt: { lte: now },
    },
    orderBy: { runAt: 'asc' },
    take: limit,
  })

  let processed = 0

  for (const job of jobs) {
    try {
      // Mark as running
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: 'running',
          startedAt: new Date(),
        },
      })

      // Process the job
      const result = await executeJob(job.type as JobType, job.payload as Record<string, unknown>)

      // Mark as completed
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          result: result as object,
          completedAt: new Date(),
        },
      })

      processed++
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error)

      const newRetryCount = job.retryCount + 1
      const shouldRetry = newRetryCount < job.maxRetries

      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: shouldRetry ? 'pending' : 'failed',
          retryCount: newRetryCount,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          // Exponential backoff for retries
          runAt: shouldRetry
            ? new Date(Date.now() + Math.pow(2, newRetryCount) * 1000)
            : undefined,
        },
      })
    }
  }

  return processed
}

/**
 * Execute a specific job
 */
async function executeJob(type: JobType, payload: Record<string, unknown>): Promise<unknown> {
  switch (type) {
    case 'transcribe_recording':
      return await handleTranscribeRecording(payload as JobPayload['transcribe_recording'])

    case 'analyze_recording':
      return await handleAnalyzeRecording(payload as JobPayload['analyze_recording'])

    case 'calculate_match_score':
      return await handleCalculateMatchScore(payload as JobPayload['calculate_match_score'])

    case 'generate_report':
      return await handleGenerateReport(payload as JobPayload['generate_report'])

    case 'send_email':
      return await handleSendEmail(payload as JobPayload['send_email'])

    default:
      throw new Error(`Unknown job type: ${type}`)
  }
}

/**
 * Handle transcription job
 */
async function handleTranscribeRecording(payload: JobPayload['transcribe_recording']) {
  const { recordingId } = payload

  const recording = await prisma.recording.findUnique({
    where: { id: recordingId },
  })

  if (!recording?.audioUrl) {
    throw new Error('Recording not found or no audio URL')
  }

  // Update status
  await prisma.recording.update({
    where: { id: recordingId },
    data: { status: 'TRANSCRIBING' },
  })

  // Transcribe
  const audioPath = recording.audioUrl.replace('/api/storage/', '')
  const result = await transcribeAudio(audioPath)

  // Update recording
  await prisma.recording.update({
    where: { id: recordingId },
    data: {
      transcript: result.transcript,
      detectedLanguage: result.detectedLanguage,
      status: 'TRANSCRIBED',
    },
  })

  // Queue analysis job
  await createJob('analyze_recording', { recordingId })

  return { success: true, transcript: result.transcript }
}

/**
 * Handle recording analysis job
 */
async function handleAnalyzeRecording(payload: JobPayload['analyze_recording']) {
  const { recordingId } = payload

  const recording = await prisma.recording.findUnique({
    where: { id: recordingId },
  })

  if (!recording?.transcript) {
    throw new Error('Recording not found or no transcript')
  }

  // Analyze the transcript
  const analysis = await analyzeRecordingTranscript(recording.transcript, recording.roomName)

  // Update recording with analysis
  await prisma.recording.update({
    where: { id: recordingId },
    data: {
      sentiment: analysis.sentiment,
      keyPoints: analysis.keyPoints,
      status: 'ANALYZED',
    },
  })

  return { success: true, analysis }
}

/**
 * Handle match score calculation job
 */
async function handleCalculateMatchScore(payload: JobPayload['calculate_match_score']) {
  const { buyerId, houseId } = payload

  // Get buyer's dream house profile
  const profile = await prisma.dreamHouseProfile.findUnique({
    where: { buyerId },
  })

  if (!profile?.profile) {
    return { success: false, reason: 'No dream house profile' }
  }

  // Get house
  const house = await prisma.house.findUnique({
    where: { id: houseId },
  })

  if (!house) {
    throw new Error('House not found')
  }

  // Calculate score
  const houseData = {
    id: house.id,
    address: house.address,
    city: house.city,
    state: house.state,
    price: house.price,
    bedrooms: house.bedrooms,
    bathrooms: house.bathrooms,
    sqft: house.sqft,
    yearBuilt: house.yearBuilt,
    propertyType: house.propertyType,
    features: house.features,
    description: house.description,
  }

  const result = await calculateMatchScore(houseData, profile.profile as DreamHousePreferences)

  // Update HouseBuyer
  await prisma.houseBuyer.updateMany({
    where: { buyerId, houseId, deletedAt: null },
    data: { matchScore: result.score },
  })

  return { success: true, score: result.score }
}

/**
 * Handle report generation job
 */
async function handleGenerateReport(payload: JobPayload['generate_report']) {
  const { reportId } = payload

  const report = await prisma.aIReport.findUnique({
    where: { id: reportId },
    include: {
      buyer: {
        include: {
          dreamHouseProfile: true,
          houseBuyers: {
            where: { deletedAt: null },
            include: {
              house: true,
            },
          },
          visits: {
            where: {
              status: 'COMPLETED',
              deletedAt: null,
            },
            include: {
              house: true,
              recordings: {
                where: { deletedAt: null },
              },
            },
          },
        },
      },
    },
  })

  if (!report) {
    throw new Error('Report not found')
  }

  // Update status
  await prisma.aIReport.update({
    where: { id: reportId },
    data: {
      status: 'GENERATING',
      generationStartedAt: new Date(),
    },
  })

  try {
    // Prepare data for report generation
    const houses = report.buyer.houseBuyers.map((hb) => ({
      id: hb.house.id,
      address: hb.house.address,
      city: hb.house.city,
      state: hb.house.state,
      price: hb.house.price,
      bedrooms: hb.house.bedrooms,
      bathrooms: hb.house.bathrooms,
      sqft: hb.house.sqft,
      yearBuilt: hb.house.yearBuilt,
      propertyType: hb.house.propertyType,
      features: hb.house.features,
      description: hb.house.description,
    }))

    const visits = report.buyer.visits.map((v) => ({
      id: v.id,
      houseId: v.houseId,
      status: v.status,
      overallImpression: v.overallImpression,
      wouldBuy: v.wouldBuy,
      notes: v.notes,
      recordings: v.recordings.map((r) => ({
        id: r.id,
        roomId: r.roomId,
        roomName: r.roomName,
        transcript: r.transcript,
        sentiment: r.sentiment,
        keyPoints: r.keyPoints,
      })),
    }))

    // Generate report
    const content = await generateReport({
      buyerId: report.buyerId,
      houses,
      visits,
      dreamHouseProfile: report.buyer.dreamHouseProfile?.profile as DreamHousePreferences | null,
      language: report.language,
    })

    // Update report with content
    await prisma.aIReport.update({
      where: { id: reportId },
      data: {
        status: 'COMPLETED',
        content: content as object,
        ranking: content.rankings as object,
        recommendedHouseId: content.topPick?.houseId,
        dealBreakers: content.dealBreakers as object,
        insights: content.insights as object,
        housesAnalyzed: houses.length,
        recordingsAnalyzed: visits.reduce((acc, v) => acc + v.recordings.length, 0),
        generationCompletedAt: new Date(),
      },
    })

    return { success: true, reportId }
  } catch (error) {
    await prisma.aIReport.update({
      where: { id: reportId },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Report generation failed',
      },
    })
    throw error
  }
}

/**
 * Handle email sending job
 */
async function handleSendEmail(payload: JobPayload['send_email']) {
  const { to, template, data } = payload

  // Import email functions dynamically to avoid circular deps
  const { sendEmail } = await import('./email')

  // Simple template rendering
  let html = ''
  let subject = ''

  switch (template) {
    case 'welcome':
      subject = 'Welcome to HomeTrace!'
      html = `<h1>Welcome ${data.name}!</h1><p>Your account has been created.</p>`
      break
    case 'report_ready':
      subject = 'Your HomeTrace Report is Ready'
      html = `<h1>Your report is ready!</h1><p>Click <a href="${data.url}">here</a> to view it.</p>`
      break
    default:
      html = `<p>${JSON.stringify(data)}</p>`
      subject = 'HomeTrace Notification'
  }

  const result = await sendEmail({ to, subject, html })

  return { success: result.success, messageId: result.messageId }
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
  })

  if (!job) return null

  return {
    id: job.id,
    type: job.type,
    status: job.status,
    result: job.result,
    error: job.errorMessage,
    retryCount: job.retryCount,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  }
}

/**
 * Clean up old completed jobs
 */
export async function cleanupOldJobs(daysOld: number = 7): Promise<number> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysOld)

  const result = await prisma.job.deleteMany({
    where: {
      status: { in: ['completed', 'failed'] },
      updatedAt: { lt: cutoffDate },
    },
  })

  return result.count
}
