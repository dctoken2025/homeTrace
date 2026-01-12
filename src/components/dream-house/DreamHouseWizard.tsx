'use client'

import { useState, useCallback, useEffect } from 'react'
import Card from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import WizardStep, { StepIndicator } from './WizardStep'
import LocationStep from './steps/LocationStep'
import BudgetStep from './steps/BudgetStep'
import SizeStep from './steps/SizeStep'
import FeaturesStep from './steps/FeaturesStep'
import StyleStep from './steps/StyleStep'
import LifestyleStep from './steps/LifestyleStep'
import {
  DreamHouseProfileData,
  DEFAULT_PROFILE,
  WIZARD_STEPS,
  validateLocationStep,
  validateBudgetStep,
  validateSizeStep,
  BuyerPersona,
} from '@/lib/types/dream-house'

interface DreamHouseWizardProps {
  initialData?: Partial<DreamHouseProfileData>
  onComplete: (profile: DreamHouseProfileData, persona: BuyerPersona) => void
  onSaveProgress?: (profile: DreamHouseProfileData) => void
  isGenerating?: boolean
}

export default function DreamHouseWizard({
  initialData,
  onComplete,
  onSaveProgress,
  isGenerating = false,
}: DreamHouseWizardProps) {
  const { error: showError } = useToast()

  // Merge initial data with defaults
  const [profile, setProfile] = useState<DreamHouseProfileData>(() => ({
    ...DEFAULT_PROFILE,
    ...initialData,
    location: { ...DEFAULT_PROFILE.location, ...initialData?.location },
    budget: { ...DEFAULT_PROFILE.budget, ...initialData?.budget },
    size: { ...DEFAULT_PROFILE.size, ...initialData?.size },
    features: { ...DEFAULT_PROFILE.features, ...initialData?.features },
    style: { ...DEFAULT_PROFILE.style, ...initialData?.style },
    lifestyle: { ...DEFAULT_PROFILE.lifestyle, ...initialData?.lifestyle },
    timeline: { ...DEFAULT_PROFILE.timeline, ...initialData?.timeline },
  }))

  const [currentStep, setCurrentStep] = useState(1)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Get completed steps from profile
  const completedSteps = profile.completedSteps

  // Validate current step
  const validateStep = useCallback((step: number): boolean => {
    let stepErrors: Record<string, string> = {}

    switch (step) {
      case 1:
        stepErrors = validateLocationStep(profile.location)
        break
      case 2:
        stepErrors = validateBudgetStep(profile.budget)
        break
      case 3:
        stepErrors = validateSizeStep(profile.size)
        break
      // Steps 4, 5, 6 don't have required fields
    }

    setErrors(stepErrors)
    return Object.keys(stepErrors).length === 0
  }, [profile])

  // Handle step data change
  const handleLocationChange = useCallback((location: typeof profile.location) => {
    setProfile((prev) => ({ ...prev, location }))
    setErrors({})
  }, [])

  const handleBudgetChange = useCallback((budget: typeof profile.budget) => {
    setProfile((prev) => ({ ...prev, budget }))
    setErrors({})
  }, [])

  const handleSizeChange = useCallback((size: typeof profile.size) => {
    setProfile((prev) => ({ ...prev, size }))
    setErrors({})
  }, [])

  const handleFeaturesChange = useCallback((features: typeof profile.features) => {
    setProfile((prev) => ({ ...prev, features }))
  }, [])

  const handleStyleChange = useCallback((style: typeof profile.style) => {
    setProfile((prev) => ({ ...prev, style }))
  }, [])

  const handleLifestyleChange = useCallback((data: typeof profile.lifestyle & typeof profile.timeline) => {
    const { urgency, ...lifestyle } = data
    setProfile((prev) => ({
      ...prev,
      lifestyle,
      timeline: { urgency },
    }))
  }, [])

  // Navigate to next step
  const handleNext = useCallback(() => {
    if (!validateStep(currentStep)) {
      showError('Please fill in the required fields')
      return
    }

    // Mark step as completed
    const newCompletedSteps = completedSteps.includes(currentStep)
      ? completedSteps
      : [...completedSteps, currentStep]

    const updatedProfile = {
      ...profile,
      completedSteps: newCompletedSteps,
    }

    setProfile(updatedProfile)
    onSaveProgress?.(updatedProfile)

    if (currentStep < WIZARD_STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }, [currentStep, validateStep, completedSteps, profile, onSaveProgress, showError])

  // Navigate to previous step
  const handlePrevious = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setErrors({})
    }
  }, [currentStep])

  // Skip current step
  const handleSkip = useCallback(() => {
    if (currentStep < WIZARD_STEPS.length) {
      setCurrentStep(currentStep + 1)
      setErrors({})
    }
  }, [currentStep])

  // Complete wizard
  const handleComplete = useCallback(async () => {
    if (!validateStep(currentStep)) {
      showError('Please fill in the required fields')
      return
    }

    // Mark last step as completed
    const finalCompletedSteps = completedSteps.includes(currentStep)
      ? completedSteps
      : [...completedSteps, currentStep]

    const finalProfile: DreamHouseProfileData = {
      ...profile,
      completedSteps: finalCompletedSteps,
      isWizardComplete: true,
      completedAt: new Date(),
    }

    // Generate buyer persona via API
    try {
      const response = await fetch('/api/dream-house-profile/generate-persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: finalProfile }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to generate profile')
      }

      onComplete(finalProfile, data.data.persona)
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error generating your profile')
    }
  }, [currentStep, validateStep, completedSteps, profile, onComplete, showError])

  // Navigate to specific step
  const handleStepClick = useCallback((step: number) => {
    // Can only go to completed steps or current
    if (completedSteps.includes(step) || step <= currentStep) {
      setCurrentStep(step)
      setErrors({})
    }
  }, [completedSteps, currentStep])

  // Get current step config
  const stepConfig = WIZARD_STEPS[currentStep - 1]

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <LocationStep
            data={profile.location}
            onChange={handleLocationChange}
            errors={errors}
          />
        )
      case 2:
        return (
          <BudgetStep
            data={profile.budget}
            onChange={handleBudgetChange}
            errors={errors}
          />
        )
      case 3:
        return (
          <SizeStep
            data={profile.size}
            onChange={handleSizeChange}
            errors={errors}
          />
        )
      case 4:
        return (
          <FeaturesStep
            data={profile.features}
            onChange={handleFeaturesChange}
          />
        )
      case 5:
        return (
          <StyleStep
            data={profile.style}
            onChange={handleStyleChange}
          />
        )
      case 6:
        return (
          <LifestyleStep
            data={{ ...profile.lifestyle, ...profile.timeline }}
            onChange={handleLifestyleChange}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Sidebar with step indicator (desktop) */}
      <div className="hidden lg:block w-64 flex-shrink-0">
        <Card className="sticky top-6">
          <h3 className="font-semibold text-gray-900 mb-4">Your Progress</h3>
          <StepIndicator
            steps={WIZARD_STEPS}
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={handleStepClick}
            orientation="vertical"
          />
        </Card>
      </div>

      {/* Main wizard content */}
      <div className="flex-1">
        {/* Mobile step indicator */}
        <div className="lg:hidden mb-4 overflow-x-auto pb-2">
          <StepIndicator
            steps={WIZARD_STEPS}
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={handleStepClick}
            orientation="horizontal"
          />
        </div>

        <Card className="min-h-[600px]">
          <WizardStep
            title={stepConfig.title}
            description={stepConfig.description}
            currentStep={currentStep}
            totalSteps={WIZARD_STEPS.length}
            isFirstStep={currentStep === 1}
            isLastStep={currentStep === WIZARD_STEPS.length}
            isValid={Object.keys(errors).length === 0}
            isLoading={isGenerating}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onComplete={handleComplete}
            showSkip={currentStep >= 4}
            onSkip={handleSkip}
            completeLabel="Generate My Profile"
          >
            {renderStepContent()}
          </WizardStep>
        </Card>
      </div>
    </div>
  )
}

