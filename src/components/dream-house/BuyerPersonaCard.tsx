'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import { BuyerPersona } from '@/lib/types/dream-house'

interface BuyerPersonaCardProps {
  persona: BuyerPersona
  onEdit?: () => void
  onRefine?: () => void
  isLoading?: boolean
}

export default function BuyerPersonaCard({
  persona,
  onEdit,
  onRefine,
  isLoading = false,
}: BuyerPersonaCardProps) {
  const [activeTab, setActiveTab] = useState<'narrative' | 'criteria' | 'search'>('narrative')

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gray-200 rounded-full" />
          <div className="flex-1">
            <div className="h-5 bg-gray-200 rounded w-1/3 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-5/6" />
          <div className="h-4 bg-gray-200 rounded w-4/6" />
        </div>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-[#006AFF] to-[#0D47A1] rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Your Buyer Profile</h2>
            <p className="text-sm text-gray-500">Generated based on your preferences</p>
          </div>
        </div>

        <div className="flex gap-2">
          {onEdit && (
            <button
              onClick={onEdit}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Edit Preferences
            </button>
          )}
          {onRefine && (
            <button
              onClick={onRefine}
              className="px-3 py-1.5 text-sm bg-[#006AFF] text-white rounded-lg hover:bg-[#0D47A1] transition-colors"
            >
              Refine Profile
            </button>
          )}
        </div>
      </div>

      {/* Summary Card */}
      <div className="p-4 bg-gradient-to-r from-[#E3F2FD] to-[#BBDEFB] rounded-lg mb-6">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-[#006AFF] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <p className="text-[#0D47A1] text-sm font-medium">{persona.summary}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-4">
        <TabButton
          active={activeTab === 'narrative'}
          onClick={() => setActiveTab('narrative')}
        >
          Full Profile
        </TabButton>
        <TabButton
          active={activeTab === 'criteria'}
          onClick={() => setActiveTab('criteria')}
        >
          Match Criteria
        </TabButton>
        <TabButton
          active={activeTab === 'search'}
          onClick={() => setActiveTab('search')}
        >
          Search Prompt
        </TabButton>
      </div>

      {/* Tab Content */}
      <div className="min-h-[200px]">
        {activeTab === 'narrative' && (
          <div className="prose prose-sm max-w-none">
            {persona.narrative.split('\n\n').map((paragraph, index) => (
              <p key={index} className="text-gray-700 leading-relaxed mb-4 last:mb-0">
                {paragraph}
              </p>
            ))}
          </div>
        )}

        {activeTab === 'criteria' && (
          <div className="space-y-2">
            <p className="text-sm text-gray-500 mb-4">
              Criteria ordered from most to least important:
            </p>
            {persona.matchingCriteria.map((criterion, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <span className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0
                  ${index < 3 ? 'bg-[#006AFF] text-white' : 'bg-gray-200 text-gray-600'}
                `}>
                  {index + 1}
                </span>
                <span className="text-sm text-gray-700">{criterion}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'search' && (
          <div>
            <p className="text-sm text-gray-500 mb-4">
              Use this prompt to search for properties that match your profile:
            </p>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {persona.searchPrompt}
              </p>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(persona.searchPrompt)}
              className="mt-3 flex items-center gap-2 px-3 py-2 text-sm text-[#006AFF] hover:bg-[#E3F2FD] rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Prompt
            </button>
          </div>
        )}
      </div>
    </Card>
  )
}

interface TabButtonProps {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}

function TabButton({ children, active, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all
        ${active
          ? 'bg-white text-[#006AFF] shadow-sm'
          : 'text-gray-600 hover:text-gray-900'
        }
      `}
    >
      {children}
    </button>
  )
}

// Compact version for sidebar or dashboard
interface BuyerPersonaSummaryProps {
  persona: BuyerPersona
  onViewFull?: () => void
}

export function BuyerPersonaSummary({ persona, onViewFull }: BuyerPersonaSummaryProps) {
  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-[#006AFF] rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h3 className="font-medium text-gray-900">Your Profile</h3>
      </div>

      <p className="text-sm text-gray-600 line-clamp-3 mb-3">
        {persona.summary}
      </p>

      {/* Top 3 criteria */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {persona.matchingCriteria.slice(0, 3).map((criterion, index) => (
          <span
            key={index}
            className="px-2 py-0.5 bg-[#E3F2FD] text-[#0D47A1] text-xs rounded-full"
          >
            {criterion.length > 25 ? criterion.substring(0, 25) + '...' : criterion}
          </span>
        ))}
      </div>

      {onViewFull && (
        <button
          onClick={onViewFull}
          className="text-sm text-[#006AFF] hover:text-[#0D47A1] font-medium"
        >
          View full profile →
        </button>
      )}
    </div>
  )
}

// Loading skeleton for persona generation
export function PersonaGeneratingAnimation() {
  return (
    <Card className="text-center py-12">
      <div className="relative w-20 h-20 mx-auto mb-6">
        {/* Outer spinning ring */}
        <div className="absolute inset-0 border-4 border-[#E3F2FD] rounded-full" />
        <div className="absolute inset-0 border-4 border-transparent border-t-[#006AFF] rounded-full animate-spin" />

        {/* Inner icon */}
        <div className="absolute inset-3 bg-gradient-to-br from-[#006AFF] to-[#0D47A1] rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Generating Your Buyer Profile
      </h3>
      <p className="text-gray-500 text-sm max-w-sm mx-auto">
        Our AI is analyzing your preferences to create a personalized profile...
      </p>

      {/* Animated dots */}
      <div className="flex justify-center gap-1 mt-4">
        <span className="w-2 h-2 bg-[#006AFF] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-[#006AFF] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-[#006AFF] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </Card>
  )
}
