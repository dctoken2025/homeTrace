'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'

interface RealtorOnboardingProps {
  userName: string
  onComplete: () => void
}

const steps = [
  {
    id: 'welcome',
    title: 'Welcome to HomeTrace!',
    description: "HomeTrace helps you provide a better experience for your clients. Let's see how it works.",
    icon: '👋',
  },
  {
    id: 'invite',
    title: 'Invite Your Clients',
    description: 'Send email invitations or share a link. Once they sign up, you\'ll be connected automatically.',
    icon: '✉️',
  },
  {
    id: 'houses',
    title: 'Add Houses for Clients',
    description: 'Search for properties and add them to your clients\' lists. They\'ll see all the properties you recommend.',
    icon: '🏘️',
  },
  {
    id: 'schedule',
    title: 'Manage Visit Schedules',
    description: 'View all scheduled visits across your clients. Plan efficient routes for showing days.',
    icon: '📅',
  },
  {
    id: 'insights',
    title: 'Access Client Insights',
    description: 'With permission, view your clients\' preferences and AI reports to better understand their needs.',
    icon: '📈',
  },
]

export default function RealtorOnboarding({ userName, onComplete }: RealtorOnboardingProps) {
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
