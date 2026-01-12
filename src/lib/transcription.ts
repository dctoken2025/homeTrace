import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs/promises'
import path from 'path'
import { prisma } from './prisma'
import { getConfig, CONFIG_KEYS, markConfigUsed } from './config'

// Lazy client initialization
let anthropicClient: Anthropic | null = null

async function getAnthropicClient(): Promise<Anthropic | null> {
  const apiKey = await getConfig(CONFIG_KEYS.ANTHROPIC_API_KEY)
  if (!apiKey) return null
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey })
  }
  await markConfigUsed(CONFIG_KEYS.ANTHROPIC_API_KEY).catch(() => {})
  return anthropicClient
}

export interface TranscriptionResult {
  transcript: string
  detectedLanguage: string
  confidence: number
}

/**
 * Transcribe audio file using OpenAI Whisper API
 * Falls back to placeholder if Whisper is not available
 */
export async function transcribeAudio(
  audioPath: string
): Promise<TranscriptionResult> {
  const storagePath = process.env.STORAGE_PATH || './uploads'
  const fullPath = path.join(storagePath, audioPath)

  // Check if file exists
  try {
    await fs.access(fullPath)
  } catch {
    throw new Error('Audio file not found')
  }

  // Read the audio file
  const audioBuffer = await fs.readFile(fullPath)
  const stats = await fs.stat(fullPath)

  // Log API call start time
  const startTime = Date.now()

  // Try OpenAI Whisper first if API key is available
  if (process.env.OPENAI_API_KEY) {
    try {
      const result = await transcribeWithWhisper(audioBuffer, path.basename(audioPath))

      // Log successful API call
      await logApiCall('openai_whisper', '/v1/audio/transcriptions', 'POST', 200, Date.now() - startTime)

      return result
    } catch (error) {
      console.error('Whisper transcription failed, falling back:', error)
      await logApiCall('openai_whisper', '/v1/audio/transcriptions', 'POST', 500, Date.now() - startTime, String(error))
    }
  }

  // Try Google Cloud Speech-to-Text if available
  if (process.env.GOOGLE_CLOUD_API_KEY) {
    try {
      const result = await transcribeWithGoogle(audioBuffer)

      await logApiCall('google_speech', '/speech:recognize', 'POST', 200, Date.now() - startTime)

      return result
    } catch (error) {
      console.error('Google Speech failed:', error)
      await logApiCall('google_speech', '/speech:recognize', 'POST', 500, Date.now() - startTime, String(error))
    }
  }

  // Fallback: Return placeholder
  // In production, you MUST configure a real speech-to-text service
  console.warn('No speech-to-text service configured. Using placeholder.')

  return {
    transcript: `[Audio file: ${path.basename(audioPath)}, Size: ${Math.round(stats.size / 1024)}KB]

⚠️ Real transcription not available. Please configure one of:
- OPENAI_API_KEY for OpenAI Whisper
- GOOGLE_CLOUD_API_KEY for Google Speech-to-Text

This placeholder will be replaced with actual transcription once configured.`,
    detectedLanguage: 'en',
    confidence: 0.0,
  }
}

/**
 * Transcribe using OpenAI Whisper API
 */
async function transcribeWithWhisper(
  audioBuffer: Buffer,
  filename: string
): Promise<TranscriptionResult> {
  const formData = new FormData()

  // Create a Blob from the buffer (use Uint8Array for compatibility)
  const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/webm' })
  formData.append('file', audioBlob, filename)
  formData.append('model', 'whisper-1')
  formData.append('response_format', 'verbose_json')

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Whisper API error')
  }

  const data = await response.json()

  return {
    transcript: data.text,
    detectedLanguage: data.language || 'en',
    confidence: 0.95, // Whisper doesn't return confidence, use high default
  }
}

/**
 * Transcribe using Google Cloud Speech-to-Text API
 */
