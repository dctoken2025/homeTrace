import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface HealthCheck {
  status: 'healthy' | 'unhealthy'
  latency?: number
  error?: string
}

interface ReadinessResponse {
  status: 'ready' | 'not_ready'
  timestamp: string
  checks: {
    database: HealthCheck
    storage: HealthCheck
  }
}

/**
 * GET /api/health/ready
 * Readiness check - returns 200 if all dependencies are healthy
 */
export async function GET() {
  const checks: ReadinessResponse['checks'] = {
    database: { status: 'unhealthy' },
    storage: { status: 'unhealthy' },
  }

  let allHealthy = true

  // Check database connection
  try {
    const start = Date.now()
    await prisma.$queryRaw`SELECT 1`
    checks.database = {
      status: 'healthy',
      latency: Date.now() - start,
    }
  } catch (error) {
    allHealthy = false
    checks.database = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Database connection failed',
    }
  }

  // Check storage (just verify the path exists or is writable)
  try {
    const fs = await import('fs/promises')
    const storagePath = process.env.STORAGE_PATH || './uploads'

    const start = Date.now()
    await fs.access(storagePath)
    checks.storage = {
      status: 'healthy',
      latency: Date.now() - start,
    }
  } catch (error) {
    // Try to create the directory if it doesn't exist
    try {
      const fs = await import('fs/promises')
      const storagePath = process.env.STORAGE_PATH || './uploads'
      await fs.mkdir(storagePath, { recursive: true })
      checks.storage = {
        status: 'healthy',
        latency: 0,
      }
    } catch (createError) {
      allHealthy = false
      checks.storage = {
        status: 'unhealthy',
        error: 'Storage path not accessible',
      }
    }
  }

  const response: ReadinessResponse = {
    status: allHealthy ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    checks,
  }

  return NextResponse.json(response, {
    status: allHealthy ? 200 : 503,
  })
}
