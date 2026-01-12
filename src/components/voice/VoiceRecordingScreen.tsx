'use client'

import { useState } from 'react'
import VoiceRecorder from './VoiceRecorder'
import Card from '@/components/ui/Card'

interface VoiceRecordingScreenProps {
  onComplete: (transcription: string, duration: number) => void
  onCancel: () => void
}

const RECORDING_PROMPTS = [
  {
    category: 'Location',
    icon: '📍',
    prompts: [
      'Which city or neighborhood do you prefer?',
      'Urban, suburban, or rural setting?',
      'Close to work, schools, or parks?',
    ],
  },
  {
    category: 'Size & Layout',
    icon: '🏠',
    prompts: [
      'How many bedrooms and bathrooms?',
      'Single story or multiple floors?',
      'Yard, balcony, or outdoor space?',
    ],
  },
  {
    category: 'Features',
    icon: '✨',
    prompts: [
      'Pool, garage, home office?',
      'Open kitchen or separate?',
      'Modern or traditional style?',
    ],
  },
  {
    category: 'Lifestyle',
    icon: '👨‍👩‍👧‍👦',
    prompts: [
      'Work from home needs?',
      'Kids or pets?',
      'Entertainment space?',
    ],
  },
]

export default function VoiceRecordingScreen({
  onComplete,
  onCancel,
}: VoiceRecordingScreenProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0)
  const [liveTranscription, setLiveTranscription] = useState('')

  const handleRecordingStart = () => {
    setIsRecording(true)
    setLiveTranscription('')
  }

  const handleRecordingStop = () => {
    setIsRecording(false)
  }

  const handleTranscriptionUpdate = (text: string) => {
    setLiveTranscription(text)
  }

  // Cycle through prompts while recording
  const handlePromptCycle = () => {
    setCurrentPromptIndex((prev) => (prev + 1) % RECORDING_PROMPTS.length)
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back</span>
        </button>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
          <span className="text-sm text-gray-600">
            {isRecording ? 'Recording...' : 'Luna is ready'}
          </span>
        </div>
      </div>

      {/* Recording Interface */}
      <Card className="mb-6">
        <div className="text-center mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Describe Your Dream Home
          </h2>
          <p className="text-gray-500">
            Speak naturally about what you're looking for
          </p>
        </div>

        {/* Voice Recorder */}
        <VoiceRecorder
          onRecordingComplete={onComplete}
          onTranscriptionUpdate={handleTranscriptionUpdate}
          onRecordingStart={handleRecordingStart}
          onRecordingStop={handleRecordingStop}
          maxDuration={300}
        />
      </Card>

      {/* Guiding Prompts */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700 text-center">
          Need inspiration? Consider mentioning:
        </h3>

        <div className="grid grid-cols-2 gap-3">
          {RECORDING_PROMPTS.map((category, index) => (
            <button
              key={category.category}
              onClick={handlePromptCycle}
              className={`
                p-4 rounded-xl text-left transition-all
                ${index === currentPromptIndex && isRecording
                  ? 'bg-[#006AFF] text-white shadow-lg scale-[1.02]'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                }
              `}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{category.icon}</span>
                <span className="font-medium">{category.category}</span>
              </div>
              <ul className="space-y-1">
                {category.prompts.map((prompt, pIndex) => (
                  <li
                    key={pIndex}
                    className={`text-sm ${
                      index === currentPromptIndex && isRecording
                        ? 'text-blue-100'
                        : 'text-gray-500'
                    }`}
                  >
                    • {prompt}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>
      </div>

      {/* Tips */}
      {isRecording && (
        <div className="mt-6 p-4 bg-blue-50 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div>
              <p className="text-sm text-blue-800 font-medium">Recording Tips</p>
              <ul className="text-sm text-blue-600 mt-1 space-y-1">
                <li>• Speak clearly and at a normal pace</li>
                <li>• Don't worry about being too organized</li>
                <li>• Share as many details as you'd like</li>
                <li>• Tap the stop button when you're done</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Empty transcription warning */}
      {!isRecording && liveTranscription === '' && (
        <div className="mt-6 p-4 bg-gray-50 rounded-xl text-center">
          <p className="text-sm text-gray-500">
            Your spoken words will be transcribed in real-time as you speak.
          </p>
        </div>
      )}
    </div>
  )
}
