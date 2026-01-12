import Anthropic from '@anthropic-ai/sdk'
import { DreamHousePreferences } from './ai'
import { getConfig, CONFIG_KEYS, markConfigUsed } from './config'

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

export interface HouseData {
  id: string
  address: string
  city: string
  state: string
  price: number | null
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  yearBuilt: number | null
  propertyType: string | null
  features: string[]
  description: string | null
}

export interface MatchScoreResult {
  score: number // 0-100
  breakdown: {
    location: number
    budget: number
    size: number
    features: number
    style: number
  }
  highlights: string[] // What matches well
  concerns: string[] // Potential issues
  summary: string
}

const MATCH_SCORE_PROMPT = `You are an expert real estate matching system. Given a buyer's dream house preferences and a property listing, calculate a match score from 0-100.

Return ONLY valid JSON with this structure:
{
  "score": <overall score 0-100>,
  "breakdown": {
    "location": <0-100>,
    "budget": <0-100>,
    "size": <0-100>,
    "features": <0-100>,
    "style": <0-100>
  },
  "highlights": ["list of 2-4 things that match well"],
  "concerns": ["list of 0-3 potential concerns or missing features"],
  "summary": "A brief 1-2 sentence summary of why this house does or doesn't match"
}

Scoring guidelines:
- 90-100: Perfect or near-perfect match
- 70-89: Good match with minor compromises
- 50-69: Decent match, notable compromises
- 30-49: Poor match, significant issues
- 0-29: Very poor match, deal-breakers present

Consider:
- If price exceeds max budget, score budget lower
- If essential bedrooms/bathrooms are missing, score size lower
- If deal-breakers are present, reduce overall score significantly
- If must-have features are missing, reduce features score
- Weight must-haves more heavily than nice-to-haves`

/**
 * Calculate match score between a house and buyer preferences
 */
