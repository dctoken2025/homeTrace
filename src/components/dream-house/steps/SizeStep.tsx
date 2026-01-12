'use client'

import { SizePreferences, WizardStepProps } from '@/lib/types/dream-house'
import FeatureChips, { NumberStepper, CurrencyInput } from '../FeatureChips'
import { RadioGroup } from '@/components/ui/Form'

const OUTDOOR_SPACE_OPTIONS = [
  { id: 'yard', label: 'Yard' },
  { id: 'balcony', label: 'Balcony' },
  { id: 'terrace', label: 'Terrace' },
  { id: 'rooftop', label: 'Rooftop' },
  { id: 'garden', label: 'Garden' },
  { id: 'pool_area', label: 'Pool Area' },
]

const FLOOR_OPTIONS = [
  { value: 'single', label: 'Single Story', description: 'One-level home' },
  { value: 'multi', label: 'Multi-Story', description: 'Home with multiple floors' },
  { value: 'apartment', label: 'Apartment', description: 'Unit in a building' },
  { value: 'any', label: 'Any', description: 'Open to any option' },
]

interface SizeStepProps extends WizardStepProps<SizePreferences> {}

export default function SizeStep({ data, onChange, errors }: SizeStepProps) {
  const handleBedroomsMinChange = (bedroomsMin: number) => {
    onChange({
      ...data,
      bedroomsMin,
      bedroomsIdeal: Math.max(data.bedroomsIdeal, bedroomsMin),
    })
  }

  const handleBedroomsIdealChange = (bedroomsIdeal: number) => {
    onChange({
      ...data,
      bedroomsIdeal,
      bedroomsMin: Math.min(data.bedroomsMin, bedroomsIdeal),
    })
  }

  const handleBathroomsChange = (bathroomsMin: number) => {
    onChange({ ...data, bathroomsMin })
  }

  const handleSqftMinChange = (value: number | null) => {
    onChange({ ...data, sqftMin: value })
  }

  const handleSqftIdealChange = (value: number | null) => {
    onChange({ ...data, sqftIdeal: value })
  }

  const handleOutdoorChange = (outdoorSpace: string[]) => {
    onChange({ ...data, outdoorSpace: outdoorSpace as SizePreferences['outdoorSpace'] })
  }

  const handleParkingChange = (parkingSpots: number) => {
    onChange({ ...data, parkingSpots })
  }

  const handleFloorsChange = (value: string) => {
    onChange({ ...data, floors: value as SizePreferences['floors'] })
  }

  return (
    <div className="space-y-6">
      {/* Bedrooms */}
      <div className="grid grid-cols-2 gap-6">
        <NumberStepper
          label="Bedrooms (Minimum)"
          value={data.bedroomsMin}
          onChange={handleBedroomsMinChange}
          min={1}
          max={10}
        />
        <NumberStepper
          label="Bedrooms (Ideal)"
          value={data.bedroomsIdeal}
          onChange={handleBedroomsIdealChange}
          min={1}
          max={10}
        />
      </div>
      {errors?.bedrooms && <p className="text-sm text-red-500">{errors.bedrooms}</p>}

      {/* Bathrooms */}
      <NumberStepper
        label="Bathrooms (Minimum)"
        value={data.bathroomsMin}
        onChange={handleBathroomsChange}
        min={1}
        max={10}
      />
      {errors?.bathrooms && <p className="text-sm text-red-500">{errors.bathrooms}</p>}

      {/* Square Footage */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Square Footage</label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Minimum</label>
            <input
              type="number"
              value={data.sqftMin || ''}
              onChange={(e) => handleSqftMinChange(e.target.value ? parseInt(e.target.value) : null)}
              placeholder="1,500"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006AFF] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ideal</label>
            <input
              type="number"
              value={data.sqftIdeal || ''}
              onChange={(e) => handleSqftIdealChange(e.target.value ? parseInt(e.target.value) : null)}
              placeholder="2,500"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006AFF] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Quick size presets */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Common Sizes</label>
        <div className="flex flex-wrap gap-2">
          {[
            { sqft: 1000, label: '~1,000 sqft (Compact)' },
            { sqft: 1500, label: '~1,500 sqft (Medium)' },
            { sqft: 2000, label: '~2,000 sqft (Family)' },
            { sqft: 2500, label: '~2,500 sqft (Spacious)' },
            { sqft: 3500, label: '3,500+ sqft (Large)' },
          ].map((preset) => (
            <button
              key={preset.sqft}
              type="button"
              onClick={() => onChange({ ...data, sqftMin: preset.sqft - 300, sqftIdeal: preset.sqft })}
              className={`
                px-3 py-1.5 rounded-full text-sm border-2 transition-all
                ${data.sqftIdeal === preset.sqft
                  ? 'border-[#006AFF] bg-[#E3F2FD] text-[#006AFF]'
                  : 'border-gray-300 text-gray-600 hover:border-gray-400'
                }
              `}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Outdoor Space */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Desired Outdoor Space</label>
        <FeatureChips
          options={OUTDOOR_SPACE_OPTIONS}
          selected={data.outdoorSpace}
          onChange={handleOutdoorChange}
          columns={3}
          size="sm"
        />
      </div>

      {/* Parking */}
      <NumberStepper
        label="Parking Spots"
        value={data.parkingSpots}
        onChange={handleParkingChange}
        min={0}
        max={6}
        suffix="spots"
      />

      {/* Floor Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Property Type</label>
        <RadioGroup
          name="floors"
          options={FLOOR_OPTIONS}
          value={data.floors}
          onChange={handleFloorsChange}
          orientation="vertical"
        />
      </div>
    </div>
  )
}
