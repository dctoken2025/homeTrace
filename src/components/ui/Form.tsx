'use client'

import {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
  forwardRef,
  ReactNode,
  useId,
} from 'react'

// ==================== FORM FIELD WRAPPER ====================

interface FormFieldProps {
  label?: string
  error?: string
  hint?: string
  required?: boolean
  children: ReactNode
  className?: string
}

export function FormField({
  label,
  error,
  hint,
  required,
  children,
  className = '',
}: FormFieldProps) {
  const id = useId()

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="text-sm text-gray-500">{hint}</p>
      )}
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1" role="alert">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}

// ==================== INPUT ====================

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  error?: boolean
  inputSize?: 'sm' | 'md' | 'lg'
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  leftAddon?: string
  rightAddon?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className = '',
      error,
      inputSize = 'md',
      leftIcon,
      rightIcon,
      leftAddon,
      rightAddon,
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm min-h-[32px]',
      md: 'px-3 py-2 text-sm min-h-[40px]',
      lg: 'px-4 py-3 text-base min-h-[48px]',
    }

    const baseStyles = `
      w-full rounded-lg border bg-white
      transition-colors duration-150
      placeholder:text-gray-400
      focus:outline-none focus:ring-2 focus:ring-offset-0
      disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
    `

    const stateStyles = error
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
      : 'border-gray-300 focus:border-[#006AFF] focus:ring-[#006AFF]/20'

    const hasLeftAddon = leftAddon || leftIcon
    const hasRightAddon = rightAddon || rightIcon

    if (hasLeftAddon || hasRightAddon) {
      return (
        <div className="relative flex">
          {leftAddon && (
            <span className="inline-flex items-center px-3 text-sm text-gray-500 bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg">
              {leftAddon}
            </span>
          )}
          {leftIcon && !leftAddon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              ${baseStyles}
              ${stateStyles}
              ${sizeStyles[inputSize]}
              ${leftIcon && !leftAddon ? 'pl-10' : ''}
              ${rightIcon && !rightAddon ? 'pr-10' : ''}
              ${leftAddon ? 'rounded-l-none' : ''}
              ${rightAddon ? 'rounded-r-none' : ''}
              ${className}
            `}
            disabled={disabled}
            aria-invalid={error}
            {...props}
          />
          {rightIcon && !rightAddon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
              {rightIcon}
            </div>
          )}
          {rightAddon && (
            <span className="inline-flex items-center px-3 text-sm text-gray-500 bg-gray-50 border border-l-0 border-gray-300 rounded-r-lg">
              {rightAddon}
            </span>
          )}
        </div>
      )
    }

    return (
      <input
        ref={ref}
        className={`
          ${baseStyles}
          ${stateStyles}
          ${sizeStyles[inputSize]}
          ${className}
        `}
        disabled={disabled}
        aria-invalid={error}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'

// ==================== TEXTAREA ====================

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
  resize?: 'none' | 'vertical' | 'horizontal' | 'both'
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className = '', error, resize = 'vertical', disabled, ...props }, ref) => {
    const resizeStyles = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize',
    }

    return (
      <textarea
        ref={ref}
        className={`
          w-full px-3 py-2 text-sm rounded-lg border bg-white
          min-h-[100px]
          transition-colors duration-150
          placeholder:text-gray-400
          focus:outline-none focus:ring-2 focus:ring-offset-0
          disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
          ${
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
              : 'border-gray-300 focus:border-[#006AFF] focus:ring-[#006AFF]/20'
          }
          ${resizeStyles[resize]}
          ${className}
        `}
        disabled={disabled}
        aria-invalid={error}
        {...props}
      />
    )
  }
)

TextArea.displayName = 'TextArea'

// ==================== SELECT ====================

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
  selectSize?: 'sm' | 'md' | 'lg'
  options: Array<{ value: string; label: string; disabled?: boolean }>
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className = '',
      error,
      selectSize = 'md',
      options,
      placeholder,
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm min-h-[32px]',
      md: 'px-3 py-2 text-sm min-h-[40px]',
      lg: 'px-4 py-3 text-base min-h-[48px]',
    }

    return (
      <div className="relative">
        <select
          ref={ref}
          className={`
            w-full rounded-lg border bg-white
            appearance-none cursor-pointer
            pr-10
            transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-offset-0
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                : 'border-gray-300 focus:border-[#006AFF] focus:ring-[#006AFF]/20'
            }
            ${sizeStyles[selectSize]}
            ${className}
          `}
          disabled={disabled}
          aria-invalid={error}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    )
  }
)

Select.displayName = 'Select'

// ==================== CHECKBOX ====================

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label: string
  description?: string
  error?: boolean
  checkboxSize?: 'sm' | 'md' | 'lg'
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = '', label, description, error, checkboxSize = 'md', disabled, ...props }, ref) => {
    const sizeStyles = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    }

    return (
      <label className={`flex items-start gap-3 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
        <input
          ref={ref}
          type="checkbox"
          className={`
            ${sizeStyles[checkboxSize]}
            rounded border-gray-300
            text-[#006AFF]
            focus:ring-2 focus:ring-[#006AFF]/20 focus:ring-offset-0
            disabled:cursor-not-allowed
            ${error ? 'border-red-300' : ''}
          `}
          disabled={disabled}
          {...props}
        />
        <div className="flex-1">
          <span className={`text-sm font-medium ${error ? 'text-red-600' : 'text-gray-700'}`}>
            {label}
          </span>
          {description && (
            <p className="text-sm text-gray-500 mt-0.5">{description}</p>
          )}
        </div>
      </label>
    )
  }
)

Checkbox.displayName = 'Checkbox'

// ==================== RADIO GROUP ====================

interface RadioOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

interface RadioGroupProps {
  name: string
  options: RadioOption[]
  value?: string
  onChange?: (value: string) => void
  error?: boolean
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export function RadioGroup({
  name,
  options,
  value,
  onChange,
  error,
  orientation = 'vertical',
  className = '',
}: RadioGroupProps) {
  return (
    <div
      className={`
        ${orientation === 'horizontal' ? 'flex flex-wrap gap-4' : 'space-y-3'}
        ${className}
      `}
      role="radiogroup"
    >
      {options.map((option) => (
        <label
          key={option.value}
          className={`
            flex items-start gap-3 cursor-pointer
            ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange?.(option.value)}
            disabled={option.disabled}
            className={`
              w-5 h-5 border-gray-300
              text-[#006AFF]
              focus:ring-2 focus:ring-[#006AFF]/20 focus:ring-offset-0
              disabled:cursor-not-allowed
              ${error ? 'border-red-300' : ''}
            `}
          />
          <div className="flex-1">
            <span className={`text-sm font-medium ${error ? 'text-red-600' : 'text-gray-700'}`}>
              {option.label}
            </span>
            {option.description && (
              <p className="text-sm text-gray-500 mt-0.5">{option.description}</p>
            )}
          </div>
        </label>
      ))}
    </div>
  )
}

// ==================== SEARCH INPUT ====================

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  onClear?: () => void
  isLoading?: boolean
  inputSize?: 'sm' | 'md' | 'lg'
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className = '', onClear, isLoading, inputSize = 'md', value, ...props }, ref) => {
    const hasValue = value && String(value).length > 0

    return (
      <div className="relative">
        <Input
          ref={ref}
          type="search"
          inputSize={inputSize}
          value={value}
          leftIcon={
            isLoading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )
          }
          className={`pr-10 ${className}`}
          {...props}
        />
        {hasValue && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    )
  }
)

SearchInput.displayName = 'SearchInput'
