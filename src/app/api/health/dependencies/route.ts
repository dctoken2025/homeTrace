import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface DependencyCheck {
  status: 'healthy' | 'unhealthy' | 'not_configured'
  latency?: number
  error?: string
  details?: Record<string, unknown>
}

interface DependenciesResponse {
  status: 'all_healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  dependencies: {
    database: DependencyCheck
    anthropic: DependencyCheck
    resend: DependencyCheck
    realtyApi: DependencyCheck
    storage: DependencyCheck
  }
}

/**
 * GET /api/health/dependencies
 * Check all external dependencies status
 */
export async function GET() {
  const dependencies: DependenciesResponse['dependencies'] = {
    database: { status: 'unhealthy' },
    anthropic: { status: 'not_configured' },
    resend: { status: 'not_configured' },
    realtyApi: { status: 'not_configured' },
    storage: { status: 'unhealthy' },
  }

  let healthyCount = 0
  let totalRequired = 2 // database and storage are required

  // Check database
  try {
    const start = Date.now()
    const result = await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) as count FROM "User"`
    dependencies.database = {
      status: 'healthy',
      latency: Date.now() - start,
      details: { userCount: Number(result[0]?.count || 0) },
    }
    healthyCount++
  } catch (error) {
    dependencies.database = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Database check failed',
    }
  }

  // Check Anthropic API
  if (process.env.ANTHROPIC_API_KEY) {
    totalRequired++
    try {
      const start = Date.now()
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 5,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      })

      if (response.ok) {
        dependencies.anthropic = {
          status: 'healthy',
          latency: Date.now() - start,
        }
        healthyCount++
      } else {
        const error = await response.json()
        dependencies.anthropic = {
          status: 'unhealthy',
          latency: Date.now() - start,
          error: error.error?.message || `HTTP ${response.status}`,
        }
      }
    } catch (error) {
      dependencies.anthropic = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Anthropic check failed',
      }
    }
  }

  // Check Resend API
  if (process.env.RESEND_API_KEY) {
    try {
      const start = Date.now()
      const response = await fetch('https://api.resend.com/domains', {
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
      })

      if (response.ok) {
        dependencies.resend = {
          status: 'healthy',
          latency: Date.now() - start,
        }
      } else {
        dependencies.resend = {
          status: 'unhealthy',
          latency: Date.now() - start,
          error: `HTTP ${response.status}`,
        }
      }
    } catch (error) {
      dependencies.resend = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Resend check failed',
      }
    }
  }

  // Check Realty API
  if (process.env.RAPIDAPI_KEY) {
    try {
      const start = Date.now()
      const response = await fetch(
        'https://realty-in-us.p.rapidapi.com/auto-complete?input=test',
        {
          headers: {
            'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
            'X-RapidAPI-Host': 'realty-in-us.p.rapidapi.com',
          },
        }
      )

      if (response.ok) {
        dependencies.realtyApi = {
          status: 'healthy',
          latency: Date.now() - start,
        }
      } else {
        dependencies.realtyApi = {
          status: 'unhealthy',
          latency: Date.now() - start,
          error: `HTTP ${response.status}`,
        }
      }
    } catch (error) {
      dependencies.realtyApi = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Realty API check failed',
      }
    }
  }

  // Check storage
  try {
    const fs = await import('fs/promises')
    const storagePath = process.env.STORAGE_PATH || './uploads'

    const start = Date.now()

    // Try to write and read a test file
    const testFile = `${storagePath}/.health-check-${Date.now()}`
    await fs.writeFile(testFile, 'health-check')
    await fs.readFile(testFile)
    await fs.unlink(testFile)

    dependencies.storage = {
      status: 'healthy',
      latency: Date.now() - start,
      details: { path: storagePath },
    }
    healthyCount++
  } catch (error) {
    dependencies.storage = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Storage check failed',
    }
  }

  // Determine overall status
  let status: DependenciesResponse['status'] = 'all_healthy'
  if (healthyCount < totalRequired) {
    status = 'unhealthy'
  } else if (
    dependencies.anthropic.status === 'unhealthy' ||
    dependencies.resend.status === 'unhealthy' ||
    dependencies.realtyApi.status === 'unhealthy'
  ) {
    status = 'degraded'
  }

  const response: DependenciesResponse = {
    status,
    timestamp: new Date().toISOString(),
    dependencies,
  }

  const httpStatus = status === 'unhealthy' ? 503 : 200

  return NextResponse.json(response, { status: httpStatus })
}
