import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api-response'
import { getRequestUser } from '@/lib/auth'

/**
 * GET /api/admin/logs
 * List API logs with pagination and filters
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user || user.role !== 'ADMIN') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Admin access required')
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const service = searchParams.get('service')
    const status = searchParams.get('status')

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    if (service) {
      where.service = service
    }

    if (status === 'success') {
      where.responseStatus = { lt: 400 }
    } else if (status === 'error') {
      where.responseStatus = { gte: 400 }
    }

    // Get logs
    const [logs, total] = await Promise.all([
      prisma.apiLog.findMany({
        where,
        select: {
          id: true,
          service: true,
          endpoint: true,
          method: true,
          responseStatus: true,
          duration: true,
          errorMessage: true,
          userId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.apiLog.count({ where }),
    ])

    // Get unique services for filter
    const services = await prisma.apiLog.findMany({
      distinct: ['service'],
      select: { service: true },
    })

    return successResponse({
      items: logs.map((log) => ({
        id: log.id,
        service: log.service,
        endpoint: log.endpoint,
        method: log.method,
        responseStatus: log.responseStatus,
        duration: log.duration,
        errorMessage: log.errorMessage,
        userId: log.userId,
        createdAt: log.createdAt.toISOString(),
      })),
      services: services.map((s) => s.service),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Get admin logs error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to get logs')
  }
}
