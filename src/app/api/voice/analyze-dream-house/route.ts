import { NextRequest } from 'next/server'
import {
  successResponse,
  errorResponse,
  ErrorCode,
  Errors,
} from '@/lib/api-response'
import { getSessionUser } from '@/lib/auth-session'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'
import { withApiLogging } from '@/lib/api-logger'
import { DreamHouseProfileData, BuyerPersona } from '@/lib/types/dream-house'
import { getConfig, CONFIG_KEYS, markConfigUsed } from '@/lib/config'

// Lazy client initialization
let anthropicClient: Anthropic | null = null

async function getAnthropicClient(): Promise<Anthropic> {
  const apiKey = await getConfig(CONFIG_KEYS.ANTHROPIC_API_KEY)
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured. Please set it in Admin > Configuration.')
  }
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey })
  }
  await markConfigUsed(CONFIG_KEYS.ANTHROPIC_API_KEY).catch(() => {})
  return anthropicClient
}

const VOICE_ANALYSIS_PROMPT = `You are an expert real estate consultant analyzing a home buyer's verbal description of their dream home.

The buyer has just described their ideal home in a voice recording. Analyze their description and extract a complete buyer profile.

You must return a valid JSON object with this exact structure:

{
  "profile": {
    "location": {
      "cities": ["list of cities/areas mentioned"],
      "neighborhoods": ["specific neighborhoods if mentioned"],
      "areaType": "urban" | "suburban" | "rural" | "flexible",
      "proximityNeeds": ["work", "schools", "parks", etc.],
      "securityImportance": 1-5,
      "viewPreference": "city" | "nature" | "ocean" | "mountains" | "any"
    },
    "budget": {
      "min": number or null,
      "max": number or null,
      "flexibility": "strict" | "flexible" | "very_flexible",
      "paymentType": "financing" | "cash" | "mixed"
    },
    "size": {
      "bedroomsMin": number,
      "bedroomsIdeal": number,
      "bathroomsMin": number,
      "sqftMin": number or null,
      "outdoorSpace": ["yard", "balcony", "terrace", "pool_area", "garden"],
      "parkingSpots": number,
      "floors": "single" | "multi" | "apartment" | "any"
    },
    "features": {
      "mustHave": ["essential features mentioned"],
      "niceToHave": ["desirable features mentioned"],
      "dealBreakers": ["things they definitely don't want"]
    },
    "style": {
      "architectural": ["modern", "traditional", "contemporary", etc.],
      "agePreference": "new" | "up_to_10" | "up_to_20" | "any",
      "renovationWillingness": "none" | "minor" | "major" | "full",
      "finishingLevel": "high" | "medium" | "willing_to_renovate",
      "naturalLightImportance": 1-5
    },
    "lifestyle": {
      "worksFromHome": "never" | "sometimes" | "always",
      "hasChildren": boolean,
      "childrenCount": number,
      "hasPets": boolean,
      "petTypes": ["dog_small", "dog_large", "cat", etc.],
      "entertainsGuests": "rarely" | "sometimes" | "often",
      "hobbiesNeedingSpace": ["home_gym", "gardening", "cooking", etc.]
    },
    "timeline": {
      "urgency": "asap" | "3_months" | "6_months" | "1_year" | "flexible"
    }
  },
  "persona": {
    "narrative": "A detailed 3-5 paragraph narrative describing who this buyer is, their lifestyle, why they're looking for a home, what's essential vs nice-to-have. Write in third person.",
    "searchPrompt": "A single optimized paragraph describing the perfect home for this buyer.",
    "matchingCriteria": ["Array of specific, measurable criteria ordered by importance"],
    "summary": "2-3 sentence executive summary of who this buyer is and what they need."
  },
  "highlights": [
    {
      "category": "location" | "size" | "features" | "style" | "lifestyle" | "budget",
      "icon": "emoji that represents this highlight",
      "label": "Short label",
      "value": "What they mentioned"
    }
  ],
  "clarificationQuestions": [
    "Questions about things that weren't clear or weren't mentioned"
  ]
}

Guidelines:
- Extract as much information as possible from the transcription
- If something isn't mentioned, use sensible defaults or null
- The highlights should be the top 6-8 most important/distinctive preferences
- Generate 2-4 clarification questions for things that would help refine the profile
- Write in the same language as the transcription
- Be specific and actionable in the persona
- If budget is mentioned in different currencies, convert to USD
`

/**
 * POST /api/voice/analyze-dream-house
 * Analyze transcribed voice description and generate profile + persona
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    if (session.role !== 'BUYER') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Only buyers can create a dream house profile')
    }

    const body = await request.json()
    const { transcription } = body

    if (!transcription || typeof transcription !== 'string') {
      return errorResponse(ErrorCode.VALIDATION_ERROR, 'Transcription text is required')
    }

    if (transcription.length < 50) {
      return errorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Please provide more details about your dream home (minimum 50 characters)'
      )
    }

    // Get Anthropic client and analyze with Claude
    const anthropic = await getAnthropicClient()
    const response = await withApiLogging(
      'anthropic',
      '/v1/messages',
      'POST',
      () => anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: VOICE_ANALYSIS_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Analyze this voice transcription of a home buyer describing their dream home:\n\n"${transcription}"`,
          },
        ],
      })
    )

    const textBlock = response.content.find((block) => block.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from AI')
    }

    // Parse the JSON response
    let analysisResult
    try {
      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      analysisResult = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('Failed to parse analysis:', textBlock.text)
      return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to analyze voice description')
    }

    // Prepare the complete profile
    const profile: DreamHouseProfileData = {
      ...analysisResult.profile,
      completedSteps: [1, 2, 3, 4, 5, 6],
      isWizardComplete: true,
      completedAt: new Date(),
      buyerPersona: analysisResult.persona,
    }

    // Save to database
    const dreamHouseProfile = await prisma.dreamHouseProfile.upsert({
      where: { buyerId: session.userId },
      update: {
        profile: {
          ...analysisResult.profile,
          completedSteps: [1, 2, 3, 4, 5, 6],
          isWizardComplete: true,
          completedAt: new Date().toISOString(),
          buyerPersona: analysisResult.persona,
        },
        isComplete: true,
        lastUpdatedAt: new Date(),
      },
      create: {
        buyerId: session.userId,
        profile: {
          ...analysisResult.profile,
          completedSteps: [1, 2, 3, 4, 5, 6],
          isWizardComplete: true,
          completedAt: new Date().toISOString(),
          buyerPersona: analysisResult.persona,
        },
        isComplete: true,
        trainingChats: [],
      },
    })

    return successResponse({
      profile,
      persona: analysisResult.persona as BuyerPersona,
      highlights: analysisResult.highlights,
      clarificationQuestions: analysisResult.clarificationQuestions,
      isComplete: true,
    })
  } catch (error) {
    console.error('Voice analysis error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to analyze voice description')
  }
}
