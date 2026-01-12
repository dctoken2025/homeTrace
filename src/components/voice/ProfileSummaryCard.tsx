'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { AnalysisResult } from './VoiceProcessingScreen'

interface ProfileSummaryCardProps {
  result: AnalysisResult
  onConfirm: () => void
  onRefine: () => void
  onRecordAgain: () => void
}

export default function ProfileSummaryCard({
  result,
  onConfirm,
  onRefine,
  onRecordAgain,
}: ProfileSummaryCardProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'details' | 'transcript'>('summary')
  const [expandedNarrative, setExpandedNarrative] = useState(false)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Success Header */}
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Your Dream Home Profile is Ready!
        </h1>
        <p className="text-gray-500">
          Luna understood your preferences. Review and confirm below.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
        {(['summary', 'details', 'transcript'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all
              ${activeTab === tab
                ? 'bg-white text-[#006AFF] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
              }
            `}
          >
            {tab === 'summary' && 'Summary'}
            {tab === 'details' && 'Full Profile'}
            {tab === 'transcript' && 'What You Said'}
          </button>
        ))}
      </div>

      {/* Summary Tab */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* Quick Summary Card */}
          <Card className="bg-gradient-to-br from-[#006AFF] to-[#0052CC] text-white">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🏠</span>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Your Buyer Profile</h3>
                <p className="text-blue-100 leading-relaxed">
                  {result.persona.summary}
                </p>
              </div>
            </div>
          </Card>

          {/* Highlights Grid */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Key Preferences</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {result.highlights.map((highlight, index) => (
                <Card
                  key={index}
                  className="text-center hover:shadow-md transition-shadow"
                  padding="md"
                >
                  <span className="text-2xl mb-2 block">{highlight.icon}</span>
                  <p className="text-xs text-gray-500 mb-1">{highlight.label}</p>
                  <p className="font-semibold text-gray-900 text-sm">{highlight.value}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Matching Criteria */}
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>🎯</span> Priority Criteria
            </h3>
            <ol className="space-y-2">
              {result.persona.matchingCriteria.slice(0, 6).map((criteria, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-[#006AFF] text-white rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                    {index + 1}
                  </span>
                  <span className="text-gray-700">{criteria}</span>
                </li>
              ))}
            </ol>
          </Card>

          {/* Clarification Questions */}
          {result.clarificationQuestions.length > 0 && (
            <Card className="bg-amber-50 border-amber-100">
              <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                <span>💬</span> Luna would like to clarify:
              </h3>
              <ul className="space-y-2">
                {result.clarificationQuestions.map((question, index) => (
                  <li key={index} className="flex items-start gap-2 text-amber-700">
                    <svg className="w-4 h-4 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm">{question}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={onRefine}
                className="mt-4 text-sm text-amber-800 font-medium hover:underline"
              >
                Answer these questions →
              </button>
            </Card>
          )}
        </div>
      )}

      {/* Details Tab */}
      {activeTab === 'details' && (
        <Card>
          <div className="prose prose-sm max-w-none">
            <h3 className="font-semibold text-gray-900 mb-4">Full Buyer Narrative</h3>
            <div className={`text-gray-600 leading-relaxed ${!expandedNarrative ? 'line-clamp-6' : ''}`}>
              {result.persona.narrative.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-3">{paragraph}</p>
              ))}
            </div>
            {result.persona.narrative.length > 500 && (
              <button
                onClick={() => setExpandedNarrative(!expandedNarrative)}
                className="text-[#006AFF] text-sm font-medium hover:underline mt-2"
              >
                {expandedNarrative ? 'Show less' : 'Read full narrative'}
              </button>
            )}

            <hr className="my-6" />

            <h3 className="font-semibold text-gray-900 mb-4">Search Description</h3>
            <p className="text-gray-600 bg-gray-50 p-4 rounded-lg italic">
              "{result.persona.searchPrompt}"
            </p>
          </div>
        </Card>
      )}

      {/* Transcript Tab */}
      {activeTab === 'transcript' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Your Recording Transcript</h3>
            <span className="text-sm text-gray-500">Original voice input</span>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              "{result.transcription}"
            </p>
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          fullWidth
          size="lg"
          onClick={onConfirm}
          leftIcon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          }
        >
          Looks Great, Continue!
        </Button>
        <Button
          fullWidth
          size="lg"
          variant="outline"
          onClick={onRefine}
          leftIcon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          }
        >
          Refine with Chat
        </Button>
        <Button
          fullWidth
          size="lg"
          variant="ghost"
          onClick={onRecordAgain}
          leftIcon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          }
        >
          Record Again
        </Button>
      </div>
    </div>
  )
}
