import { prisma } from './prisma'
import { Prisma } from '@prisma/client'

export type ApiService = 'anthropic' | 'resend' | 'realty_api' | 'openai_whisper' | 'google_speech' | 'config'

interface LogApiCallParams {
  service: ApiService
  endpoint: string
  method: string
  status: number
  duration: number
  errorMessage?: string
  userId?: string
  requestBody?: Record<string, unknown>
}

/**
 * Log an external API call for monitoring and statistics
 */
export async function logApiCall({
  service,
  endpoint,
  method,
  status,
  duration,
  errorMessage,
  userId,
  requestBody,
}: LogApiCallParams): Promise<void> {
  try {
    await prisma.apiLog.create({
      data: {
        service,
        endpoint,
        method,
        responseStatus: status,
        duration,
        errorMessage,
        userId,
        requestBody: requestBody as Prisma.InputJsonValue | undefined,
      },
    })
  } catch (error) {
    // Don't throw - logging should never break the main flow
    console.error('Failed to log API call:', error)
  }
}

/**
 * Helper to measure API call duration and log results
 */
export async function withApiLogging<T>(
  service: ApiService,
  endpoint: string,
  method: string,
  fn: () => Promise<T>,
  options?: { userId?: string }
): Promise<T> {
  const startTime = Date.now()

  try {
    const result = await fn()
    const duration = Date.now() - startTime

    await logApiCall({
      service,
      endpoint,
      method,
      status: 200,
      duration,
      userId: options?.userId,
    })

    return result
  } catch (error) {
    const duration = Date.now() - startTime

    await logApiCall({
      service,
      endpoint,
      method,
      status: 500,
      duration,
      errorMessage: error instanceof Error ? error.message : String(error),
      userId: options?.userId,
    })

    throw error
  }
}
