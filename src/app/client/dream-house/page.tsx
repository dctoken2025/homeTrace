'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ProfileData {
  location?: {
    preferredAreas?: string[]
    proximityTo?: string[]
    urbanVsSuburban?: string
  }
  budget?: {
    min?: number | null
    max?: number | null
    flexibility?: string
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
    agePreference?: string
    renovationWillingness?: string
  }
  timeline?: {
    urgency?: string
  }
  summary?: string
}

export default function DreamHousePage() {
  const router = useRouter()
  const { success, error: showError } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [showProfile, setShowProfile] = useState(false)

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Fetch chat history
  useEffect(() => {
    async function fetchChat() {
      try {
        const response = await fetch('/api/dream-house-profile/chat')
        const data = await response.json()

        if (response.ok) {
          setMessages(data.data.chatHistory || [])
          setIsComplete(data.data.isComplete)
        } else {
          throw new Error(data.error?.message || 'Failed to load chat')
        }
      } catch (err) {
        showError('Error', err instanceof Error ? err.message : 'Failed to load chat')
      } finally {
        setLoading(false)
      }
    }

    fetchChat()
  }, [showError])

  // Scroll when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Fetch profile data
  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/dream-house-profile')
      const data = await response.json()

      if (response.ok && data.data.profile) {
        setProfile(data.data.profile)
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err)
    }
  }

  // Send message
  const handleSend = async () => {
    if (!input.trim() || sending) return

    const userMessage = input.trim()
    setInput('')
    setSending(true)

    // Optimistically add user message
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])

    try {
      const response = await fetch('/api/dream-house-profile/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to send message')
      }

      // Add assistant response
      setMessages((prev) => [...prev, data.data.assistantMessage])
    } catch (err) {
      showError('Error', err instanceof Error ? err.message : 'Failed to send message')
      // Remove optimistic message on error
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Complete profile
  const handleComplete = async () => {
    if (messages.length < 6) {
      showError('More Info Needed', 'Please continue the conversation to provide more details about your preferences.')
      return
    }

    setCompleting(true)

    try {
      const response = await fetch('/api/dream-house-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markComplete: true }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to complete profile')
      }

      setIsComplete(true)
      setProfile(data.data.profile)
      success('Profile Complete!', 'Your dream house preferences have been saved.')
    } catch (err) {
      showError('Error', err instanceof Error ? err.message : 'Failed to complete profile')
    } finally {
      setCompleting(false)
    }
  }

  // Start new chat
  const handleNewChat = async () => {
    try {
      const response = await fetch('/api/dream-house-profile/chat', {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to start new chat')
      }

      setMessages(data.data.chatHistory || [])
      setIsComplete(false)
      success('New Chat Started', 'Let\'s refine your preferences!')
    } catch (err) {
      showError('Error', err instanceof Error ? err.message : 'Failed to start new chat')
    }
  }

  // Reset profile
  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset your dream house profile? This will clear all your preferences.')) {
      return
    }

    try {
      const response = await fetch('/api/dream-house-profile', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || 'Failed to reset profile')
      }

      // Reload the page to start fresh
      window.location.reload()
    } catch (err) {
      showError('Error', err instanceof Error ? err.message : 'Failed to reset profile')
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-96 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dream House Profile</h1>
          <p className="text-gray-600">
            {isComplete
              ? 'Your preferences have been saved. Start a new chat to update them.'
              : 'Chat with our AI to define your ideal home preferences.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isComplete && profile && (
            <Button
              variant="outline"
              onClick={() => {
                setShowProfile(!showProfile)
                if (!showProfile) fetchProfile()
              }}
            >
              {showProfile ? 'Hide Profile' : 'View Profile'}
            </Button>
          )}
          {isComplete && (
            <Button variant="outline" onClick={handleNewChat}>
              New Chat
            </Button>
          )}
        </div>
      </div>

      {/* Profile Summary */}
      {showProfile && profile && (
        <Card className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Your Preferences</h2>

          {profile.summary && (
            <p className="text-gray-700 mb-4 italic">"{profile.summary}"</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {profile.location && (
              <div>
                <h3 className="font-medium text-gray-900">Location</h3>
                {profile.location.preferredAreas && profile.location.preferredAreas.length > 0 && (
                  <p className="text-gray-600">Areas: {profile.location.preferredAreas.join(', ')}</p>
                )}
                {profile.location.urbanVsSuburban && (
                  <p className="text-gray-600">Type: {profile.location.urbanVsSuburban}</p>
                )}
              </div>
            )}

            {profile.budget && (
              <div>
                <h3 className="font-medium text-gray-900">Budget</h3>
                {(profile.budget.min || profile.budget.max) && (
                  <p className="text-gray-600">
                    {profile.budget.min ? `$${profile.budget.min.toLocaleString()}` : 'Any'} -{' '}
                    {profile.budget.max ? `$${profile.budget.max.toLocaleString()}` : 'Any'}
                  </p>
                )}
                {profile.budget.flexibility && (
                  <p className="text-gray-600">Flexibility: {profile.budget.flexibility}</p>
                )}
              </div>
            )}

            {profile.size && (
              <div>
                <h3 className="font-medium text-gray-900">Size</h3>
                {profile.size.minBedrooms && (
                  <p className="text-gray-600">Bedrooms: {profile.size.minBedrooms}+</p>
                )}
                {profile.size.minBathrooms && (
                  <p className="text-gray-600">Bathrooms: {profile.size.minBathrooms}+</p>
                )}
                {profile.size.minSqft && (
                  <p className="text-gray-600">Min sqft: {profile.size.minSqft.toLocaleString()}</p>
                )}
              </div>
            )}

            {profile.features && (
              <div>
                <h3 className="font-medium text-gray-900">Features</h3>
                {profile.features.mustHave && profile.features.mustHave.length > 0 && (
                  <p className="text-gray-600">Must-have: {profile.features.mustHave.join(', ')}</p>
                )}
                {profile.features.dealBreakers && profile.features.dealBreakers.length > 0 && (
                  <p className="text-red-600">Deal-breakers: {profile.features.dealBreakers.join(', ')}</p>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t">
            <Button variant="ghost" size="sm" onClick={handleReset} className="text-red-600">
              Reset Profile
            </Button>
          </div>
        </Card>
      )}

      {/* Chat Container */}
      <Card className="h-[500px] flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className="max-w-[80%] rounded-lg px-4 py-2"
                style={message.role === 'user' ? { background: '#006AFF', color: 'white' } : { background: '#F3F4F6', color: '#111827' }}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-2">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': '#006AFF' } as React.CSSProperties}
              rows={2}
              disabled={sending}
            />
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="h-full"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </Button>
            </div>
          </div>

          {!isComplete && messages.length >= 6 && (
            <div className="mt-3 flex justify-center">
              <Button
                variant="primary"
                onClick={handleComplete}
                isLoading={completing}
              >
                Complete Profile
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Tips */}
      {!isComplete && (
        <div className="mt-6 rounded-lg p-4" style={{ background: '#E3F2FD' }}>
          <h3 className="font-medium mb-2" style={{ color: '#0D47A1' }}>Tips for best results:</h3>
          <ul className="text-sm space-y-1" style={{ color: '#1565C0' }}>
            <li>• Be specific about your location preferences</li>
            <li>• Mention your budget range and flexibility</li>
            <li>• Describe must-have features (garage, yard, etc.)</li>
            <li>• Share any deal-breakers</li>
            <li>• Mention your timeline for buying</li>
          </ul>
        </div>
      )}
    </div>
  )
}