async function transcribeWithGoogle(
  audioBuffer: Buffer
): Promise<TranscriptionResult> {
  const audioContent = audioBuffer.toString('base64')

  const response = await fetch(
    `https://speech.googleapis.com/v1/speech:recognize?key=${process.env.GOOGLE_CLOUD_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        config: {
          encoding: 'WEBM_OPUS',
          sampleRateHertz: 48000,
          languageCode: 'en-US',
          alternativeLanguageCodes: ['es-ES', 'pt-BR', 'fr-FR', 'de-DE'],
          enableAutomaticPunctuation: true,
          model: 'latest_long',
        },
        audio: {
          content: audioContent,
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Google Speech API error')
  }

  const data = await response.json()

  if (!data.results || data.results.length === 0) {
    return {
      transcript: '',
      detectedLanguage: 'en',
      confidence: 0,
    }
  }

  const transcript = data.results
    .map((result: { alternatives: Array<{ transcript: string }> }) => result.alternatives[0]?.transcript || '')
    .join(' ')

  const confidence = data.results[0]?.alternatives[0]?.confidence || 0.8
  const detectedLanguage = data.results[0]?.languageCode?.split('-')[0] || 'en'

  return {
    transcript,
    detectedLanguage,
    confidence,
  }
}

/**
 * Log API call for monitoring
 */
async function logApiCall(
  service: string,
  endpoint: string,
  method: string,
  status: number,
  duration: number,
  errorMessage?: string
) {
  try {
    await prisma.apiLog.create({
      data: {
        service,
        endpoint,
        method,
        responseStatus: status,
        duration,
        errorMessage,
      },
    })
  } catch (error) {
    console.error('Failed to log API call:', error)
  }
}

/**
 * Detect language from text using AI
 */
export async function detectLanguage(text: string): Promise<string> {
  const anthropic = await getAnthropicClient()
  if (!anthropic) {
    return 'en' // Default to English
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 10,
      messages: [
        {
          role: 'user',
          content: `What language is this text in? Reply with only the ISO 639-1 language code (e.g., 'en', 'es', 'pt', 'fr'):\n\n"${text.slice(0, 500)}"`,
        },
      ],
    })

    const textBlock = response.content.find((block) => block.type === 'text')
    if (textBlock && textBlock.type === 'text') {
      const code = textBlock.text.trim().toLowerCase().slice(0, 2)
      return code
    }
  } catch (error) {
    console.error('Language detection failed:', error)
  }

  return 'en' // Default to English
}

/**
 * Estimate transcription time based on file size
 */
export function estimateTranscriptionTime(fileSizeBytes: number): number {
  // Whisper processes ~1 minute of audio in ~2-5 seconds
  // Rough estimate: 1MB = 1 min of audio = 5 seconds processing
  const estimatedMinutes = fileSizeBytes / (1024 * 1024)
  return Math.max(5, Math.ceil(estimatedMinutes * 5))
}

/**
 * Batch transcribe multiple recordings
 */
export async function batchTranscribe(
  recordingIds: string[]
): Promise<Map<string, TranscriptionResult>> {
  const results = new Map<string, TranscriptionResult>()

  for (const recordingId of recordingIds) {
    try {
      const recording = await prisma.recording.findUnique({
        where: { id: recordingId },
      })

      if (!recording?.audioUrl) {
        continue
      }

      // Update status to transcribing
      await prisma.recording.update({
        where: { id: recordingId },
        data: { status: 'TRANSCRIBING' },
      })

      // Extract path from URL
      const audioPath = recording.audioUrl.replace('/api/storage/', '')
      const result = await transcribeAudio(audioPath)

      // Update recording with transcript
      await prisma.recording.update({
        where: { id: recordingId },
        data: {
          transcript: result.transcript,
          detectedLanguage: result.detectedLanguage,
          status: 'TRANSCRIBED',
        },
      })

      results.set(recordingId, result)
    } catch (error) {
      console.error(`Failed to transcribe recording ${recordingId}:`, error)

      // Mark as failed
      await prisma.recording.update({
        where: { id: recordingId },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Transcription failed',
          retryCount: { increment: 1 },
        },
      })
    }
  }

  return results
}
