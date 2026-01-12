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

// Types for report generation
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

export interface VisitData {
  id: string
  houseId: string
  status: string
  overallImpression: string | null
  wouldBuy: boolean | null
  notes: string | null
  recordings: RecordingData[]
}

export interface RecordingData {
  id: string
  roomId: string
  roomName: string
  transcript: string | null
  sentiment: string | null
  keyPoints: string[]
}

export interface ReportInput {
  buyerId: string
  houses: HouseData[]
  visits: VisitData[]
  dreamHouseProfile: DreamHousePreferences | null
  language: string
}

export interface HouseRanking {
  houseId: string
  rank: number
  score: number // 0-100
  matchPercentage: number
  pros: string[]
  cons: string[]
  matchingFeatures: string[]
  missingFeatures: string[]
  priceAnalysis: string
  recommendation: string
}

export interface ReportContent {
  summary: string
  overallRecommendation: string
  topPick: {
    houseId: string
    reason: string
  } | null
  rankings: HouseRanking[]
  dealBreakers: {
    houseId: string
    issues: string[]
  }[]
  insights: {
    category: string
    observation: string
    suggestion: string
  }[]
  nextSteps: string[]
}

// System prompt for report generation
const REPORT_SYSTEM_PROMPT = `You are an expert real estate analyst helping a home buyer make an informed decision.
You will analyze the buyer's dream house preferences, visited houses, and their recorded impressions to generate a comprehensive report.

Your analysis should:
1. Compare each house against the buyer's stated preferences
2. Consider the buyer's recorded impressions and sentiments from visits
3. Identify pros and cons for each property
4. Rank houses based on overall match and buyer feedback
5. Highlight any deal-breakers
6. Provide actionable insights and next steps

Be objective, thorough, and helpful. Focus on facts and observations rather than assumptions.
Respond in the language specified by the user.`

/**
 * Generate a comprehensive AI report for a buyer
 */
export async function generateReport(input: ReportInput): Promise<ReportContent> {
  const anthropic = await getAnthropicClient()

  // Build the analysis prompt
  const prompt = buildReportPrompt(input)

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: REPORT_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  // Extract text from response
  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from AI')
  }

  // Parse the JSON response
  try {
    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }
    return JSON.parse(jsonMatch[0])
  } catch (err) {
    console.error('Failed to parse report:', textBlock.text)
    throw new Error('Failed to parse AI report response')
  }
}

/**
 * Build the prompt for report generation
 */
