'use client'

import { ReactNode } from 'react'
import Button from '@/components/ui/Button'

interface WizardStepProps {
  title: string
  description?: string
  currentStep: number
  totalSteps: number
  children: ReactNode
  onNext?: () => void
  onPrevious?: () => void
  onComplete?: () => void
  isFirstStep?: boolean
  isLastStep?: boolean
  isValid?: boolean
  isLoading?: boolean
  nextLabel?: string
  previousLabel?: string
  completeLabel?: string
  showSkip?: boolean
  onSkip?: () => void
  className?: string
}

export default function WizardStep({
  title,
  description,
  currentStep,
  totalSteps,
  children,
  onNext,
  onPrevious,
  onComplete,
  isFirstStep = false,
  isLastStep = false,
  isValid = true,
  isLoading = false,
  nextLabel = 'Next',
  previousLabel = 'Previous',
  completeLabel = 'Complete',
  showSkip = false,
  onSkip,
  className = '',
}: WizardStepProps) {
  const progress = ((currentStep) / totalSteps) * 100

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-600">
            Step {currentStep} of {totalSteps}
          </span>
          <span className="text-sm text-gray-500">{Math.round(progress)}% complete</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#006AFF] rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        {description && <p className="mt-1 text-gray-600">{description}</p>}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto">{children}</div>

      {/* Navigation buttons */}
      <div className="flex justify-between items-center mt-6 pt-4 border-t">
        <div>
          {!isFirstStep && (
            <Button variant="outline" onClick={onPrevious} disabled={isLoading}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {previousLabel}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {showSkip && !isLastStep && (
            <Button variant="ghost" onClick={onSkip} disabled={isLoading}>
              Skip
            </Button>
          )}

          {isLastStep ? (
            <Button
              onClick={onComplete}
              disabled={!isValid || isLoading}
              isLoading={isLoading}
            >
              {completeLabel}
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </Button>
          ) : (
            <Button onClick={onNext} disabled={!isValid || isLoading}>
              {nextLabel}
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// Step indicator for sidebar/overview
interface StepIndicatorProps {
  steps: { id: number; title: string; description: string }[]
  currentStep: number
  completedSteps: number[]
  onStepClick?: (step: number) => void
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export function StepIndicator({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  orientation = 'horizontal',
  className = '',
}: StepIndicatorProps) {
  const isCompleted = (stepId: number) => completedSteps.includes(stepId)
  const isCurrent = (stepId: number) => stepId === currentStep
  const isClickable = (stepId: number) => isCompleted(stepId) || stepId <= Math.max(...completedSteps, currentStep)

  if (orientation === 'vertical') {
    return (
      <div className={`space-y-4 ${className}`}>
        {steps.map((step, index) => (
          <button
            key={step.id}
            onClick={() => isClickable(step.id) && onStepClick?.(step.id)}
            disabled={!isClickable(step.id)}
            className={`
              w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all
              ${isCurrent(step.id) ? 'bg-[#E3F2FD]' : 'hover:bg-gray-50'}
              ${!isClickable(step.id) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div
              className={`
                w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                ${isCompleted(step.id) ? 'bg-green-500 text-white' : ''}
                ${isCurrent(step.id) && !isCompleted(step.id) ? 'bg-[#006AFF] text-white' : ''}
                ${!isCurrent(step.id) && !isCompleted(step.id) ? 'bg-gray-200 text-gray-600' : ''}
              `}
            >
              {isCompleted(step.id) ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step.id
              )}
            </div>
            <div>
              <p className={`font-medium ${isCurrent(step.id) ? 'text-[#006AFF]' : 'text-gray-900'}`}>
                {step.title}
              </p>
              <p className="text-sm text-gray-500">{step.description}</p>
            </div>
          </button>
        ))}
      </div>
    )
  }

  // Horizontal orientation
  return (
    <div className={`flex items-center ${className}`}>
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <button
            onClick={() => isClickable(step.id) && onStepClick?.(step.id)}
            disabled={!isClickable(step.id)}
            className={`
              flex flex-col items-center
              ${!isClickable(step.id) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div
              className={`
                w-10 h-10 rounded-full flex items-center justify-center mb-2
                ${isCompleted(step.id) ? 'bg-green-500 text-white' : ''}
                ${isCurrent(step.id) && !isCompleted(step.id) ? 'bg-[#006AFF] text-white' : ''}
                ${!isCurrent(step.id) && !isCompleted(step.id) ? 'bg-gray-200 text-gray-600' : ''}
              `}
            >
              {isCompleted(step.id) ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step.id
              )}
            </div>
            <span
              className={`text-xs font-medium ${isCurrent(step.id) ? 'text-[#006AFF]' : 'text-gray-600'}`}
            >
              {step.title}
            </span>
          </button>

          {/* Connector line */}
          {index < steps.length - 1 && (
            <div
              className={`
                w-12 h-0.5 mx-2
                ${isCompleted(step.id) ? 'bg-green-500' : 'bg-gray-200'}
              `}
            />
          )}
        </div>
      ))}
    </div>
  )
}
