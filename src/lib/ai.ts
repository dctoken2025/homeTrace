import Anthropic from '@anthropic-ai/sdk'

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

// System prompt for dream house profile training
const DREAM_HOUSE_SYSTEM_PROMPT = `You are an expert real estate assistant helping a home buyer define their ideal home preferences. Your goal is to have a friendly, conversational chat to understand what they're looking for in their dream home.

Ask about:
- Location preferences (neighborhoods, proximity to work/schools, urban vs suburban)
- Budget range and flexibility
- Size requirements (bedrooms, bathrooms, square footage)
- Must-have features (garage, yard, pool, home office)
- Nice-to-have features
- Deal-breakers (what would make them reject a home)
- Style preferences (modern, traditional, etc.)
- Age of home preferences
- Renovation willingness
- Timeline for purchase

Guidelines:
- Ask one or two questions at a time
- Be conversational and friendly
- Acknowledge their responses before asking follow-up questions
- Summarize key points periodically
- After gathering enough information, provide a summary of their preferences

Respond in the same language the user is using.`

// System prompt for extracting structured profile from chat
const PROFILE_EXTRACTION_PROMPT = `You are an expert at analyzing home buyer preference conversations. Given a chat history, extract a structured JSON profile of their preferences.

Return ONLY valid JSON with this structure:
{
  "location": {
    "preferredAreas": ["list of preferred neighborhoods/areas"],
    "proximityTo": ["work", "schools", etc.],
    "urbanVsSuburban": "urban" | "suburban" | "rural" | "flexible"
  },
  "budget": {
    "min": number or null,
    "max": number or null,
    "flexibility": "strict" | "flexible" | "very_flexible"
  },
  "size": {
    "minBedrooms": number or null,
    "maxBedrooms": number or null,
    "minBathrooms": number or null,
    "minSqft": number or null,
    "maxSqft": number or null
  },
  "features": {
    "mustHave": ["list of must-have features"],
    "niceToHave": ["list of nice-to-have features"],
    "dealBreakers": ["list of deal-breakers"]
  },
  "style": {
    "architecturalPreferences": ["modern", "traditional", etc.],
    "agePreference": "new" | "older" | "any",
    "renovationWillingness": "none" | "minor" | "major" | "full"
  },
  "timeline": {
    "urgency": "asap" | "3_months" | "6_months" | "1_year" | "flexible"
  },
  "summary": "A brief 2-3 sentence summary of their ideal home"
}

If information is not provided for a field, use null. Only include information explicitly mentioned or strongly implied.`

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface DreamHousePreferences {
  location?: {
    preferredAreas?: string[]
    proximityTo?: string[]
    urbanVsSuburban?: 'urban' | 'suburban' | 'rural' | 'flexible'
  }
  budget?: {
    min?: number | null
    max?: number | null
    flexibility?: 'strict' | 'flexible' | 'very_flexible'
  }
  size?: {
    minBedrooms?: number | null
    maxBedrooms?: number | null
    minBathrooms?: number | null
    minSqft?: number | null
    maxSqft?: number | null
  }
  features?: {
    mustHave?: string[]
    niceToHave?: string[]
    dealBreakers?: string[]
  }
  style?: {
    architecturalPreferences?: string[]
    agePreference?: 'new' | 'older' | 'any'
    renovationWillingness?: 'none' | 'minor' | 'major' | 'full'
  }
  timeline?: {
    urgency?: 'asap' | '3_months' | '6_months' | '1_year' | 'flexible'
  }
  summary?: string
}

/**
 * Generate AI response for dream house profile chat
 */
export async function generateDreamHouseResponse(
  chatHistory: ChatMessage[],
  userMessage: string
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }

  // Format messages for Anthropic API
  const messages = [
    ...chatHistory.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user' as const, content: userMessage },
  ]

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: DREAM_HOUSE_SYSTEM_PROMPT,
    messages,
  })

  // Extract text from response
  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from AI')
  }

  return textBlock.text
}

/**
 * Extract structured profile from chat history
 */
export async function extractProfileFromChat(
  chatHistory: ChatMessage[]
): Promise<DreamHousePreferences> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }

  // Format chat history as a single message
  const chatText = chatHistory
    .map((msg) => `${msg.role === 'user' ? 'Buyer' : 'Assistant'}: ${msg.content}`)
    .join('\n\n')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: PROFILE_EXTRACTION_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Extract the home buyer preferences from this conversation:\n\n${chatText}`,
      },
    ],
  })

  // Extract text from response
  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from AI')
  }

  try {
    // Parse JSON from response
    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }
    return JSON.parse(jsonMatch[0])
  } catch {
    console.error('Failed to parse profile:', textBlock.text)
    return {}
  }
}

/**
 * Get initial greeting for dream house chat
 */
export function getInitialGreeting(): string {
  return `Hi! I'm here to help you define your dream home. I'll ask you some questions about your preferences, and together we'll create a profile of exactly what you're looking for.

Let's start with the basics - what area or neighborhoods are you considering? And do you have a budget range in mind?`
}
