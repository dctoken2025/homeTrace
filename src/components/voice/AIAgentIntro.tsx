'use client'

import { useState, useEffect } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

interface AIAgentIntroProps {
  onStart: () => void
  userName?: string
}

const AGENT_FEATURES = [
  {
    icon: '🎤',
    title: 'Speak Naturally',
    description: 'Just talk about your dream home as if you were telling a friend',
  },
  {
    icon: '🧠',
    title: 'Smart Understanding',
    description: "I'll understand your preferences even from casual conversation",
  },
  {
    icon: '✨',
    title: 'Perfect Profile',
    description: "I'll create a detailed buyer profile to help find your ideal home",
  },
]

const EXAMPLE_PROMPTS = [
  'The size of the home and number of bedrooms',
  'Your preferred location or neighborhood',
  'Must-have features like a pool or home office',
  'Your budget range',
  'Special requirements for your family or lifestyle',
]

export default function AIAgentIntro({ onStart, userName }: AIAgentIntroProps) {
  const [isTyping, setIsTyping] = useState(true)
  const [displayedText, setDisplayedText] = useState('')

  const greeting = userName
    ? `Hi ${userName}! I'm Luna, your AI home advisor.`
    : "Hi! I'm Luna, your AI home advisor."

  const fullText = `${greeting} I'm here to help you find your dream home by understanding exactly what you're looking for. Instead of filling out forms, just tell me about your ideal home in your own words.`

  // Typing animation effect
  useEffect(() => {
    if (displayedText.length < fullText.length) {
      const timer = setTimeout(() => {
        setDisplayedText(fullText.slice(0, displayedText.length + 1))
      }, 20)
      return () => clearTimeout(timer)
    } else {
      setIsTyping(false)
    }
  }, [displayedText, fullText])

  return (
    <div className="max-w-2xl mx-auto">
      {/* Agent Avatar and Greeting */}
      <div className="text-center mb-8">
        {/* Animated Avatar */}
        <div className="relative inline-block mb-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#006AFF] to-[#0052CC] flex items-center justify-center shadow-lg">
            <div className="text-4xl">🏠</div>
          </div>
          {/* Pulse animation */}
          <div className="absolute inset-0 rounded-full bg-[#006AFF] animate-ping opacity-20" />
          {/* Online indicator */}
          <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white" />
        </div>

        {/* Typing Message */}
        <div className="bg-gray-50 rounded-2xl p-6 relative">
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-gray-50 rotate-45" />
          <p className="text-lg text-gray-700 leading-relaxed">
            {displayedText}
            {isTyping && <span className="animate-pulse">|</span>}
          </p>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {AGENT_FEATURES.map((feature, index) => (
          <Card
            key={index}
            className="text-center hover:shadow-md transition-shadow"
            padding="md"
          >
            <span className="text-3xl mb-2 block">{feature.icon}</span>
            <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
            <p className="text-sm text-gray-500">{feature.description}</p>
          </Card>
        ))}
      </div>

      {/* What to talk about */}
      <Card className="mb-8">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-xl">💡</span>
          What to Talk About
        </h3>
        <ul className="space-y-2">
          {EXAMPLE_PROMPTS.map((prompt, index) => (
            <li key={index} className="flex items-start gap-3 text-gray-600">
              <svg
                className="w-5 h-5 text-[#006AFF] flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>{prompt}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Start Button */}
      <div className="text-center">
        <Button
          size="lg"
          onClick={onStart}
          disabled={isTyping}
          className="px-12"
          leftIcon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          }
        >
          Start Recording
        </Button>
        <p className="text-sm text-gray-500 mt-3">
          You can record for up to 5 minutes
        </p>
      </div>
    </div>
  )
}
