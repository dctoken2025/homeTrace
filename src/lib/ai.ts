import Anthropic from '@anthropic-ai/sdk'
import { withApiLogging } from './api-logger'
import { getConfig, CONFIG_KEYS, markConfigUsed } from './config'

// Lazy initialization of Anthropic client
let anthropicClient: Anthropic | null = null

/**
 * Get or create Anthropic client with API key from database/env
 */
async function getAnthropicClient(): Promise<Anthropic> {
  const apiKey = await getConfig(CONFIG_KEYS.ANTHROPIC_API_KEY)

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured. Please set it in Admin > Configuration.')
  }

  // Create new client if key might have changed or doesn't exist
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey })
  }

  // Mark as used for tracking
  await markConfigUsed(CONFIG_KEYS.ANTHROPIC_API_KEY).catch(() => {})

  return anthropicClient
}

/**
 * Reset client (call after config update to pick up new key)
 */
export function resetAnthropicClient(): void {
  anthropicClient = null
}

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
  const client = await getAnthropicClient()

  // Format messages for Anthropic API
  const messages = [
    ...chatHistory.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user' as const, content: userMessage },
  ]

  const response = await withApiLogging(
    'anthropic',
    '/v1/messages',
    'POST',
    () => client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: DREAM_HOUSE_SYSTEM_PROMPT,
      messages,
    })
  )

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
  const client = await getAnthropicClient()

  // Format chat history as a single message
  const chatText = chatHistory
    .map((msg) => `${msg.role === 'user' ? 'Buyer' : 'Assistant'}: ${msg.content}`)
    .join('\n\n')

  const response = await withApiLogging(
    'anthropic',
    '/v1/messages',
    'POST',
    () => client.messages.create({
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
  )

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

// System prompt for generating buyer persona
const BUYER_PERSONA_PROMPT = `You are an expert real estate consultant who creates detailed buyer personas from structured preference data.

Given the buyer's preferences, create a comprehensive BUYER PERSONA that will help real estate agents understand exactly what this buyer is looking for.

Your response must be a valid JSON object with this structure:
{
  "narrative": "A detailed 3-5 paragraph narrative describing who this buyer is, their lifestyle, why they're looking for a home, what's essential vs nice-to-have for them, and what kind of neighborhood suits them. Write in third person (e.g., 'This buyer is...'). Be specific and paint a clear picture.",

  "searchPrompt": "A single optimized paragraph that could be used to search for homes matching this buyer's needs. Include key criteria like location, price range, bedrooms, must-have features. Write it as if describing the perfect home.",

  "matchingCriteria": ["Array of criteria ordered from most to least important. Each item should be a specific, measurable criterion like 'Minimum 3 bedrooms', 'Budget under $500,000', 'Must have pool', etc."],

  "summary": "A 2-3 sentence executive summary capturing the essence of this buyer - who they are and what they need."
}

Guidelines:
- Be specific and actionable
- Prioritize based on what the buyer indicated as essential
- Consider lifestyle factors when describing the ideal neighborhood
- Write in the same language as the user's data (if data is in Portuguese, respond in Portuguese)
- Make the narrative feel like a real person, not a checklist`

// Refinement chat prompt
const REFINEMENT_CHAT_PROMPT = `You are an experienced real estate consultant reviewing a buyer's profile.

Current buyer profile:
{profile}

Your task is to ask 2-3 targeted questions to refine and complete their profile. Focus on:
- Aspects that seem incomplete or ambiguous
- Trade-offs the buyer might need to make
- Details that would significantly improve property matching

Guidelines:
- Be conversational and friendly
- Ask one question at a time
- Acknowledge what they've already shared
- Keep questions specific and actionable
- Respond in the same language as the profile`

export interface BuyerPersona {
  narrative: string
  searchPrompt: string
  matchingCriteria: string[]
  summary: string
}

/**
 * Generate a buyer persona from structured profile data
 */
export async function generateBuyerPersona(profile: Record<string, unknown>): Promise<BuyerPersona> {
  const client = await getAnthropicClient()

  const response = await withApiLogging(
    'anthropic',
    '/v1/messages',
    'POST',
    () => client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: BUYER_PERSONA_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Generate a buyer persona from this profile data:\n\n${JSON.stringify(profile, null, 2)}`,
        },
      ],
    })
  )

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from AI')
  }

  try {
    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }
    return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error('Failed to parse buyer persona:', textBlock.text)
    // Return a basic persona on parse failure
    return {
      narrative: 'Unable to generate detailed narrative. Please try again.',
      searchPrompt: 'Home matching buyer preferences.',
      matchingCriteria: [],
      summary: 'Buyer profile needs refinement.',
    }
  }
}

/**
 * Generate refinement questions for a buyer profile
 */
export async function generateRefinementQuestions(
  profile: Record<string, unknown>,
  chatHistory: ChatMessage[] = []
): Promise<string> {
  const client = await getAnthropicClient()

  const systemPrompt = REFINEMENT_CHAT_PROMPT.replace('{profile}', JSON.stringify(profile, null, 2))

  const messages = chatHistory.length > 0
    ? chatHistory.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }))
    : [{ role: 'user' as const, content: 'Please review my profile and ask me questions to refine it.' }]

  const response = await withApiLogging(
    'anthropic',
    '/v1/messages',
    'POST',
    () => client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    })
  )

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from AI')
  }

  return textBlock.text
}

/**
 * Update buyer persona based on new chat information
 */
export async function updatePersonaFromChat(
  currentPersona: BuyerPersona,
  profile: Record<string, unknown>,
  newInfo: string
): Promise<BuyerPersona> {
  const client = await getAnthropicClient()

  const response = await withApiLogging(
    'anthropic',
    '/v1/messages',
    'POST',
    () => client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: `You are updating a buyer persona with new information from a conversation.

Current persona:
${JSON.stringify(currentPersona, null, 2)}

Current profile:
${JSON.stringify(profile, null, 2)}

Update the persona to incorporate the new information while preserving existing details that weren't contradicted.
Return the updated persona as a JSON object with the same structure (narrative, searchPrompt, matchingCriteria, summary).`,
      messages: [
        {
          role: 'user',
          content: `New information from buyer:\n${newInfo}\n\nPlease update the persona accordingly.`,
        },
      ],
    })
  )

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from AI')
  }

  try {
    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }
    return JSON.parse(jsonMatch[0])
  } catch {
    console.error('Failed to parse updated persona:', textBlock.text)
    return currentPersona
  }
}