function buildReportPrompt(input: ReportInput): string {
  const { houses, visits, dreamHouseProfile, language } = input

  let prompt = `Generate a comprehensive home buying analysis report in ${language === 'pt' ? 'Portuguese' : language === 'es' ? 'Spanish' : 'English'}.

`

  // Add dream house preferences
  if (dreamHouseProfile) {
    prompt += `## Buyer's Dream House Preferences

`
    if (dreamHouseProfile.summary) {
      prompt += `Summary: ${dreamHouseProfile.summary}\n\n`
    }
    if (dreamHouseProfile.location) {
      prompt += `Location Preferences:\n`
      if (dreamHouseProfile.location.preferredAreas?.length) {
        prompt += `- Preferred areas: ${dreamHouseProfile.location.preferredAreas.join(', ')}\n`
      }
      if (dreamHouseProfile.location.urbanVsSuburban) {
        prompt += `- Setting: ${dreamHouseProfile.location.urbanVsSuburban}\n`
      }
    }
    if (dreamHouseProfile.budget) {
      prompt += `Budget:\n`
      if (dreamHouseProfile.budget.min || dreamHouseProfile.budget.max) {
        prompt += `- Range: $${dreamHouseProfile.budget.min?.toLocaleString() || 'Any'} - $${dreamHouseProfile.budget.max?.toLocaleString() || 'Any'}\n`
      }
      if (dreamHouseProfile.budget.flexibility) {
        prompt += `- Flexibility: ${dreamHouseProfile.budget.flexibility}\n`
      }
    }
    if (dreamHouseProfile.size) {
      prompt += `Size Requirements:\n`
      if (dreamHouseProfile.size.minBedrooms) prompt += `- Min bedrooms: ${dreamHouseProfile.size.minBedrooms}\n`
      if (dreamHouseProfile.size.minBathrooms) prompt += `- Min bathrooms: ${dreamHouseProfile.size.minBathrooms}\n`
      if (dreamHouseProfile.size.minSqft) prompt += `- Min sqft: ${dreamHouseProfile.size.minSqft}\n`
    }
    if (dreamHouseProfile.features) {
      if (dreamHouseProfile.features.mustHave?.length) {
        prompt += `Must-have features: ${dreamHouseProfile.features.mustHave.join(', ')}\n`
      }
      if (dreamHouseProfile.features.niceToHave?.length) {
        prompt += `Nice-to-have features: ${dreamHouseProfile.features.niceToHave.join(', ')}\n`
      }
      if (dreamHouseProfile.features.dealBreakers?.length) {
        prompt += `Deal-breakers: ${dreamHouseProfile.features.dealBreakers.join(', ')}\n`
      }
    }
    prompt += '\n'
  } else {
    prompt += `Note: No dream house preferences profile available. Analyze based on visit feedback only.\n\n`
  }

  // Add houses
  prompt += `## Houses Being Considered (${houses.length} properties)

`
  for (const house of houses) {
    prompt += `### ${house.address}, ${house.city}, ${house.state}
- ID: ${house.id}
- Price: ${house.price ? `$${house.price.toLocaleString()}` : 'Not listed'}
- Bedrooms: ${house.bedrooms || 'N/A'}
- Bathrooms: ${house.bathrooms || 'N/A'}
- Sqft: ${house.sqft?.toLocaleString() || 'N/A'}
- Year Built: ${house.yearBuilt || 'N/A'}
- Type: ${house.propertyType || 'N/A'}
- Features: ${house.features.length > 0 ? house.features.join(', ') : 'None listed'}
${house.description ? `- Description: ${house.description.substring(0, 200)}...` : ''}

`
  }

  // Add visit data
  const completedVisits = visits.filter((v) => v.status === 'COMPLETED')
  if (completedVisits.length > 0) {
    prompt += `## Visit Feedback (${completedVisits.length} completed visits)

`
    for (const visit of completedVisits) {
      const house = houses.find((h) => h.id === visit.houseId)
      if (!house) continue

      prompt += `### Visit to ${house.address}
- Overall Impression: ${visit.overallImpression || 'Not recorded'}
- Would Buy: ${visit.wouldBuy === true ? 'Yes' : visit.wouldBuy === false ? 'No' : 'Undecided'}
${visit.notes ? `- Notes: ${visit.notes}` : ''}

`
      // Add recording transcripts/key points
      if (visit.recordings.length > 0) {
        prompt += `Recorded observations:\n`
        for (const rec of visit.recordings) {
          if (rec.transcript || rec.keyPoints.length > 0) {
            prompt += `- ${rec.roomName}: `
            if (rec.keyPoints.length > 0) {
              prompt += rec.keyPoints.join('; ')
            } else if (rec.transcript) {
              prompt += rec.transcript.substring(0, 200)
            }
            if (rec.sentiment) {
              prompt += ` [Sentiment: ${rec.sentiment}]`
            }
            prompt += '\n'
          }
        }
        prompt += '\n'
      }
    }
  }

  // Request format
  prompt += `## Output Format

Return a JSON object with this exact structure:
{
  "summary": "2-3 sentence executive summary of the analysis",
  "overallRecommendation": "Clear recommendation for the buyer",
  "topPick": {
    "houseId": "ID of the recommended house or null if none",
    "reason": "Why this is the top pick"
  },
  "rankings": [
    {
      "houseId": "house ID",
      "rank": 1,
      "score": 85,
      "matchPercentage": 80,
      "pros": ["list of pros"],
      "cons": ["list of cons"],
      "matchingFeatures": ["features that match preferences"],
      "missingFeatures": ["preferred features not present"],
      "priceAnalysis": "Analysis of price vs value",
      "recommendation": "Specific recommendation for this house"
    }
  ],
  "dealBreakers": [
    {
      "houseId": "house ID",
      "issues": ["list of deal-breaker issues"]
    }
  ],
  "insights": [
    {
      "category": "Category like Location, Price, Features, etc.",
      "observation": "What was observed",
      "suggestion": "Actionable suggestion"
    }
  ],
  "nextSteps": ["Ordered list of recommended next actions"]
}

Rank ALL houses from best to worst match. Include deal-breakers only for houses with clear issues.
Provide at least 3-5 insights and 3-5 next steps.`

  return prompt
}

/**
 * Calculate basic match score without AI (for quick estimates)
 */
export function calculateBasicMatchScore(
  house: HouseData,
  profile: DreamHousePreferences | null,
  visit: VisitData | null
): number {
  if (!profile) {
    // Without profile, base score on visit impression
    if (!visit) return 50

    switch (visit.overallImpression) {
      case 'LOVED':
        return 90
      case 'LIKED':
        return 75
      case 'NEUTRAL':
        return 50
      case 'DISLIKED':
        return 25
      default:
        return 50
    }
  }

  let score = 50 // Base score
  let factors = 0

  // Budget match
  if (profile.budget && house.price) {
    factors++
    const { min, max } = profile.budget
    if (min && max) {
      if (house.price >= min && house.price <= max) {
        score += 15
      } else if (house.price < min * 0.9 || house.price > max * 1.1) {
        score -= 15
      }
    }
  }

  // Size match
  if (profile.size) {
    if (profile.size.minBedrooms && house.bedrooms) {
      factors++
      if (house.bedrooms >= profile.size.minBedrooms) {
        score += 10
      } else {
        score -= 10
      }
    }
    if (profile.size.minBathrooms && house.bathrooms) {
      factors++
      if (house.bathrooms >= profile.size.minBathrooms) {
        score += 5
      } else {
        score -= 5
      }
    }
  }

  // Visit impression adjustment
  if (visit) {
    factors++
    switch (visit.overallImpression) {
      case 'LOVED':
        score += 20
        break
      case 'LIKED':
        score += 10
        break
      case 'NEUTRAL':
        break
      case 'DISLIKED':
        score -= 20
        break
    }
  }

  // Normalize score to 0-100
  return Math.max(0, Math.min(100, score))
}
