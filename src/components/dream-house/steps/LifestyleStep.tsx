'use client'

import { LifestylePreferences, TimelinePreferences, PET_TYPES, HOBBY_OPTIONS, WizardStepProps } from '@/lib/types/dream-house'
import FeatureChips, { NumberStepper, TagInput } from '../FeatureChips'
import { RadioGroup, Checkbox } from '@/components/ui/Form'

const WORK_FROM_HOME_OPTIONS = [
  { value: 'never', label: 'Never', description: 'Always work outside the home' },
  { value: 'sometimes', label: 'Sometimes', description: 'Some days per week' },
  { value: 'always', label: 'Always', description: 'Full-time remote work' },
]

const ENTERTAIN_OPTIONS = [
  { value: 'rarely', label: 'Rarely', description: 'Almost never have guests' },
  { value: 'sometimes', label: 'Sometimes', description: 'A few times per month' },
  { value: 'often', label: 'Often', description: 'Love having people over' },
]

const URGENCY_OPTIONS = [
  { value: 'asap', label: 'Immediate', description: 'Need to move ASAP' },
  { value: '3_months', label: 'Within 3 months', description: 'Short term' },
  { value: '6_months', label: 'Within 6 months', description: 'Medium term' },
  { value: '1_year', label: 'Within 1 year', description: 'No rush' },
  { value: 'flexible', label: 'Flexible', description: 'Waiting for the right home' },
]

interface LifestyleStepProps extends WizardStepProps<LifestylePreferences & TimelinePreferences> {}

export default function LifestyleStep({ data, onChange }: LifestyleStepProps) {
  // Split data into lifestyle and timeline
  const lifestyleData: LifestylePreferences = {
    worksFromHome: data.worksFromHome,
    hasChildren: data.hasChildren,
    childrenCount: data.childrenCount,
    childrenAges: data.childrenAges,
    hasPets: data.hasPets,
    petTypes: data.petTypes,
    entertainsGuests: data.entertainsGuests,
    hobbiesNeedingSpace: data.hobbiesNeedingSpace,
  }

  const handleWorkChange = (value: string) => {
    onChange({ ...data, worksFromHome: value as LifestylePreferences['worksFromHome'] })
  }

  const handleChildrenToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...data,
      hasChildren: e.target.checked,
      childrenCount: e.target.checked ? 1 : 0,
      childrenAges: e.target.checked ? [] : [],
    })
  }

  const handleChildrenCountChange = (childrenCount: number) => {
    onChange({ ...data, childrenCount })
  }

  const handleChildrenAgesChange = (childrenAges: string[]) => {
    onChange({ ...data, childrenAges })
  }

  const handlePetsToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...data,
      hasPets: e.target.checked,
      petTypes: e.target.checked ? [] : [],
    })
  }

  const handlePetTypesChange = (petTypes: string[]) => {
    onChange({ ...data, petTypes })
  }

  const handleEntertainChange = (value: string) => {
    onChange({ ...data, entertainsGuests: value as LifestylePreferences['entertainsGuests'] })
  }

  const handleHobbiesChange = (hobbiesNeedingSpace: string[]) => {
    onChange({ ...data, hobbiesNeedingSpace })
  }

  const handleUrgencyChange = (value: string) => {
    onChange({ ...data, urgency: value as TimelinePreferences['urgency'] })
  }

  return (
    <div className="space-y-6">
      {/* Work from home */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Do you work from home?</label>
        <RadioGroup
          name="worksFromHome"
          options={WORK_FROM_HOME_OPTIONS}
          value={data.worksFromHome}
          onChange={handleWorkChange}
          orientation="vertical"
        />
      </div>

      {/* Children */}
      <div className="p-4 bg-gray-50 rounded-lg space-y-4">
        <Checkbox
          label="I have children or plan to have"
          checked={data.hasChildren}
          onChange={handleChildrenToggle}
        />

        {data.hasChildren && (
          <div className="pl-6 space-y-4 border-l-2 border-gray-200">
            <NumberStepper
              label="How many children?"
              value={data.childrenCount || 1}
              onChange={handleChildrenCountChange}
              min={1}
              max={10}
            />

            <TagInput
              label="Children's ages"
              tags={data.childrenAges || []}
              onChange={handleChildrenAgesChange}
              placeholder="E.g.: 5, 8, teenager"
              maxTags={10}
            />
          </div>
        )}
      </div>

      {/* Pets */}
      <div className="p-4 bg-gray-50 rounded-lg space-y-4">
        <Checkbox
          label="I have or plan to have pets"
          checked={data.hasPets}
          onChange={handlePetsToggle}
        />

        {data.hasPets && (
          <div className="pl-6 border-l-2 border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">What type of pets?</label>
            <FeatureChips
              options={PET_TYPES}
              selected={data.petTypes || []}
              onChange={handlePetTypesChange}
              columns={3}
              size="sm"
            />
          </div>
        )}
      </div>

      {/* Entertainment */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          How often do you have guests over?
        </label>
        <RadioGroup
          name="entertainsGuests"
          options={ENTERTAIN_OPTIONS}
          value={data.entertainsGuests}
          onChange={handleEntertainChange}
          orientation="vertical"
        />
      </div>

      {/* Hobbies */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Hobbies that need dedicated space
        </label>
        <FeatureChips
          options={HOBBY_OPTIONS}
          selected={data.hobbiesNeedingSpace}
          onChange={handleHobbiesChange}
          columns={3}
          size="sm"
        />
      </div>

      {/* Timeline / Urgency */}
      <div className="pt-6 border-t">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          How urgent is your need to find a home?
        </label>
        <RadioGroup
          name="urgency"
          options={URGENCY_OPTIONS}
          value={data.urgency}
          onChange={handleUrgencyChange}
          orientation="vertical"
        />
      </div>

      {/* Summary card */}
      <div className="p-4 bg-[#E3F2FD] rounded-lg">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-[#006AFF] mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-[#0D47A1]">
            <p className="font-medium">Almost there!</p>
            <p>This information helps us better understand your lifestyle and find the perfect home for you and your family.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
