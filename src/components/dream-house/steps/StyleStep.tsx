'use client'

import { StylePreferences, ARCHITECTURAL_STYLES, WizardStepProps } from '@/lib/types/dream-house'
import FeatureChips, { RatingSlider } from '../FeatureChips'
import { RadioGroup } from '@/components/ui/Form'

const AGE_OPTIONS = [
  { value: 'new', label: 'New', description: 'Recent construction (up to 5 years)' },
  { value: 'up_to_10', label: 'Up to 10 years', description: 'Semi-new, good condition' },
  { value: 'up_to_20', label: 'Up to 20 years', description: 'May need updates' },
  { value: 'any', label: 'Any', description: 'Age is not important' },
]

const RENOVATION_OPTIONS = [
  { value: 'none', label: 'None', description: 'Move-in ready, no work needed' },
  { value: 'minor', label: 'Minor', description: 'Paint, simple repairs' },
  { value: 'major', label: 'Major', description: 'Significant renovations' },
  { value: 'full', label: 'Full', description: 'Willing to fully renovate' },
]

const FINISHING_OPTIONS = [
  { value: 'high', label: 'High-End', description: 'Premium finishes' },
  { value: 'medium', label: 'Standard', description: 'Functional finishes' },
  { value: 'willing_to_renovate', label: 'Willing to Renovate', description: 'Can improve later' },
]

interface StyleStepProps extends WizardStepProps<StylePreferences> {}

export default function StyleStep({ data, onChange }: StyleStepProps) {
  const handleArchitecturalChange = (architectural: string[]) => {
    onChange({ ...data, architectural })
  }

  const handleAgeChange = (value: string) => {
    onChange({ ...data, agePreference: value as StylePreferences['agePreference'] })
  }

  const handleRenovationChange = (value: string) => {
    onChange({ ...data, renovationWillingness: value as StylePreferences['renovationWillingness'] })
  }

  const handleFinishingChange = (value: string) => {
    onChange({ ...data, finishingLevel: value as StylePreferences['finishingLevel'] })
  }

  const handleLightChange = (naturalLightImportance: number) => {
    onChange({ ...data, naturalLightImportance: naturalLightImportance as StylePreferences['naturalLightImportance'] })
  }

  return (
    <div className="space-y-6">
      {/* Architectural Style */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Architectural Styles (select all you like)
        </label>
        <FeatureChips
          options={ARCHITECTURAL_STYLES}
          selected={data.architectural}
          onChange={handleArchitecturalChange}
          columns={3}
          size="md"
        />
      </div>

      {/* Age Preference */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Property Age</label>
        <RadioGroup
          name="agePreference"
          options={AGE_OPTIONS}
          value={data.agePreference}
          onChange={handleAgeChange}
          orientation="vertical"
        />
      </div>

      {/* Renovation Willingness */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Renovation Willingness</label>
        <RadioGroup
          name="renovationWillingness"
          options={RENOVATION_OPTIONS}
          value={data.renovationWillingness}
          onChange={handleRenovationChange}
          orientation="vertical"
        />
      </div>

      {/* Finishing Level */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Finish Level</label>
        <RadioGroup
          name="finishingLevel"
          options={FINISHING_OPTIONS}
          value={data.finishingLevel}
          onChange={handleFinishingChange}
          orientation="vertical"
        />
      </div>

      {/* Natural Light */}
      <RatingSlider
        label="Natural Light Importance"
        value={data.naturalLightImportance}
        onChange={handleLightChange}
        min={1}
        max={5}
        labels={['Indifferent', 'Slightly important', 'Moderate', 'Important', 'Essential']}
      />

      {/* Style summary */}
      {data.architectural.length > 0 && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Your favorite styles:</h4>
          <div className="flex flex-wrap gap-2">
            {data.architectural.map((styleId) => {
              const style = ARCHITECTURAL_STYLES.find((s) => s.id === styleId)
              return style ? (
                <span
                  key={styleId}
                  className="px-3 py-1 bg-white border border-gray-200 rounded-full text-sm text-gray-700"
                >
                  {style.label}
                </span>
              ) : null
            })}
          </div>
        </div>
      )}
    </div>
  )
}
