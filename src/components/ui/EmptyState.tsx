'use client'

import { ReactNode } from 'react'
import Button from './Button'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary' | 'outline'
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const defaultIcons = {
  empty: (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  ),
  search: (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  ),
  house: (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  ),
  recording: (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
      />
    </svg>
  ),
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  size = 'md',
  className = '',
}: EmptyStateProps) {
  const sizeStyles = {
    sm: {
      container: 'py-8',
      icon: 'w-12 h-12',
      title: 'text-base',
      description: 'text-sm',
    },
    md: {
      container: 'py-12',
      icon: 'w-16 h-16',
      title: 'text-lg',
      description: 'text-sm',
    },
    lg: {
      container: 'py-16',
      icon: 'w-20 h-20',
      title: 'text-xl',
      description: 'text-base',
    },
  }

  const styles = sizeStyles[size]

  return (
    <div
      className={`
        flex flex-col items-center justify-center text-center
        ${styles.container}
        ${className}
      `}
    >
      {/* Icon */}
      <div
        className={`
          ${styles.icon}
          text-gray-300 mb-4
        `}
      >
        {icon || defaultIcons.empty}
      </div>

      {/* Title */}
      <h3 className={`font-semibold text-gray-900 ${styles.title}`}>
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className={`mt-2 text-gray-500 max-w-sm ${styles.description}`}>
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          {action && (
            <Button
              variant={action.variant || 'primary'}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="outline"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// Pre-configured empty states for common scenarios
export function NoHousesEmpty({ onAddHouse }: { onAddHouse: () => void }) {
  return (
    <EmptyState
      icon={defaultIcons.house}
      title="No houses yet"
      description="Start tracking your house hunting journey by adding your first property."
      action={{
        label: 'Add Your First House',
        onClick: onAddHouse,
      }}
    />
  )
}

export function NoRecordingsEmpty({ onStartRecording }: { onStartRecording: () => void }) {
  return (
    <EmptyState
      icon={defaultIcons.recording}
      title="No recordings yet"
      description="Record your thoughts during house visits to remember what matters most."
      action={{
        label: 'Start Recording',
        onClick: onStartRecording,
      }}
    />
  )
}

export function NoSearchResultsEmpty({ onClearSearch }: { onClearSearch: () => void }) {
  return (
    <EmptyState
      icon={defaultIcons.search}
      title="No results found"
      description="Try adjusting your search or filters to find what you're looking for."
      action={{
        label: 'Clear Search',
        onClick: onClearSearch,
        variant: 'outline',
      }}
    />
  )
}

export function NoBuyersEmpty({ onInviteBuyer }: { onInviteBuyer: () => void }) {
  return (
    <EmptyState
      icon={
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      }
      title="No buyers connected"
      description="Invite buyers to connect and start helping them find their dream home."
      action={{
        label: 'Invite a Buyer',
        onClick: onInviteBuyer,
      }}
    />
  )
}
