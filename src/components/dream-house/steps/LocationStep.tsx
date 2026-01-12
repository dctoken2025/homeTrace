'use client'

import { LocationPreferences, PROXIMITY_OPTIONS, WizardStepProps } from '@/lib/types/dream-house'
import FeatureChips, { TagInput, RatingSlider } from '../FeatureChips'
import { RadioGroup } from '@/components/ui/Form'

const AREA_TYPE_OPTIONS = [
  { value: 'urban', label: 'Urban', description: 'City center, high density' },
  { value: 'suburban', label: 'Suburban', description: 'Residential neighborhoods, more space' },
  { value: 'rural', label: 'Rural', description: 'Rural area, lots of nature' },
  { value: 'flexible', label: 'Flexible', description: 'Open to different options' },
]

const VIEW_OPTIONS = [
  { id: 'city', label: 'City' },
  { id: 'nature', label: 'Nature' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'mountains', label: 'Mountains' },
  { id: 'any', label: 'Any' },
]

interface LocationStepProps extends WizardStepProps<LocationPreferences> {}

export default function LocationStep({ data, onChange, errors }: LocationStepProps) {
  const handleCitiesChange = (cities: string[]) => {
    onChange({ ...data, cities })
  }

  const handleNeighborhoodsChange = (neighborhoods: string[]) => {
    onChange({ ...data, neighborhoods })
  }

  const handleAreaTypeChange = (value: string) => {
    onChange({ ...data, areaType: value as LocationPreferences['areaType'] })
  }

  const handleProximityChange = (proximityNeeds: string[]) => {
    onChange({ ...data, proximityNeeds })
  }

  const handleSecurityChange = (securityImportance: number) => {
    onChange({ ...data, securityImportance: securityImportance as LocationPreferences['securityImportance'] })
  }

  const handleViewChange = (selected: string[]) => {
    const view = selected[0] || 'any'
    onChange({ ...data, viewPreference: view as LocationPreferences['viewPreference'] })
  }

  return (
    <div className="space-y-6">
      {/* Cities */}
      <TagInput
        label="Cities of Interest"
        tags={data.cities}
        onChange={handleCitiesChange}
        placeholder="Type a city and press Enter"
        suggestions={['Austin', 'Houston', 'Dallas', 'San Antonio', 'Denver', 'Phoenix', 'Seattle']}
        maxTags={5}
      />
      {errors?.cities && <p className="text-sm text-red-500 -mt-4">{errors.cities}</p>}

      {/* Neighborhoods */}
      <TagInput
        label="Preferred Neighborhoods (optional)"
        tags={data.neighborhoods}
        onChange={handleNeighborhoodsChange}
        placeholder="Type a neighborhood"
        maxTags={10}
      />

      {/* Area Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Area Type</label>
        <RadioGroup
          name="areaType"
          options={AREA_TYPE_OPTIONS}
          value={data.areaType}
          onChange={handleAreaTypeChange}
          orientation="vertical"
        />
      </div>

      {/* Proximity Needs */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Important Proximity (select all that apply)
        </label>
        <FeatureChips
          options={PROXIMITY_OPTIONS}
          selected={data.proximityNeeds}
          onChange={handleProximityChange}
          columns={3}
          size="sm"
        />
      </div>

      {/* Security Importance */}
      <RatingSlider
        label="Neighborhood Security Importance"
        value={data.securityImportance}
        onChange={handleSecurityChange}
        min={1}
        max={5}
      />

      {/* View Preference */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">View Preference</label>
        <FeatureChips
          options={VIEW_OPTIONS}
          selected={[data.viewPreference]}
          onChange={handleViewChange}
          multiple={false}
          columns={3}
          size="sm"
        />
      </div>
    </div>
  )
}
