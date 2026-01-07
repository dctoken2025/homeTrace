import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api-response'
import { getRequestUser } from '@/lib/auth'
import { generateDreamHouseResponse, getInitialGreeting, ChatMessage } from '@/lib/ai'
import { z } from 'zod'
import { checkRateLimit, getIdentifier } from '@/lib/rate-limit'

// Schema for chat message
const chatMessageSchema = z.object({
  message: z.string().min(1).max(5000),
})

/**
 * GET /api/dream-house-profile/chat
 * Get chat history and initial greeting if new
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    // Only buyers can chat
    if (user.role !== 'BUYER' && user.role !== 'ADMIN') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only buyers can use dream house chat')
    }

    // Get or create profile
    let profile = await prisma.dreamHouseProfile.findUnique({
      where: { buyerId: user.userId },
    })

    if (!profile) {
      // Create new profile with initial greeting
      const initialGreeting = getInitialGreeting()
      const initialChat = {
        id: Date.now().toString(),
        startedAt: new Date().toISOString(),
        messages: [
          { role: 'assistant', content: initialGreeting },
        ],
      }

      profile = await prisma.dreamHouseProfile.create({
        data: {
          buyerId: user.userId,
          trainingChats: [initialChat],
        },
      })

      return successResponse({
          chatHistory: [{ role: 'assistant', content: initialGreeting }],
          isComplete: false,
          isNew: true,
        })
    }

    // Get current chat session (last one)
    const chats = profile.trainingChats as any[]
    const currentChat = chats.length > 0 ? chats[chats.length - 1] : null

    if (!currentChat || !currentChat.messages || currentChat.messages.length === 0) {
      // Start new chat session
      const initialGreeting = getInitialGreeting()
      const newChat = {
        id: Date.now().toString(),
        startedAt: new Date().toISOString(),
        messages: [
          { role: 'assistant', content: initialGreeting },
        ],
      }

      await prisma.dreamHouseProfile.update({
        where: { buyerId: user.userId },
        data: {
          trainingChats: [...chats, newChat],
        },
      })

      return successResponse({
          chatHistory: [{ role: 'assistant', content: initialGreeting }],
          isComplete: profile.isComplete,
          isNew: true,
        })
    }

    return successResponse({
        chatHistory: currentChat.messages,
        isComplete: profile.isComplete,
        isNew: false,
      })
  } catch (error) {
    console.error('Get chat history error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to get chat history')
  }
}

/**
 * POST /api/dream-house-profile/chat
 * Send a message and get AI response
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting for AI chat
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    const identifier = getIdentifier(ip)
    const rateLimit = checkRateLimit(identifier, 'aiChat')
    if (!rateLimit.success) {
      return errorResponse(
        ErrorCode.RATE_LIMIT_EXCEEDED,
        'Too many chat requests. Please wait a moment.',
        { retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000) }
      )
    }

    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    // Only buyers can chat
    if (user.role !== 'BUYER' && user.role !== 'ADMIN') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only buyers can use dream house chat')
    }

    // Validate input
    const body = await request.json()
    const validation = chatMessageSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid message',
          validation.error.flatten().fieldErrors
        )
    }

    const { message } = validation.data

    // Get profile
    let profile = await prisma.dreamHouseProfile.findUnique({
      where: { buyerId: user.userId },
    })

    if (!profile) {
      // Create profile first
      const initialGreeting = getInitialGreeting()
      profile = await prisma.dreamHouseProfile.create({
        data: {
          buyerId: user.userId,
          trainingChats: [{
            id: Date.now().toString(),
            startedAt: new Date().toISOString(),
            messages: [{ role: 'assistant', content: initialGreeting }],
          }],
        },
      })
    }

    // Get current chat session
    const chats = profile.trainingChats as any[]
    let currentChat = chats.length > 0 ? chats[chats.length - 1] : null

    if (!currentChat) {
      currentChat = {
        id: Date.now().toString(),
        startedAt: new Date().toISOString(),
        messages: [],
      }
      chats.push(currentChat)
    }

    // Get chat history for context
    const chatHistory: ChatMessage[] = currentChat.messages || []

    // Generate AI response
    let aiResponse: string
    try {
      aiResponse = await generateDreamHouseResponse(chatHistory, message)
    } catch (err) {
      console.error('AI generation error:', err)
      return errorResponse(
          ErrorCode.EXTERNAL_API_ERROR,
          'Failed to generate AI response. Please try again.'
        )
    }

    // Add messages to chat history
    currentChat.messages.push(
      { role: 'user', content: message },
      { role: 'assistant', content: aiResponse }
    )

    // Update profile with new chat
    const updatedChats = [...chats.slice(0, -1), currentChat]
    await prisma.dreamHouseProfile.update({
      where: { buyerId: user.userId },
      data: {
        trainingChats: updatedChats,
        lastUpdatedAt: new Date(),
      },
    })

    return successResponse({
        userMessage: { role: 'user', content: message },
        assistantMessage: { role: 'assistant', content: aiResponse },
        messageCount: currentChat.messages.length,
      })
  } catch (error) {
    console.error('Chat message error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to process chat message')
  }
}

/**
 * DELETE /api/dream-house-profile/chat
 * Start a new chat session (keep history)
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) {
      return errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    // Only buyers can manage chat
    if (user.role !== 'BUYER' && user.role !== 'ADMIN') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only buyers can manage dream house chat')
    }

    const profile = await prisma.dreamHouseProfile.findUnique({
      where: { buyerId: user.userId },
    })

    if (!profile) {
      return successResponse({ message: 'No chat to restart' })
    }

    // Start new chat session
    const initialGreeting = getInitialGreeting()
    const newChat = {
      id: Date.now().toString(),
      startedAt: new Date().toISOString(),
      messages: [
        { role: 'assistant', content: initialGreeting },
      ],
    }

    const chats = profile.trainingChats as any[]
    await prisma.dreamHouseProfile.update({
      where: { buyerId: user.userId },
      data: {
        trainingChats: [...chats, newChat],
        lastUpdatedAt: new Date(),
      },
    })

    return successResponse({
        message: 'New chat session started',
        chatHistory: [{ role: 'assistant', content: initialGreeting }],
      })
  } catch (error) {
    console.error('New chat session error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to start new chat session')
  }
}
