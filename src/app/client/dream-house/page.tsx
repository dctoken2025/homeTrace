'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import AIAgentIntro from '@/components/voice/AIAgentIntro'
import VoiceRecordingScreen from '@/components/voice/VoiceRecordingScreen'
import VoiceProcessingScreen, { AnalysisResult } from '@/components/voice/VoiceProcessingScreen'
import ProfileSummaryCard from '@/components/voice/ProfileSummaryCard'
import BuyerPersonaCard, { PersonaGeneratingAnimation } from '@/components/dream-house/BuyerPersonaCard'
import RefinementChat from '@/components/dream-house/RefinementChat'
import { DreamHouseProfileData, BuyerPersona } from '@/lib/types/dream-house'

type ViewMode =
  | 'loading'
  | 'intro'
  | 'recording'
  | 'processing'
  | 'summary'
  | 'persona'
  | 'refine'

export default function DreamHousePage() {
  const router = useRouter()
  const { success, error: showError } = useToast()

  const [viewMode, setViewMode] = useState<ViewMode>('loading')
  const [profile, setProfile] = useState<DreamHouseProfileData | null>(null)
  const [persona, setPersona] = useState<BuyerPersona | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [transcription, setTranscription] = useState<string>('')
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [processingError, setProcessingError] = useState<string | null>(null)

  // Check for existing profile on mount
  useEffect(() => {
    checkExistingProfile()
  }, [])

  const checkExistingProfile = async () => {
    try {
      const response = await fetch('/api/dream-house-profile', {
        credentials: 'include',
      })
      const data = await response.json()

      if (response.ok && data.data) {
        const profileData = data.data.profile as DreamHouseProfileData
        const isComplete = data.data.isComplete

        if (profileData && isComplete && profileData.buyerPersona) {
          setProfile(profileData)
          setPersona(profileData.buyerPersona as BuyerPersona)
          setViewMode('persona')
          return
        }
      }

      // No existing complete profile, show intro
      setViewMode('intro')
    } catch (err) {
      console.error('Failed to fetch profile:', err)
      setViewMode('intro')
    }
  }

  // Handle starting the voice recording
  const handleStartRecording = () => {
    setViewMode('recording')
  }

  // Handle recording complete - now receives transcription directly
  const handleRecordingComplete = (text: string, duration: number) => {
    console.log('[DreamHousePage] Recording complete:', {
      textLength: text?.length || 0,
      duration,
      preview: text?.substring(0, 100) || '(empty)',
    })

    if (!text || text.trim().length === 0) {
      showError(
        'No speech detected',
        'We couldn\'t detect any speech. Please try again and speak clearly into your microphone.'
      )
      return
    }

    if (text.trim().length < 20) {
      showError(
        'Recording too short',
        `Please describe your dream home in more detail. (${text.trim().length}/20 characters minimum)`
      )
      return
    }

    setTranscription(text)
    setRecordingDuration(duration)
    setViewMode('processing')
    setProcessingError(null)
  }

  // Handle voice analysis complete
  const handleAnalysisComplete = (result: AnalysisResult) => {
    setAnalysisResult(result)
    setProfile(result.profile as unknown as DreamHouseProfileData)
    setPersona(result.persona)
    setViewMode('summary')
  }

  // Handle processing error
  const handleProcessingError = (error: string) => {
    setProcessingError(error)
    showError('Processing failed', error)
    setViewMode('recording')
  }

  // Handle confirming the profile
  const handleConfirmProfile = () => {
    setViewMode('persona')
    success('Profile saved!', 'Your dream house profile has been created.')
  }

  // Handle starting refinement chat
  const handleStartRefine = () => {
    setViewMode('refine')
  }

  // Handle persona update from refinement chat
  const handlePersonaUpdate = (updatedPersona: BuyerPersona) => {
    setPersona(updatedPersona)
    success('Profile updated', 'Your preferences have been refined.')
  }

  // Handle recording again
  const handleRecordAgain = async () => {
    // Optionally delete the existing profile
    try {
      await fetch('/api/dream-house-profile', {
        method: 'DELETE',
        credentials: 'include',
      })
    } catch (err) {
      console.error('Failed to delete profile:', err)
    }

    setTranscription('')
    setRecordingDuration(0)
    setAnalysisResult(null)
    setProfile(null)
    setPersona(null)
    setViewMode('intro')
  }

  // Handle reset from persona view
  const handleReset = async () => {
    if (!confirm('Are you sure you want to start over? All your preferences will be deleted.')) {
      return
    }

    try {
      await fetch('/api/dream-house-profile', {
        method: 'DELETE',
        credentials: 'include',
      })

      setProfile(null)
      setPersona(null)
      setAnalysisResult(null)
      setViewMode('intro')
      success('Profile reset', 'You can start again.')
    } catch (err) {
      showError('Error resetting profile')
    }
  }

  // Loading state
  if (viewMode === 'loading') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
          <div className="h-[600px] bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header - shown on most views */}
      {viewMode !== 'intro' && viewMode !== 'processing' && (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dream House Profile</h1>
            <p className="text-gray-600">
              {viewMode === 'recording' && 'Tell us about your ideal home'}
              {viewMode === 'summary' && 'Review your profile'}
              {viewMode === 'persona' && 'Your personalized buyer profile'}
              {viewMode === 'refine' && 'Refine your preferences'}
            </p>
          </div>

          {viewMode === 'persona' && persona && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-red-600 hover:text-red-700"
              >
                Start Over
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Intro Screen - AI Agent Introduction */}
      {viewMode === 'intro' && (
        <div className="py-8">
          <AIAgentIntro onStart={handleStartRecording} />
        </div>
      )}

      {/* Recording Screen */}
      {viewMode === 'recording' && (
        <VoiceRecordingScreen
          onComplete={handleRecordingComplete}
          onCancel={() => setViewMode('intro')}
        />
      )}

      {/* Processing Screen */}
      {viewMode === 'processing' && transcription && (
        <VoiceProcessingScreen
          transcription={transcription}
          duration={recordingDuration}
          onComplete={handleAnalysisComplete}
          onError={handleProcessingError}
        />
      )}

      {/* Summary Screen - After processing */}
      {viewMode === 'summary' && analysisResult && (
        <ProfileSummaryCard
          result={analysisResult}
          onConfirm={handleConfirmProfile}
          onRefine={handleStartRefine}
          onRecordAgain={handleRecordAgain}
        />
      )}

      {/* Persona View - Final profile display */}
      {viewMode === 'persona' && (
        <div className="space-y-6">
          {persona ? (
            <>
              <BuyerPersonaCard
                persona={persona}
                onEdit={handleRecordAgain}
                onRefine={handleStartRefine}
              />

              {/* Quick stats */}
              {profile && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <QuickStat
                    label="Budget"
                    value={profile.budget?.max ? `Up to ${formatCurrency(profile.budget.max)}` : 'Flexible'}
                    icon="💰"
                  />
                  <QuickStat
                    label="Bedrooms"
                    value={profile.size?.bedroomsMin ? `${profile.size.bedroomsMin}+` : 'Any'}
                    icon="🛏️"
                  />
                  <QuickStat
                    label="Location"
                    value={profile.location?.cities?.[0] || 'Multiple'}
                    icon="📍"
                  />
                  <QuickStat
                    label="Timeline"
                    value={formatUrgency(profile.timeline?.urgency)}
                    icon="⏰"
                  />
                </div>
              )}

              {/* CTA to view houses */}
              <Card className="bg-gradient-to-r from-[#006AFF] to-[#0052CC] text-white">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-lg">Ready to find your dream home?</h3>
                    <p className="text-blue-100">
                      Browse houses that match your profile
                    </p>
                  </div>
                  <Button
                    onClick={() => router.push('/client/houses')}
                    className="bg-white text-[#006AFF] hover:bg-blue-50"
                  >
                    View Matching Houses
                  </Button>
                </div>
              </Card>
            </>
          ) : (
            <Card className="text-center py-12">
              <p className="text-gray-500 mb-4">Could not load your profile.</p>
              <Button onClick={() => setViewMode('intro')}>
                Start Again
              </Button>
            </Card>
          )}
        </div>
      )}

      {/* Refinement Chat */}
      {viewMode === 'refine' && profile && persona && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chat on the left */}
          <RefinementChat
            profile={profile}
            persona={persona}
            onPersonaUpdate={handlePersonaUpdate}
            onClose={() => setViewMode('persona')}
          />

          {/* Current persona on the right */}
          <div className="space-y-4">
            <BuyerPersonaCard
              persona={persona}
              isLoading={false}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Helper components
interface QuickStatProps {
  label: string
  value: string
  icon: string
}

function QuickStat({ label, value, icon }: QuickStatProps) {
  return (
    <Card className="text-center py-4">
      <span className="text-2xl mb-1 block">{icon}</span>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-semibold text-gray-900">{value}</p>
    </Card>
  )
}

// Formatting helpers
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatUrgency(urgency?: string): string {
  const labels: Record<string, string> = {
    asap: 'Immediate',
    '3_months': '3 months',
    '6_months': '6 months',
    '1_year': '1 year',
    flexible: 'Flexible',
  }
  return labels[urgency || ''] || 'Flexible'
}
