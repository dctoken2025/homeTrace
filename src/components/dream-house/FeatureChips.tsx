'use client'

import { useState } from 'react'

interface ChipOption {
  id: string
  label: string
  icon?: string
}

interface FeatureChipsProps {
  options: ChipOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  multiple?: boolean
  columns?: 2 | 3 | 4
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'success' | 'warning' | 'danger'
  disabled?: boolean
  maxSelections?: number
  className?: string
}

export default function FeatureChips({
  options,
  selected,
  onChange,
  multiple = true,
  columns = 3,
  size = 'md',
  variant = 'default',
  disabled = false,
  maxSelections,
  className = '',
}: FeatureChipsProps) {
  const handleToggle = (id: string) => {
    if (disabled) return

    if (multiple) {
      if (selected.includes(id)) {
        onChange(selected.filter((s) => s !== id))
      } else {
        if (maxSelections && selected.length >= maxSelections) {
          return
        }
        onChange([...selected, id])
      }
    } else {
      onChange(selected.includes(id) ? [] : [id])
    }
  }

  const getVariantStyles = (isSelected: boolean) => {
    if (!isSelected) {
      return 'bg-white border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
    }

    switch (variant) {
      case 'success':
        return 'bg-green-50 border-green-500 text-green-700'
      case 'warning':
        return 'bg-amber-50 border-amber-500 text-amber-700'
      case 'danger':
        return 'bg-red-50 border-red-500 text-red-700'
      default:
        return 'border-[#006AFF] text-[#006AFF]'
    }
  }

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm'
      case 'lg':
        return 'px-5 py-3 text-base'
      default:
        return 'px-4 py-2 text-sm'
    }
  }

  const getGridCols = () => {
    switch (columns) {
      case 2:
        return 'grid-cols-2'
      case 4:
        return 'grid-cols-2 sm:grid-cols-4'
      default:
        return 'grid-cols-2 sm:grid-cols-3'
    }
  }

  return (
    <div className={`grid ${getGridCols()} gap-2 ${className}`}>
      {options.map((option) => {
        const isSelected = selected.includes(option.id)
        const isDisabled = disabled || !!(maxSelections && selected.length >= maxSelections && !isSelected)

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => handleToggle(option.id)}
            disabled={isDisabled}
            className={`
              ${getSizeStyles()}
              border-2 rounded-lg font-medium
              transition-all duration-150
              flex items-center justify-center gap-2
              ${getVariantStyles(isSelected)}
              ${isSelected ? 'shadow-sm' : ''}
              ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {isSelected && (
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <span className="truncate">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// Specialized component for must-have / nice-to-have / deal-breaker selection
interface FeatureCategoryChipsProps {
  options: ChipOption[]
  mustHave: string[]
  niceToHave: string[]
  dealBreakers: string[]
  onChangeMustHave: (selected: string[]) => void
  onChangeNiceToHave: (selected: string[]) => void
  onChangeDealBreakers: (selected: string[]) => void
  className?: string
}

export function FeatureCategoryChips({
  options,
  mustHave,
  niceToHave,
  dealBreakers,
  onChangeMustHave,
  onChangeNiceToHave,
  onChangeDealBreakers,
  className = '',
}: FeatureCategoryChipsProps) {
  const [activeCategory, setActiveCategory] = useState<'mustHave' | 'niceToHave' | 'dealBreakers'>('mustHave')

  const getSelectedForFeature = (featureId: string): 'mustHave' | 'niceToHave' | 'dealBreakers' | null => {
    if (mustHave.includes(featureId)) return 'mustHave'
    if (niceToHave.includes(featureId)) return 'niceToHave'
    if (dealBreakers.includes(featureId)) return 'dealBreakers'
    return null
  }

  const handleFeatureClick = (featureId: string) => {
    const currentCategory = getSelectedForFeature(featureId)

    // Remove from current category
    if (currentCategory === 'mustHave') {
      onChangeMustHave(mustHave.filter((id) => id !== featureId))
    } else if (currentCategory === 'niceToHave') {
      onChangeNiceToHave(niceToHave.filter((id) => id !== featureId))
    } else if (currentCategory === 'dealBreakers') {
      onChangeDealBreakers(dealBreakers.filter((id) => id !== featureId))
    }

    // If clicking same category, just remove (toggle off)
    if (currentCategory === activeCategory) {
      return
    }

    // Add to active category
    if (activeCategory === 'mustHave') {
      onChangeMustHave([...mustHave, featureId])
    } else if (activeCategory === 'niceToHave') {
      onChangeNiceToHave([...niceToHave, featureId])
    } else {
      onChangeDealBreakers([...dealBreakers, featureId])
    }
  }

  const getCategoryStyle = (featureId: string) => {
    const category = getSelectedForFeature(featureId)
    if (!category) {
      return 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
    }

    switch (category) {
      case 'mustHave':
        return 'bg-green-50 border-green-500 text-green-700'
      case 'niceToHave':
        return 'bg-blue-50 border-blue-500 text-blue-700'
      case 'dealBreakers':
        return 'bg-red-50 border-red-500 text-red-700'
    }
  }

  const getCategoryIcon = (featureId: string) => {
    const category = getSelectedForFeature(featureId)
    if (!category) return null

    switch (category) {
      case 'mustHave':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )
      case 'niceToHave':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        )
      case 'dealBreakers':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        )
    }
  }

  return (
    <div className={className}>
      {/* Category selector */}
      <div className="flex gap-2 mb-4 p-1 bg-gray-100 rounded-lg">
        <button
          type="button"
          onClick={() => setActiveCategory('mustHave')}
          className={`
            flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all
            ${activeCategory === 'mustHave' ? 'bg-green-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}
          `}
        >
          Must Have ({mustHave.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory('niceToHave')}
          className={`
            flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all
            ${activeCategory === 'niceToHave' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}
          `}
        >
          Nice to Have ({niceToHave.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory('dealBreakers')}
          className={`
            flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all
            ${activeCategory === 'dealBreakers' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}
          `}
        >
          Deal Breaker ({dealBreakers.length})
        </button>
      </div>

      {/* Instruction */}
      <p className="text-sm text-gray-500 mb-3">
        {activeCategory === 'mustHave' && 'Select features that are essential for you'}
        {activeCategory === 'niceToHave' && 'Select features that would be a bonus'}
        {activeCategory === 'dealBreakers' && 'Select features you do NOT accept'}
      </p>

      {/* Feature chips */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => handleFeatureClick(option.id)}
            className={`
              px-3 py-2 border-2 rounded-lg text-sm font-medium
              transition-all duration-150
              flex items-center justify-center gap-2
              ${getCategoryStyle(option.id)}
            `}
          >
            {getCategoryIcon(option.id)}
            <span className="truncate">{option.label}</span>
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center text-sm">
        <div>
          <span className="block text-2xl font-bold text-green-600">{mustHave.length}</span>
          <span className="text-gray-500">Must-Haves</span>
        </div>
        <div>
          <span className="block text-2xl font-bold text-blue-600">{niceToHave.length}</span>
          <span className="text-gray-500">Nice-to-Haves</span>
        </div>
        <div>
          <span className="block text-2xl font-bold text-red-600">{dealBreakers.length}</span>
          <span className="text-gray-500">Deal Breakers</span>
        </div>
      </div>
    </div>
  )
}

// Rating slider component
interface RatingSliderProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  labels?: string[]
  label: string
  className?: string
}

export function RatingSlider({
  value,
  onChange,
  min = 1,
  max = 5,
  labels,
  label,
  className = '',
}: RatingSliderProps) {
  const defaultLabels = ['Not important', 'Slightly', 'Moderate', 'Important', 'Very important']
  const displayLabels = labels || defaultLabels

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-500">{displayLabels[value - 1]}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#006AFF]"
      />
      <div className="flex justify-between mt-1">
        {Array.from({ length: max - min + 1 }, (_, i) => (
          <span key={i} className="text-xs text-gray-400">
            {i + min}
          </span>
        ))}
      </div>
    </div>
  )
}

// Number stepper component
interface NumberStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  label: string
  suffix?: string
  className?: string
}

export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 10,
  label,
  suffix = '',
  className = '',
}: NumberStepperProps) {
  const decrement = () => {
    if (value > min) onChange(value - 1)
  }

  const increment = () => {
    if (value < max) onChange(value + 1)
  }

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={decrement}
          disabled={value <= min}
          className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <span className="text-2xl font-bold text-gray-900 min-w-[60px] text-center">
          {value}
          {suffix && <span className="text-sm font-normal text-gray-500 ml-1">{suffix}</span>}
        </span>
        <button
          type="button"
          onClick={increment}
          disabled={value >= max}
          className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// Currency input component
interface CurrencyInputProps {
  value: number | null
  onChange: (value: number | null) => void
  label: string
  placeholder?: string
  error?: string
  className?: string
}

export function CurrencyInput({
  value,
  onChange,
  label,
  placeholder = '$0',
  error,
  className = '',
}: CurrencyInputProps) {
  const formatValue = (val: number | null): string => {
    if (val === null || val === 0) return ''
    return val.toLocaleString('en-US')
  }

  const parseValue = (str: string): number | null => {
    const cleaned = str.replace(/[^0-9]/g, '')
    if (!cleaned) return null
    return parseInt(cleaned)
  }

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
        <input
          type="text"
          value={formatValue(value)}
          onChange={(e) => onChange(parseValue(e.target.value))}
          placeholder={placeholder}
          className={`
            w-full pl-8 pr-4 py-2 border rounded-lg
            focus:ring-2 focus:ring-[#006AFF] focus:border-transparent
            ${error ? 'border-red-500' : 'border-gray-300'}
          `}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  )
}

// Tag input for custom entries
interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  label: string
  placeholder?: string
  suggestions?: string[]
  maxTags?: number
  className?: string
}

export function TagInput({
  tags,
  onChange,
  label,
  placeholder = 'Type and press Enter',
  suggestions = [],
  maxTags = 10,
  className = '',
}: TagInputProps) {
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const filteredSuggestions = suggestions.filter(
    (s) => s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s)
  )

  const addTag = (tag: string) => {
    const trimmed = tag.trim()
    if (trimmed && !tags.includes(trimmed) && tags.length < maxTags) {
      onChange([...tags, trimmed])
      setInput('')
      setShowSuggestions(false)
    }
  }

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <div className="min-h-[42px] p-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-[#006AFF] focus-within:border-transparent">
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 bg-[#E3F2FD] text-[#006AFF] rounded-md text-sm"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="hover:text-red-500"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
            <input
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                setShowSuggestions(true)
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder={tags.length < maxTags ? placeholder : ''}
              disabled={tags.length >= maxTags}
              className="flex-1 min-w-[120px] outline-none text-sm"
            />
          </div>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto">
            {filteredSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addTag(suggestion)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
      {maxTags && (
        <p className="mt-1 text-xs text-gray-500">
          {tags.length}/{maxTags} selected
        </p>
      )}
    </div>
  )
}
