import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth-session'
import { successResponse, errorResponse, ErrorCode, Errors } from '@/lib/api-response'
import { subDays, startOfMonth } from 'date-fns'
import {
  getConfig,
  setConfig,
  getAllConfigs,
  isConfigured,
  CONFIG_KEYS,
  clearConfigCache,
} from '@/lib/config'

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

    // Get all configs from database
    const dbConfigs = await getAllConfigs()
    const configMap = new Map(dbConfigs.map((c) => [c.key, c]))

    // Check configuration status (from DB or env fallback)
    const [anthropicConfigured, resendConfigured, rapidApiConfigured, storagePath, jwtConfigured] =
      await Promise.all([
        isConfigured(CONFIG_KEYS.ANTHROPIC_API_KEY),
        isConfigured(CONFIG_KEYS.RESEND_API_KEY),
        isConfigured(CONFIG_KEYS.RAPIDAPI_KEY),
        getConfig(CONFIG_KEYS.STORAGE_PATH),
        isConfigured(CONFIG_KEYS.JWT_SECRET),
      ])

    return successResponse({
      anthropic: {
        configured: anthropicConfigured,
        lastUsed: anthropicLogs[0]?.createdAt?.toISOString() || configMap.get(CONFIG_KEYS.ANTHROPIC_API_KEY)?.lastUsedAt?.toISOString() || null,
        usageCount: anthropicUsage,
      },
      resend: {
        configured: resendConfigured,
        lastUsed: resendLogs[0]?.createdAt?.toISOString() || configMap.get(CONFIG_KEYS.RESEND_API_KEY)?.lastUsedAt?.toISOString() || null,
        usageCount: resendUsage,
      },
      realtyApi: {
        configured: rapidApiConfigured,
        lastUsed: realtyLogs[0]?.createdAt?.toISOString() || configMap.get(CONFIG_KEYS.RAPIDAPI_KEY)?.lastUsedAt?.toISOString() || null,
        usageCount: realtyUsage,
        monthlyLimit: 500, // RapidAPI free tier
        monthlyUsage: realtyUsage,
      },
      storage: {
        path: storagePath || process.env.STORAGE_PATH || './uploads',
        configured: !!storagePath || !!process.env.STORAGE_PATH,
      },
      jwt: {
        configured: jwtConfigured || !!process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      },
      // Include database configs for admin visibility
      configs: dbConfigs,
    })
  } catch (error) {
    console.error('Get config error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to get configuration')
  }
}

// PUT /api/admin/config - Update API keys (now persisted to database)
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
    const { anthropicKey, resendKey, rapidApiKey, storagePath, realtyApiHost } = body

    const updates: string[] = []

    // Save to database (encrypted)
    if (anthropicKey) {
      await setConfig(CONFIG_KEYS.ANTHROPIC_API_KEY, anthropicKey, {
        description: 'Anthropic API key for Claude AI (chat, analysis, reports)',
        isSecret: true,
      })
      updates.push('ANTHROPIC_API_KEY')
    }

    if (resendKey) {
      await setConfig(CONFIG_KEYS.RESEND_API_KEY, resendKey, {
        description: 'Resend API key for sending emails',
        isSecret: true,
      })
      updates.push('RESEND_API_KEY')
    }

    if (rapidApiKey) {
      await setConfig(CONFIG_KEYS.RAPIDAPI_KEY, rapidApiKey, {
        description: 'RapidAPI key for Realty in US property API',
        isSecret: true,
      })
      updates.push('RAPIDAPI_KEY')
    }

    if (storagePath) {
      await setConfig(CONFIG_KEYS.STORAGE_PATH, storagePath, {
        description: 'Path for file storage',
        isSecret: false,
      })
      updates.push('STORAGE_PATH')
    }

    if (realtyApiHost) {
      await setConfig(CONFIG_KEYS.REALTY_API_HOST, realtyApiHost, {
        description: 'Realty API host URL',
        isSecret: false,
      })
      updates.push('REALTY_API_HOST')
    }

    // Clear cache to pick up new values
    clearConfigCache()

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
      message: 'Configuration saved successfully',
      updatedKeys: updates,
      note: 'Changes are persisted in the database and will survive server restarts.',
    })
  } catch (error) {
    console.error('Update config error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to update configuration')
  }
}

// DELETE /api/admin/config - Delete a configuration key
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    if (session.role !== 'ADMIN') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Admin access required')
    }

    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (!key) {
      return errorResponse(ErrorCode.VALIDATION_ERROR, 'Config key is required')
    }

    await prisma.systemConfig.delete({
      where: { key },
    }).catch(() => {
      // Ignore if not found
    })

    clearConfigCache()

    // Log the deletion
    await prisma.apiLog.create({
      data: {
        service: 'config',
        endpoint: '/api/admin/config',
        method: 'DELETE',
        requestBody: { deletedKey: key },
        responseStatus: 200,
        userId: session.userId,
      },
    })

    return successResponse({
      message: `Configuration key '${key}' deleted successfully`,
    })
  } catch (error) {
    console.error('Delete config error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to delete configuration')
  }
}
