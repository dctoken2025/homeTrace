'use client'

import { BudgetPreferences, WizardStepProps } from '@/lib/types/dream-house'
import { CurrencyInput } from '../FeatureChips'
import { RadioGroup } from '@/components/ui/Form'

const FLEXIBILITY_OPTIONS = [
  { value: 'strict', label: 'Strict', description: 'Cannot exceed the limit' },
  { value: 'flexible', label: 'Flexible', description: 'Can negotiate up to 10-15%' },
  { value: 'very_flexible', label: 'Very Flexible', description: 'The right home is more important than price' },
]

const PAYMENT_OPTIONS = [
  { value: 'financing', label: 'Financing', description: 'Will finance most of it' },
  { value: 'cash', label: 'Cash', description: 'Full payment upfront' },
  { value: 'mixed', label: 'Mixed', description: 'Down payment + Financing' },
]

interface BudgetStepProps extends WizardStepProps<BudgetPreferences> {}

export default function BudgetStep({ data, onChange, errors }: BudgetStepProps) {
  const handleMinChange = (min: number | null) => {
    onChange({ ...data, min })
  }

  const handleMaxChange = (max: number | null) => {
    onChange({ ...data, max })
  }

  const handleFlexibilityChange = (value: string) => {
    onChange({ ...data, flexibility: value as BudgetPreferences['flexibility'] })
  }

  const handlePaymentChange = (value: string) => {
    onChange({ ...data, paymentType: value as BudgetPreferences['paymentType'] })
  }

  const handleMonthlyChange = (monthlyBudget: number | null) => {
    onChange({ ...data, monthlyBudget })
  }

  const budgetError = data.min && data.max && data.min > data.max
    ? 'Minimum value must be less than maximum'
    : errors?.budget

  return (
    <div className="space-y-6">
      {/* Budget Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Price Range</label>
        <div className="grid grid-cols-2 gap-4">
          <CurrencyInput
            label="Minimum"
            value={data.min}
            onChange={handleMinChange}
            placeholder="$300,000"
          />
          <CurrencyInput
            label="Maximum"
            value={data.max}
            onChange={handleMaxChange}
            placeholder="$500,000"
            error={budgetError}
          />
        </div>
      </div>

      {/* Quick budget presets */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Suggested Ranges</label>
        <div className="flex flex-wrap gap-2">
          {[
            { min: 200000, max: 350000, label: '$200k - $350k' },
            { min: 350000, max: 500000, label: '$350k - $500k' },
            { min: 500000, max: 750000, label: '$500k - $750k' },
            { min: 750000, max: 1000000, label: '$750k - $1M' },
            { min: 1000000, max: 1500000, label: '$1M - $1.5M' },
            { min: 1500000, max: 2500000, label: '$1.5M+' },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onChange({ ...data, min: preset.min, max: preset.max })}
              className={`
                px-3 py-1.5 rounded-full text-sm border-2 transition-all
                ${data.min === preset.min && data.max === preset.max
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

      {/* Flexibility */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Budget Flexibility</label>
        <RadioGroup
          name="flexibility"
          options={FLEXIBILITY_OPTIONS}
          value={data.flexibility}
          onChange={handleFlexibilityChange}
          orientation="vertical"
        />
      </div>

      {/* Payment Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Payment Method</label>
        <RadioGroup
          name="paymentType"
          options={PAYMENT_OPTIONS}
          value={data.paymentType}
          onChange={handlePaymentChange}
          orientation="vertical"
        />
      </div>

      {/* Monthly Budget (optional, shown for financing) */}
      {data.paymentType !== 'cash' && (
        <CurrencyInput
          label="Monthly Budget for Payments (optional)"
          value={data.monthlyBudget || null}
          onChange={handleMonthlyChange}
          placeholder="$3,000"
        />
      )}

      {/* Budget info card */}
      <div className="p-4 bg-blue-50 rounded-lg">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-medium">Tip</p>
            <p>Consider additional costs like taxes, insurance, and maintenance that can add 1-3% to the annual cost.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
