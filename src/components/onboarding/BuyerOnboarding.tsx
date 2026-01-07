'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'

interface BuyerOnboardingProps {
  userName: string
  onComplete: () => void
}

const steps = [
  {
    id: 'welcome',
    title: 'Welcome to HomeTrace!',
    description: "We're excited to help you find your perfect home. Let's get you set up in just a few steps.",
    icon: '🏠',
  },
  {
    id: 'houses',
    title: 'Add Houses to Your List',
    description: 'Search for properties by address or Zillow link. You can add as many houses as you like to compare.',
    icon: '🔍',
  },
  {
    id: 'visits',
    title: 'Schedule & Record Visits',
    description: 'When you visit a house, record your thoughts room by room. Your voice recordings help you remember details later.',
    icon: '🎙️',
  },
  {
    id: 'dream',
    title: 'Define Your Dream Home',
    description: 'Chat with our AI to describe your ideal home. We\'ll use this to score how well each house matches your preferences.',
    icon: '✨',
  },
  {
    id: 'report',
    title: 'Get AI-Powered Insights',
    description: 'Once you\'ve visited houses, generate a personalized report with recommendations based on your recordings.',
    icon: '📊',
  },
]

export default function BuyerOnboarding({ userName, onComplete }: BuyerOnboardingProps) {
  const router = useRouter()
  const { success } = useToast()
  const [currentStep, setCurrentStep] = useState(0)
  const [isCompleting, setIsCompleting] = useState(false)

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    setIsCompleting(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hasCompletedOnboarding: true }),
      })

      if (!response.ok) {
        throw new Error('Failed to complete onboarding')
      }

      success('Welcome aboard! Your account is ready.')
      onComplete()
    } catch (error) {
      console.error('Onboarding error:', error)
    } finally {
      setIsCompleting(false)
    }
  }

  const step = steps[currentStep]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex gap-1 mb-6">
          {steps.map((_, index) => (
            <div
              key={index}
              className="flex-1 h-1 rounded-full transition-colors"
              style={{ background: index <= currentStep ? '#006AFF' : '#E5E7EB' }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="text-center py-6">
          <span className="text-6xl mb-4 block">{step.icon}</span>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {currentStep === 0 ? `${step.title.replace('!', `, ${userName.split(' ')[0]}!`)}` : step.title}
          </h2>
          <p className="text-gray-600">{step.description}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          {currentStep > 0 && (
            <Button variant="outline" onClick={handlePrevious} className="flex-1">
              Back
            </Button>
          )}
          {currentStep < steps.length - 1 ? (
            <Button onClick={handleNext} className="flex-1">
              Next
            </Button>
          ) : (
            <Button onClick={handleComplete} isLoading={isCompleting} className="flex-1">
              Get Started
            </Button>
          )}
        </div>

        {/* Skip */}
        {currentStep < steps.length - 1 && (
          <button
            onClick={handleComplete}
            className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700"
          >
            Skip intro
          </button>
        )}
      </Card>
    </div>
  )
}