export async function calculateMatchScore(
  house: HouseData,
  preferences: DreamHousePreferences
): Promise<MatchScoreResult> {
  const anthropic = await getAnthropicClient()

  const houseInfo = `
Property Details:
- Address: ${house.address}, ${house.city}, ${house.state}
- Price: ${house.price ? `$${house.price.toLocaleString()}` : 'Not specified'}
- Bedrooms: ${house.bedrooms ?? 'Not specified'}
- Bathrooms: ${house.bathrooms ?? 'Not specified'}
- Square Feet: ${house.sqft ? house.sqft.toLocaleString() : 'Not specified'}
- Year Built: ${house.yearBuilt ?? 'Not specified'}
- Property Type: ${house.propertyType ?? 'Not specified'}
- Features: ${house.features.length > 0 ? house.features.join(', ') : 'None listed'}
- Description: ${house.description || 'No description available'}
`

  const preferencesInfo = `
Buyer Preferences:
- Location: ${preferences.location?.preferredAreas?.join(', ') || 'Any'}
- Urban/Suburban: ${preferences.location?.urbanVsSuburban || 'Flexible'}
- Budget: ${preferences.budget?.min ? `$${preferences.budget.min.toLocaleString()}` : 'No min'} - ${preferences.budget?.max ? `$${preferences.budget.max.toLocaleString()}` : 'No max'}
- Budget Flexibility: ${preferences.budget?.flexibility || 'Not specified'}
- Bedrooms: ${preferences.size?.minBedrooms || 'Any'} - ${preferences.size?.maxBedrooms || 'Any'}
- Bathrooms: At least ${preferences.size?.minBathrooms || 'Any'}
- Square Feet: ${preferences.size?.minSqft || 'Any'} - ${preferences.size?.maxSqft || 'Any'}
- Must-Have Features: ${preferences.features?.mustHave?.join(', ') || 'None specified'}
- Nice-to-Have Features: ${preferences.features?.niceToHave?.join(', ') || 'None specified'}
- Deal-Breakers: ${preferences.features?.dealBreakers?.join(', ') || 'None specified'}
- Style Preferences: ${preferences.style?.architecturalPreferences?.join(', ') || 'Any'}
- Home Age: ${preferences.style?.agePreference || 'Any'}
- Renovation Willingness: ${preferences.style?.renovationWillingness || 'Not specified'}
- Summary: ${preferences.summary || 'No summary provided'}
`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: MATCH_SCORE_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Calculate the match score for this property:\n${houseInfo}\n\nBuyer Preferences:\n${preferencesInfo}`,
      },
    ],
  })

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
    console.error('Failed to parse match score:', textBlock.text)
    // Return a default score if parsing fails
    return {
      score: 50,
      breakdown: {
        location: 50,
        budget: 50,
        size: 50,
        features: 50,
        style: 50,
      },
      highlights: ['Unable to analyze match'],
      concerns: ['Match analysis failed'],
      summary: 'Could not analyze this property match.',
    }
  }
}

export interface TranscriptionResult {
  transcript: string
  detectedLanguage: string
  duration: number // in seconds
}

export interface RecordingAnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed'
  keyPoints: string[]
  concerns: string[]
  highlights: string[]
  overallImpression: 'loved' | 'liked' | 'neutral' | 'disliked'
  wouldRecommend: boolean
  summary: string
}

const RECORDING_ANALYSIS_PROMPT = `You are an expert at analyzing home buyer visit recordings. Given a transcript of a buyer's comments during a house visit, extract their impressions and key points.

Return ONLY valid JSON with this structure:
{
  "sentiment": "positive" | "negative" | "neutral" | "mixed",
  "keyPoints": ["list of 3-5 main observations the buyer made"],
  "concerns": ["list of concerns or issues mentioned"],
  "highlights": ["list of positive aspects mentioned"],
  "overallImpression": "loved" | "liked" | "neutral" | "disliked",
  "wouldRecommend": true | false,
  "summary": "A brief 2-3 sentence summary of their overall impression"
}

Guidelines:
- Extract specific comments about rooms, features, conditions
- Note any deal-breakers or must-haves mentioned
- Consider tone and enthusiasm level
- Identify practical concerns (repairs, costs, etc.)
- Note emotional reactions (excitement, disappointment)`

/**
 * Analyze a recording transcript to extract insights
 */
export async function analyzeRecordingTranscript(
  transcript: string,
  roomName: string
): Promise<RecordingAnalysisResult> {
  const anthropic = await getAnthropicClient()

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: RECORDING_ANALYSIS_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Analyze this buyer's recording from the ${roomName}:\n\n"${transcript}"`,
      },
    ],
  })

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
    console.error('Failed to parse recording analysis:', textBlock.text)
    return {
      sentiment: 'neutral',
      keyPoints: ['Analysis failed'],
      concerns: [],
      highlights: [],
      overallImpression: 'neutral',
      wouldRecommend: false,
      summary: 'Could not analyze this recording.',
    }
  }
}

/**
 * Calculate match scores for multiple houses
 */
export async function calculateBulkMatchScores(
  houses: HouseData[],
  preferences: DreamHousePreferences
): Promise<Map<string, MatchScoreResult>> {
  const results = new Map<string, MatchScoreResult>()

  // Process in batches to avoid rate limiting
  const batchSize = 3
  for (let i = 0; i < houses.length; i += batchSize) {
    const batch = houses.slice(i, i + batchSize)
    const promises = batch.map(async (house) => {
      try {
        const score = await calculateMatchScore(house, preferences)
        return { id: house.id, score }
      } catch (error) {
        console.error(`Failed to calculate score for house ${house.id}:`, error)
        return {
          id: house.id,
          score: {
            score: 0,
            breakdown: { location: 0, budget: 0, size: 0, features: 0, style: 0 },
            highlights: [],
            concerns: ['Scoring failed'],
            summary: 'Could not calculate match score.',
          },
        }
      }
    })

    const batchResults = await Promise.all(promises)
    batchResults.forEach(({ id, score }) => {
      results.set(id, score)
    })

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < houses.length) {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  return results
}
