'use client'

import { ReactNode } from 'react'

// ==================== PROGRESS BAR ====================

interface ProgressBarProps {
  value?: number // 0-100, undefined = indeterminate
  label?: string
  sublabel?: string
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
  className?: string
}

export function ProgressBar({
  value,
  label,
  sublabel,
  size = 'md',
  showValue = true,
  className = '',
}: ProgressBarProps) {
  const isIndeterminate = value === undefined

  const heights = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }

  return (
    <div className={`w-full ${className}`}>
      {(label || (showValue && !isIndeterminate)) && (
        <div className="flex justify-between items-center mb-1">
          {label && (
            <span className="text-sm font-medium text-gray-700">{label}</span>
          )}
          {showValue && !isIndeterminate && (
            <span className="text-sm text-gray-500">{Math.round(value!)}%</span>
          )}
        </div>
      )}
      <div
        className={`w-full bg-gray-200 rounded-full overflow-hidden ${heights[size]}`}
        role="progressbar"
        aria-valuenow={isIndeterminate ? undefined : value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Progress'}
      >
        {isIndeterminate ? (
          <div
            className={`${heights[size]} rounded-full animate-indeterminate`}
            style={{ width: '30%', background: '#006AFF' }}
          />
        ) : (
          <div
            className={`${heights[size]} rounded-full transition-all duration-300 ease-out`}
            style={{ width: `${Math.min(100, Math.max(0, value!))}%`, background: '#006AFF' }}
          />
        )}
      </div>
      {sublabel && (
        <p className="mt-1 text-xs text-gray-500">{sublabel}</p>
      )}
    </div>
  )
}

// ==================== CIRCULAR PROGRESS ====================

interface CircularProgressProps {
  value?: number // 0-100, undefined = indeterminate
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
  label?: string
  className?: string
}

export function CircularProgress({
  value,
  size = 'md',
  showValue = true,
  label,
  className = '',
}: CircularProgressProps) {
  const isIndeterminate = value === undefined

  const sizes = {
    sm: { width: 32, stroke: 3 },
    md: { width: 48, stroke: 4 },
    lg: { width: 64, stroke: 5 },
  }

  const { width, stroke } = sizes[size]
  const radius = (width - stroke) / 2
  const circumference = radius * 2 * Math.PI
  const offset = isIndeterminate ? 0 : circumference - (value! / 100) * circumference

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <div className="relative" style={{ width, height: width }}>
        <svg
          className={isIndeterminate ? 'animate-spin' : ''}
          width={width}
          height={width}
          viewBox={`0 0 ${width} ${width}`}
          role="progressbar"
          aria-valuenow={isIndeterminate ? undefined : value}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label || 'Progress'}
        >
          {/* Background circle */}
          <circle
            className="text-gray-200"
            strokeWidth={stroke}
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={width / 2}
            cy={width / 2}
          />
          {/* Progress circle */}
          <circle
            className={`transition-all duration-300 ease-out ${
              isIndeterminate ? '' : ''
            }`}
            style={{
              color: '#006AFF',
              transformOrigin: 'center',
              transform: 'rotate(-90deg)',
            }}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={isIndeterminate ? circumference * 0.75 : offset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={width / 2}
            cy={width / 2}
          />
        </svg>
        {showValue && !isIndeterminate && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`font-medium text-gray-700 ${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'}`}>
              {Math.round(value!)}%
            </span>
          </div>
        )}
      </div>
      {label && (
        <span className="mt-2 text-sm text-gray-600">{label}</span>
      )}
    </div>
  )
}

// ==================== STEP PROGRESS ====================

export interface Step {
  label: string
  description?: string
  status: 'pending' | 'active' | 'complete' | 'error'
}

