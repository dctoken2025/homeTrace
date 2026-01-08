import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth-session'
import { successResponse, errorResponse, ErrorCode, Errors } from '@/lib/api-response'
import { subDays, startOfMonth } from 'date-fns'

// GET /api/admin/config - Get system configuration status
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    if (session.role !== 'ADMIN') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Admin access required')
    }

    // Get API usage stats
    const now = new Date()
    const monthStart = startOfMonth(now)
    const last24Hours = subDays(now, 1)

    // Anthropic stats
    const anthropicLogs = await prisma.apiLog.findMany({
      where: { service: 'anthropic' },
      orderBy: { createdAt: 'desc' },
      take: 1,
    })

    const anthropicUsage = await prisma.apiLog.count({
      where: {
        service: 'anthropic',
        createdAt: { gte: monthStart },
      },
    })

    // Resend stats
    const resendLogs = await prisma.apiLog.findMany({
      where: { service: 'resend' },
      orderBy: { createdAt: 'desc' },
      take: 1,
    })

    const resendUsage = await prisma.apiLog.count({
      where: {
        service: 'resend',
        createdAt: { gte: monthStart },
      },
    })

    // Realty API stats
    const realtyLogs = await prisma.apiLog.findMany({
      where: { service: 'realty_api' },
      orderBy: { createdAt: 'desc' },
      take: 1,
    })

    const realtyUsage = await prisma.apiLog.count({
      where: {
        service: 'realty_api',
        createdAt: { gte: monthStart },
      },
    })

    return successResponse({
      anthropic: {
        configured: !!process.env.ANTHROPIC_API_KEY,
        lastUsed: anthropicLogs[0]?.createdAt?.toISOString() || null,
        usageCount: anthropicUsage,
      },
      resend: {
        configured: !!process.env.RESEND_API_KEY,
        lastUsed: resendLogs[0]?.createdAt?.toISOString() || null,
        usageCount: resendUsage,
      },
      realtyApi: {
        configured: !!process.env.RAPIDAPI_KEY,
        lastUsed: realtyLogs[0]?.createdAt?.toISOString() || null,
        usageCount: realtyUsage,
        monthlyLimit: 500, // RapidAPI free tier
        monthlyUsage: realtyUsage,
      },
      storage: {
        path: process.env.STORAGE_PATH || './uploads',
        configured: !!process.env.STORAGE_PATH,
      },
      jwt: {
        configured: !!process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      },
    })
  } catch (error) {
    console.error('Get config error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to get configuration')
  }
}

// PUT /api/admin/config - Update API keys (Note: This updates environment variables at runtime)
// In production, you should use a secrets manager instead
export async function PUT(request: NextRequest) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    if (session.role !== 'ADMIN') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Admin access required')
    }

    const body = await request.json()
    const { anthropicKey, resendKey, rapidApiKey } = body

    // Note: In a real production environment, you would:
    // 1. Store these in a secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)
    // 2. Use a configuration service
    // 3. Restart the service or hot-reload the configuration

    // For now, we'll update the process.env (this won't persist after restart)
    // and log the action for audit purposes

    const updates: string[] = []

    if (anthropicKey) {
      process.env.ANTHROPIC_API_KEY = anthropicKey
      updates.push('ANTHROPIC_API_KEY')
    }

    if (resendKey) {
      process.env.RESEND_API_KEY = resendKey
      updates.push('RESEND_API_KEY')
    }

    if (rapidApiKey) {
      process.env.RAPIDAPI_KEY = rapidApiKey
      updates.push('RAPIDAPI_KEY')
    }

    // Log the configuration change
    if (updates.length > 0) {
      await prisma.apiLog.create({
        data: {
          service: 'config',
          endpoint: '/api/admin/config',
          method: 'PUT',
          requestBody: { updatedKeys: updates },
          responseStatus: 200,
          userId: session.userId,
        },
      })
    }

    return successResponse({
      message: 'Configuration updated successfully',
      updatedKeys: updates,
      note: 'Changes are applied immediately but will not persist after server restart. For permanent changes, update your environment variables or secrets manager.',
    })
  } catch (error) {
    console.error('Update config error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to update configuration')
  }
}
