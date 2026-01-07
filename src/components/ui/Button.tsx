'use client'

import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      style,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading

    const baseStyles = `
      inline-flex items-center justify-center gap-2
      font-medium rounded-lg
      transition-all duration-150 ease-out
      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      touch-target
    `

    const variants = {
      primary: `
        text-white
        hover:opacity-90 active:opacity-80
      `,
      secondary: `
        bg-gray-100 text-gray-900
        hover:bg-gray-200 active:bg-gray-300
        focus-visible:ring-gray-500
      `,
      outline: `
        border border-gray-300 bg-white text-gray-700
        hover:bg-gray-50 active:bg-gray-100
      `,
      ghost: `
        text-gray-700
        hover:bg-gray-100 active:bg-gray-200
        focus-visible:ring-gray-500
      `,
      danger: `
        bg-red-600 text-white
        hover:bg-red-700 active:bg-red-800
        focus-visible:ring-red-500
      `,
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm min-h-[32px]',
      md: 'px-4 py-2 text-sm min-h-[40px]',
      lg: 'px-6 py-3 text-base min-h-[48px]',
    }

    // Zillow primary blue color
    const primaryStyle = variant === 'primary' ? { background: '#006AFF', ...style } : style
    const outlineRingStyle = variant === 'outline' ? { '--tw-ring-color': '#006AFF', ...primaryStyle } : primaryStyle

    return (
      <button
        ref={ref}
        className={`
          ${baseStyles}
          ${variants[variant]}
          ${sizes[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        style={outlineRingStyle}
        disabled={isDisabled}
        {...props}
      >
        {isLoading ? (
          <>
            <LoadingSpinner size={size === 'lg' ? 'md' : 'sm'} />
            <span>Loading...</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button

// Loading Spinner component
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  return (
    <svg
      className={`animate-spin ${sizes[size]} ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
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
  )
}

// Icon Button variant
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  'aria-label': string
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className = '',
      variant = 'ghost',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      style,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading

    const baseStyles = `
      inline-flex items-center justify-center
      rounded-lg
      transition-all duration-150 ease-out
      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
    `

    const variants = {
      primary: `
        text-white
        hover:opacity-90 active:opacity-80
      `,
      secondary: `
        bg-gray-100 text-gray-600
        hover:bg-gray-200 active:bg-gray-300
        focus-visible:ring-gray-500
      `,
      outline: `
        border border-gray-300 bg-white text-gray-600
        hover:bg-gray-50 active:bg-gray-100
      `,
      ghost: `
        text-gray-500
        hover:bg-gray-100 hover:text-gray-700
        active:bg-gray-200
        focus-visible:ring-gray-500
      `,
      danger: `
        bg-red-600 text-white
        hover:bg-red-700 active:bg-red-800
        focus-visible:ring-red-500
      `,
    }

    const sizes = {
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-12 h-12',
    }

    const iconSizes = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    }

    // Zillow primary blue color
    const primaryStyle = variant === 'primary' ? { background: '#006AFF', ...style } : style

    return (
      <button
        ref={ref}
        className={`
          ${baseStyles}
          ${variants[variant]}
          ${sizes[size]}
          ${className}
        `}
        style={primaryStyle}
        disabled={isDisabled}
        {...props}
      >
        {isLoading ? (
          <LoadingSpinner size={size === 'lg' ? 'md' : 'sm'} />
        ) : (
          <span className={iconSizes[size]}>{children}</span>
        )}
      </button>
    )
  }
)

IconButton.displayName = 'IconButton'
