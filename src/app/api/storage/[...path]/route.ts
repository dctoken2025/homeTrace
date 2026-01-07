import { NextRequest, NextResponse } from 'next/server'
import { getFile, getContentType } from '@/lib/storage'
import { getRequestUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{
    path: string[]
  }>
}

/**
 * GET /api/storage/[...path]
 * Serve files from storage
 * Path format: /api/storage/{type}/{id}/{filename}
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { path } = await params

    if (path.length < 3) {
      return new NextResponse('Invalid path', { status: 400 })
    }

    const [type, id, ...filenameParts] = path
    const filename = filenameParts.join('/')

    // Validate type
    if (!['audio', 'photos'].includes(type)) {
      return new NextResponse('Invalid storage type', { status: 400 })
    }

    // Check access based on type
    if (type === 'audio') {
      // For audio files, id is visitId - check access to visit
      const visit = await prisma.visit.findUnique({
        where: { id },
        select: { buyerId: true },
      })

      if (!visit) {
        return new NextResponse('Not found', { status: 404 })
      }

      // Check access
      if (user.role === 'BUYER' && visit.buyerId !== user.userId) {
        return new NextResponse('Forbidden', { status: 403 })
      }

      if (user.role === 'REALTOR') {
        const connection = await prisma.buyerRealtor.findFirst({
          where: {
            realtorId: user.userId,
            buyerId: visit.buyerId,
            deletedAt: null,
          },
        })
        if (!connection) {
          return new NextResponse('Forbidden', { status: 403 })
        }
      }
    } else if (type === 'photos') {
      // For photos, id is recordingId - check access to recording
      const recording = await prisma.recording.findUnique({
        where: { id },
        select: { buyerId: true },
      })

      if (!recording) {
        return new NextResponse('Not found', { status: 404 })
      }

      // Check access
      if (user.role === 'BUYER' && recording.buyerId !== user.userId) {
        return new NextResponse('Forbidden', { status: 403 })
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
          return new NextResponse('Forbidden', { status: 403 })
        }
      }
    }

    // Get file from storage
    const file = await getFile(type, id, filename)
    if (!file) {
      return new NextResponse('File not found', { status: 404 })
    }

    // Determine content type
    const contentType = getContentType(filename)

    // Return file with appropriate headers
    return new NextResponse(new Uint8Array(file.buffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Length': file.stats.size.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Storage get error:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
