import { NextRequest } from 'next/server'
import { getSessionUser } from '@/lib/auth-session'
import { successResponse, errorResponse, ErrorCode, Errors } from '@/lib/api-response'
import Anthropic from '@anthropic-ai/sdk'

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
        if (!process.env.ANTHROPIC_API_KEY) {
          return errorResponse(ErrorCode.VALIDATION_ERROR, 'Anthropic API key not configured')
        }

        try {
          const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
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
        } catch (err: any) {
          return errorResponse(
            ErrorCode.EXTERNAL_API_ERROR,
            err.message || 'Failed to connect to Anthropic'
          )
        }
      }

      case 'resend': {
        if (!process.env.RESEND_API_KEY) {
          return errorResponse(ErrorCode.VALIDATION_ERROR, 'Resend API key not configured')
        }

        try {
          // Test the API key by fetching domains
          const response = await fetch('https://api.resend.com/domains', {
            headers: {
              'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
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
        } catch (err: any) {
          return errorResponse(
            ErrorCode.EXTERNAL_API_ERROR,
            err.message || 'Failed to connect to Resend'
          )
        }
      }

      case 'realtyApi': {
        if (!process.env.RAPIDAPI_KEY) {
          return errorResponse(ErrorCode.VALIDATION_ERROR, 'RapidAPI key not configured')
        }

        try {
          // Test with a simple autocomplete request
          const response = await fetch(
            'https://realty-in-us.p.rapidapi.com/auto-complete?input=new%20york',
            {
              headers: {
                'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
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
        } catch (err: any) {
          return errorResponse(
            ErrorCode.EXTERNAL_API_ERROR,
            err.message || 'Failed to connect to Realty API'
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