// Compact wizard for editing existing profile
interface EditWizardProps {
  profile: DreamHouseProfileData
  onSave: (profile: DreamHouseProfileData) => void
  onCancel: () => void
  step?: number
}

export function EditWizard({ profile, onSave, onCancel, step = 1 }: EditWizardProps) {
  const [editedProfile, setEditedProfile] = useState(profile)
  const [currentStep, setCurrentStep] = useState(step)

  const handleSave = () => {
    onSave(editedProfile)
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Edit Preferences</h3>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-[#006AFF] text-white rounded-lg hover:bg-[#0D47A1]"
          >
            Save
          </button>
        </div>
      </div>

      {/* Step tabs */}
      <div className="flex gap-1 mb-4 p-1 bg-gray-100 rounded-lg overflow-x-auto">
        {WIZARD_STEPS.map((s) => (
          <button
            key={s.id}
            onClick={() => setCurrentStep(s.id)}
            className={`
              px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-all
              ${currentStep === s.id
                ? 'bg-white text-[#006AFF] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
              }
            `}
          >
            {s.title}
          </button>
        ))}
      </div>

      {/* Step content */}
      <div className="min-h-[400px]">
        {currentStep === 1 && (
          <LocationStep
            data={editedProfile.location}
            onChange={(location) => setEditedProfile((p) => ({ ...p, location }))}
          />
        )}
        {currentStep === 2 && (
          <BudgetStep
            data={editedProfile.budget}
            onChange={(budget) => setEditedProfile((p) => ({ ...p, budget }))}
          />
        )}
        {currentStep === 3 && (
          <SizeStep
            data={editedProfile.size}
            onChange={(size) => setEditedProfile((p) => ({ ...p, size }))}
          />
        )}
        {currentStep === 4 && (
          <FeaturesStep
            data={editedProfile.features}
            onChange={(features) => setEditedProfile((p) => ({ ...p, features }))}
          />
        )}
        {currentStep === 5 && (
          <StyleStep
            data={editedProfile.style}
            onChange={(style) => setEditedProfile((p) => ({ ...p, style }))}
          />
        )}
        {currentStep === 6 && (
          <LifestyleStep
            data={{ ...editedProfile.lifestyle, ...editedProfile.timeline }}
            onChange={(data) => {
              const { urgency, ...lifestyle } = data
              setEditedProfile((p) => ({
                ...p,
                lifestyle,
                timeline: { urgency },
              }))
            }}
          />
        )}
      </div>
    </Card>
  )
}
