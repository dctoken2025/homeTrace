'use client'

import { useState, useEffect } from 'react'
import Card from '@/components/ui/Card'

interface VoiceProcessingScreenProps {
  transcription: string
  duration: number
  onComplete: (result: AnalysisResult) => void
  onError: (error: string) => void
}

export interface AnalysisResult {
  profile: Record<string, unknown>
  persona: {
    narrative: string
    searchPrompt: string
    matchingCriteria: string[]
    summary: string
  }
  highlights: Array<{
    category: string
    icon: string
    label: string
    value: string
  }>
  clarificationQuestions: string[]
  transcription: string
}

type ProcessingStep = 'analyzing' | 'complete' | 'error'

const STEP_MESSAGES = {
  analyzing: {
    title: 'Understanding your preferences...',
    subtitle: 'Luna is creating your profile',
    icon: '🧠',
  },
  complete: {
    title: 'All done!',
    subtitle: 'Your profile is ready',
    icon: '✨',
  },
  error: {
    title: 'Something went wrong',
    subtitle: 'Please try again',
    icon: '❌',
  },
}

const FUN_FACTS = [
  'The average homebuyer visits 10 homes before making a decision',
  'A well-defined buyer profile can save weeks of searching',
  'Voice descriptions often capture preferences that forms miss',
  'Natural light is one of the most requested home features',
  'Location is typically the #1 factor in home satisfaction',
]

export default function VoiceProcessingScreen({
  transcription,
  duration,
  onComplete,
  onError,
}: VoiceProcessingScreenProps) {
  const [step, setStep] = useState<ProcessingStep>('analyzing')
  const [progress, setProgress] = useState(0)
  const [currentFact, setCurrentFact] = useState(0)

  // Cycle through fun facts
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFact((prev) => (prev + 1) % FUN_FACTS.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  // Animate progress
  useEffect(() => {
    if (step === 'analyzing') {
      const interval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 5, 90))
      }, 500)
      return () => clearInterval(interval)
    }
  }, [step])

  // Process the transcription
  useEffect(() => {
    processTranscription()
  }, [])

  const processTranscription = async () => {
    try {
      setStep('analyzing')
      setProgress(20)

      const analyzeResponse = await fetch('/api/voice/analyze-dream-house', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ transcription }),
      })

      if (!analyzeResponse.ok) {
        const error = await analyzeResponse.json()
        throw new Error(error.error?.message || 'Failed to analyze description')
      }

      const analysisResult = await analyzeResponse.json()
      setProgress(100)
      setStep('complete')

      // Small delay for UX
      await new Promise((resolve) => setTimeout(resolve, 500))

      onComplete({
        ...analysisResult.data,
        transcription,
      })
    } catch (error) {
      console.error('Processing error:', error)
      setStep('error')
      onError(error instanceof Error ? error.message : 'Processing failed')
    }
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const stepInfo = STEP_MESSAGES[step]

  return (
    <div className="max-w-xl mx-auto">
      <Card className="text-center">
        {/* Animated Icon */}
        <div className="relative mb-6">
          <div
            className={`
              w-24 h-24 mx-auto rounded-full flex items-center justify-center
              ${step === 'error' ? 'bg-red-100' : 'bg-gradient-to-br from-[#006AFF] to-[#0052CC]'}
            `}
          >
            <span className="text-4xl">{stepInfo.icon}</span>
          </div>

          {/* Spinning loader */}
          {step === 'analyzing' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-28 h-28 border-4 border-[#006AFF] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Status Text */}
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          {stepInfo.title}
        </h2>
        <p className="text-gray-500 mb-6">{stepInfo.subtitle}</p>

        {/* Progress Bar */}
        {step !== 'error' && (
          <div className="mb-6">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#006AFF] transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-400 mt-2">{progress}% complete</p>
          </div>
        )}

        {/* Recording Info */}
        <div className="flex items-center justify-center gap-4 py-4 border-y border-gray-100 mb-6">
          <div className="flex items-center gap-2 text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
            <span className="text-sm">{formatDuration(duration)} recorded</span>
          </div>
          <div className="w-1 h-1 bg-gray-300 rounded-full" />
          <div className="flex items-center gap-2 text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span className="text-sm">
              {transcription.split(' ').length} words
            </span>
          </div>
        </div>

        {/* Transcription Preview */}
        <div className="text-left mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <span>📝</span> What you said:
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 max-h-32 overflow-y-auto">
            <p className="text-sm text-gray-600 italic">"{transcription}"</p>
          </div>
        </div>

        {/* Fun Facts */}
        {step === 'analyzing' && (
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-600">
              <span className="font-medium">Did you know? </span>
              {FUN_FACTS[currentFact]}
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