interface StepProgressProps {
  steps: Step[]
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export function StepProgress({
  steps,
  orientation = 'vertical',
  className = '',
}: StepProgressProps) {
  const getStepIcon = (status: Step['status'], index: number) => {
    switch (status) {
      case 'complete':
        return (
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      case 'active':
        return (
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        )
      default:
        return (
          <span className="text-xs font-medium text-gray-500">{index + 1}</span>
        )
    }
  }

  const getStepColor = (status: Step['status']) => {
    switch (status) {
      case 'complete':
        return 'bg-[#006AFF]'
      case 'active':
        return 'bg-[#006AFF]'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-gray-200'
    }
  }

  const getTextColor = (status: Step['status']) => {
    switch (status) {
      case 'complete':
      case 'active':
        return 'text-gray-900'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-gray-500'
    }
  }

  if (orientation === 'horizontal') {
    return (
      <div className={`flex items-center ${className}`}>
        {steps.map((step, index) => (
          <div key={index} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${getStepColor(step.status)}`}
              >
                {getStepIcon(step.status, index)}
              </div>
              <span className={`mt-2 text-xs font-medium ${getTextColor(step.status)}`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-12 h-0.5 mx-2 ${
                  step.status === 'complete' ? 'bg-[#006AFF]' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {steps.map((step, index) => (
        <div key={index} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getStepColor(step.status)}`}
            >
              {getStepIcon(step.status, index)}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-0.5 h-full min-h-[24px] mt-2 ${
                  step.status === 'complete' ? 'bg-[#006AFF]' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
          <div className="pt-1">
            <p className={`text-sm font-medium ${getTextColor(step.status)}`}>
              {step.label}
            </p>
            {step.description && (
              <p className="mt-0.5 text-xs text-gray-500">{step.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ==================== PROGRESS MODAL ====================

interface ProgressModalProps {
  isOpen: boolean
  title: string
  steps?: Step[]
  progress?: number // 0-100
  estimatedTime?: string
  allowBackground?: boolean
  onBackground?: () => void
  onCancel?: () => void
  children?: ReactNode
}

export function ProgressModal({
  isOpen,
  title,
  steps,
  progress,
  estimatedTime,
  allowBackground = false,
  onBackground,
  onCancel,
  children,
}: ProgressModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6 animate-scaleIn">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#E3F2FD' }}>
            <svg className="w-6 h-6 animate-spin" style={{ color: '#006AFF' }} fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {estimatedTime && (
            <p className="mt-1 text-sm text-gray-500">
              Estimated time: {estimatedTime}
            </p>
          )}
        </div>

        {/* Progress bar */}
        {progress !== undefined && (
          <div className="mb-6">
            <ProgressBar value={progress} size="lg" />
          </div>
        )}

        {/* Steps */}
        {steps && steps.length > 0 && (
          <div className="mb-6">
            <StepProgress steps={steps} />
          </div>
        )}

        {/* Custom content */}
        {children}

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          {allowBackground && onBackground && (
            <button
              onClick={onBackground}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Run in background
            </button>
          )}
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ==================== INLINE PROGRESS ====================

interface InlineProgressProps {
  label: string
  value?: number
  status?: 'loading' | 'success' | 'error'
  className?: string
}

export function InlineProgress({
  label,
  value,
  status = 'loading',
  className = '',
}: InlineProgressProps) {
  const getIcon = () => {
    switch (status) {
      case 'success':
        return (
          <svg className="w-5 h-5" style={{ color: '#006AFF' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      default:
        return <CircularProgress size="sm" showValue={false} />
    }
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {getIcon()}
      <span className="text-sm text-gray-700">{label}</span>
      {value !== undefined && status === 'loading' && (
        <span className="text-sm text-gray-500 ml-auto">{Math.round(value)}%</span>
      )}
    </div>
  )
}

// Add animation to globals.css
// @keyframes indeterminate {
//   0% { transform: translateX(-100%); }
//   100% { transform: translateX(400%); }
// }
// .animate-indeterminate { animation: indeterminate 1.5s ease-in-out infinite; }
