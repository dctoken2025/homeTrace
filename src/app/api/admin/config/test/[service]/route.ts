import { NextRequest } from 'next/server'
import { getSessionUser } from '@/lib/auth-session'
import { successResponse, errorResponse, ErrorCode, Errors } from '@/lib/api-response'
import Anthropic from '@anthropic-ai/sdk'
import { getConfig, CONFIG_KEYS } from '@/lib/config'

// POST /api/admin/config/test/[service] - Test API connection
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ service: string }> }
) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    if (session.role !== 'ADMIN') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Admin access required')
    }

    const { service } = await params

    switch (service) {
      case 'anthropic': {
        const apiKey = await getConfig(CONFIG_KEYS.ANTHROPIC_API_KEY)
        if (!apiKey) {
          return errorResponse(ErrorCode.VALIDATION_ERROR, 'Anthropic API key not configured')
        }

        try {
          const anthropic = new Anthropic({
            apiKey,
          })

          // Simple test call
          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Say "OK"' }],
          })

          const textBlock = response.content.find((block) => block.type === 'text')
          if (textBlock && textBlock.type === 'text') {
            return successResponse({
              service: 'anthropic',
              status: 'connected',
              response: textBlock.text,
            })
          }

          return errorResponse(ErrorCode.EXTERNAL_API_ERROR, 'Unexpected response from Anthropic')
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to connect to Anthropic'
          return errorResponse(
            ErrorCode.EXTERNAL_API_ERROR,
            message
          )
        }
      }

      case 'resend': {
        const apiKey = await getConfig(CONFIG_KEYS.RESEND_API_KEY)
        if (!apiKey) {
          return errorResponse(ErrorCode.VALIDATION_ERROR, 'Resend API key not configured')
        }

        try {
          // Test the API key by fetching domains
          const response = await fetch('https://api.resend.com/domains', {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
            },
          })

          if (response.ok) {
            return successResponse({
              service: 'resend',
              status: 'connected',
            })
          }

          const error = await response.json()
          return errorResponse(
            ErrorCode.EXTERNAL_API_ERROR,
            error.message || 'Failed to connect to Resend'
          )
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to connect to Resend'
          return errorResponse(
            ErrorCode.EXTERNAL_API_ERROR,
            message
          )
        }
      }

      case 'realtyApi': {
        const apiKey = await getConfig(CONFIG_KEYS.RAPIDAPI_KEY)
        if (!apiKey) {
          return errorResponse(ErrorCode.VALIDATION_ERROR, 'RapidAPI key not configured')
        }

        try {
          // Test with a simple autocomplete request (v2 endpoint)
          const response = await fetch(
            'https://realty-in-us.p.rapidapi.com/locations/v2/auto-complete?input=Austin',
            {
              headers: {
                'X-RapidAPI-Key': apiKey,
                'X-RapidAPI-Host': 'realty-in-us.p.rapidapi.com',
              },
            }
          )

          if (response.ok) {
            return successResponse({
              service: 'realtyApi',
              status: 'connected',
            })
          }

          const error = await response.json()
          return errorResponse(
            ErrorCode.EXTERNAL_API_ERROR,
            error.message || 'Failed to connect to Realty API'
          )
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to connect to Realty API'
          return errorResponse(
            ErrorCode.EXTERNAL_API_ERROR,
            message
          )
        }
      }

      default:
        return errorResponse(ErrorCode.VALIDATION_ERROR, `Unknown service: ${service}`)
    }
  } catch (error) {
    console.error('Test connection error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to test connection')
  }
}
