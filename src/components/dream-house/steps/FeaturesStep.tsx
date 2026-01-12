'use client'

import { FeaturesPreferences, FEATURE_OPTIONS, WizardStepProps } from '@/lib/types/dream-house'
import { FeatureCategoryChips } from '../FeatureChips'

interface FeaturesStepProps extends WizardStepProps<FeaturesPreferences> {}

// Convert FEATURE_OPTIONS to simple format for chips
const featureOptions = FEATURE_OPTIONS.map((f) => ({
  id: f.id,
  label: f.label,
}))

export default function FeaturesStep({ data, onChange }: FeaturesStepProps) {
  const handleMustHaveChange = (mustHave: string[]) => {
    onChange({ ...data, mustHave })
  }

  const handleNiceToHaveChange = (niceToHave: string[]) => {
    onChange({ ...data, niceToHave })
  }

  const handleDealBreakersChange = (dealBreakers: string[]) => {
    onChange({ ...data, dealBreakers })
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">How it works</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <strong>Must Have:</strong> Features the home MUST have
          </li>
          <li className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            <strong>Nice to Have:</strong> Would be great, but not required
          </li>
          <li className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <strong>Deal Breaker:</strong> Automatically disqualifies the home
          </li>
        </ul>
      </div>

      {/* Feature selection */}
      <FeatureCategoryChips
        options={featureOptions}
        mustHave={data.mustHave}
        niceToHave={data.niceToHave}
        dealBreakers={data.dealBreakers}
        onChangeMustHave={handleMustHaveChange}
        onChangeNiceToHave={handleNiceToHaveChange}
        onChangeDealBreakers={handleDealBreakersChange}
      />

      {/* Selected summary */}
      {(data.mustHave.length > 0 || data.niceToHave.length > 0 || data.dealBreakers.length > 0) && (
        <div className="space-y-4 pt-4 border-t">
          {data.mustHave.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-green-700 mb-2">Selected Must-Haves:</h4>
              <div className="flex flex-wrap gap-2">
                {data.mustHave.map((id) => {
                  const feature = FEATURE_OPTIONS.find((f) => f.id === id)
                  return feature ? (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-md text-sm"
                    >
                      {feature.label}
                      <button
                        type="button"
                        onClick={() => handleMustHaveChange(data.mustHave.filter((i) => i !== id))}
                        className="hover:text-red-500"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ) : null
                })}
              </div>
            </div>
          )}

          {data.niceToHave.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-blue-700 mb-2">Selected Nice-to-Haves:</h4>
              <div className="flex flex-wrap gap-2">
                {data.niceToHave.map((id) => {
                  const feature = FEATURE_OPTIONS.find((f) => f.id === id)
                  return feature ? (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-sm"
                    >
                      {feature.label}
                      <button
                        type="button"
                        onClick={() => handleNiceToHaveChange(data.niceToHave.filter((i) => i !== id))}
                        className="hover:text-red-500"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ) : null
                })}
              </div>
            </div>
          )}

          {data.dealBreakers.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-red-700 mb-2">Selected Deal Breakers:</h4>
              <div className="flex flex-wrap gap-2">
                {data.dealBreakers.map((id) => {
                  const feature = FEATURE_OPTIONS.find((f) => f.id === id)
                  return feature ? (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-md text-sm"
                    >
                      {feature.label}
                      <button
                        type="button"
                        onClick={() => handleDealBreakersChange(data.dealBreakers.filter((i) => i !== id))}
                        className="hover:text-green-500"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ) : null
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
