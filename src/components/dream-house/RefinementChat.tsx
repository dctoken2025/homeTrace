'use client'

import { useState, useRef, useEffect } from 'react'
import Card from '@/components/ui/Card'
import { ChatMessage as ChatMessageType } from '@/lib/ai'
import { BuyerPersona, DreamHouseProfileData } from '@/lib/types/dream-house'

interface RefinementChatProps {
  profile: DreamHouseProfileData
  persona: BuyerPersona
  initialMessages?: ChatMessageType[]
  onPersonaUpdate?: (persona: BuyerPersona) => void
  onClose?: () => void
}

export default function RefinementChat({
  profile,
  persona,
  initialMessages = [],
  onPersonaUpdate,
  onClose,
}: RefinementChatProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(initialMessages.length === 0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Get initial refinement questions
  useEffect(() => {
    if (isInitializing) {
      fetchInitialQuestions()
    }
  }, [])

  const fetchInitialQuestions = async () => {
    try {
      const response = await fetch('/api/dream-house-profile/refinement-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          profile,
          persona,
          messages: [],
          isInitial: true,
        }),
      })

      const data = await response.json()
      if (data.success && data.data?.message) {
        setMessages([{ role: 'assistant', content: data.data.message }])
      }
    } catch (error) {
      console.error('Failed to get initial questions:', error)
      setMessages([{
        role: 'assistant',
        content: 'Hi! I\'ve analyzed your profile and would like to ask some questions to refine it. What is more important to you: proximity to work or quality of life in the neighborhood?'
      }])
    } finally {
      setIsInitializing(false)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessageType = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/dream-house-profile/refinement-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          profile,
          persona,
          messages: newMessages,
          newInfo: input.trim(),
        }),
      })

      const data = await response.json()

      if (data.success) {
        if (data.data?.message) {
          setMessages([...newMessages, { role: 'assistant', content: data.data.message }])
        }
        if (data.data?.updatedPersona && onPersonaUpdate) {
          onPersonaUpdate(data.data.updatedPersona)
        }
      } else {
        throw new Error(data.error?.message || 'Error processing message')
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'Sorry, an error occurred. Can you try again?' }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Card className="flex flex-col h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#006AFF] to-[#0D47A1] rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Refine Profile</h3>
            <p className="text-xs text-gray-500">Chat to detail your preferences</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {isInitializing ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-[#006AFF] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Analyzing your profile...</p>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-gray-500">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-xs">Thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="pt-4 border-t">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your response..."
            disabled={isLoading || isInitializing}
            rows={1}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#006AFF] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || isInitializing}
            className="px-4 py-2.5 bg-[#006AFF] text-white rounded-lg hover:bg-[#0D47A1] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </Card>
  )
}

// Single chat message component
interface ChatMessageProps {
  message: ChatMessageType
}

function ChatMessage({ message }: ChatMessageProps) {
  const isAssistant = message.role === 'assistant'

  return (
    <div className={`flex gap-3 ${isAssistant ? '' : 'flex-row-reverse'}`}>
      {/* Avatar */}
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
        ${isAssistant ? 'bg-[#006AFF]' : 'bg-gray-200'}
      `}>
        {isAssistant ? (
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )}
      </div>

      {/* Message bubble */}
      <div className={`
        max-w-[80%] px-4 py-3 rounded-2xl
        ${isAssistant
          ? 'bg-gray-100 text-gray-800 rounded-tl-none'
          : 'bg-[#006AFF] text-white rounded-tr-none'
        }
      `}>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  )
}

// Quick suggestions for common refinements
interface QuickSuggestionsProps {
  onSelect: (suggestion: string) => void
}

export function QuickSuggestions({ onSelect }: QuickSuggestionsProps) {
  const suggestions = [
    'I need more space for a home office',
    'I want a bigger kitchen',
    'Security is very important',
    'I am open to properties that need renovation',
    'I prefer a gated community',
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSelect(suggestion)}
          className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
        >
          {suggestion}
        </button>
      ))}
    </div>
  )
}

// Mini chat widget for dashboard
interface MiniRefinementChatProps {
  onExpand: () => void
  lastMessage?: string
}

export function MiniRefinementChat({ onExpand, lastMessage }: MiniRefinementChatProps) {
  return (
    <button
      onClick={onExpand}
      className="w-full p-4 bg-white border border-gray-200 rounded-lg hover:border-[#006AFF] hover:shadow-sm transition-all text-left"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 bg-[#006AFF] rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 text-sm">Refine Profile</h4>
          <p className="text-xs text-gray-500">Click to continue</p>
        </div>
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
      {lastMessage && (
        <p className="text-xs text-gray-500 line-clamp-2 pl-11">
          {lastMessage}
        </p>
      )}
    </button>
  )
}
