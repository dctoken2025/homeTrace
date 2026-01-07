'use client'

import { ReactNode } from 'react'

// ==================== BASE SKELETON ====================

interface SkeletonProps {
  className?: string
  animate?: boolean
}

export function Skeleton({ className = '', animate = true }: SkeletonProps) {
  return (
    <div
      className={`bg-gray-200 rounded ${animate ? 'animate-pulse' : ''} ${className}`}
      aria-hidden="true"
    />
  )
}

// ==================== TEXT SKELETON ====================

interface SkeletonTextProps {
  lines?: number
  lastLineWidth?: 'full' | 'three-quarters' | 'half'
  className?: string
}

export function SkeletonText({
  lines = 3,
  lastLineWidth = 'three-quarters',
  className = '',
}: SkeletonTextProps) {
  const lastLineWidths = {
    full: 'w-full',
    'three-quarters': 'w-3/4',
    half: 'w-1/2',
  }

  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={`h-4 ${
            index === lines - 1 ? lastLineWidths[lastLineWidth] : 'w-full'
          }`}
        />
      ))}
    </div>
  )
}

// ==================== AVATAR SKELETON ====================

interface SkeletonAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function SkeletonAvatar({ size = 'md', className = '' }: SkeletonAvatarProps) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  }

  return (
    <Skeleton className={`rounded-full ${sizes[size]} ${className}`} />
  )
}

// ==================== IMAGE SKELETON ====================

interface SkeletonImageProps {
  aspectRatio?: '1:1' | '4:3' | '16:9' | '3:2'
  className?: string
}

export function SkeletonImage({
  aspectRatio = '16:9',
  className = '',
}: SkeletonImageProps) {
  const aspectRatios = {
    '1:1': 'aspect-square',
    '4:3': 'aspect-[4/3]',
    '16:9': 'aspect-video',
    '3:2': 'aspect-[3/2]',
  }

  return (
    <div className={`relative overflow-hidden ${aspectRatios[aspectRatio]} ${className}`}>
      <Skeleton className="absolute inset-0 w-full h-full rounded-lg" />
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          className="w-10 h-10 text-gray-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    </div>
  )
}

// ==================== CARD SKELETON ====================

interface SkeletonCardProps {
  hasImage?: boolean
  hasAvatar?: boolean
  lines?: number
  className?: string
}

export function SkeletonCard({
  hasImage = true,
  hasAvatar = false,
  lines = 2,
  className = '',
}: SkeletonCardProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {hasImage && <SkeletonImage aspectRatio="16:9" />}
      <div className="p-4">
        {hasAvatar && (
          <div className="flex items-center gap-3 mb-4">
            <SkeletonAvatar size="md" />
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        )}
        <Skeleton className="h-5 w-3/4 mb-2" />
        <SkeletonText lines={lines} />
      </div>
    </div>
  )
}

// ==================== LIST SKELETON ====================

interface SkeletonListItemProps {
  hasAvatar?: boolean
  hasImage?: boolean
  lines?: number
  className?: string
}

export function SkeletonListItem({
  hasAvatar = true,
  hasImage = false,
  lines = 2,
  className = '',
}: SkeletonListItemProps) {
  return (
    <div className={`flex gap-4 p-4 ${className}`} aria-hidden="true">
      {hasAvatar && <SkeletonAvatar size="lg" />}
      {hasImage && <Skeleton className="w-16 h-16 rounded-lg flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <Skeleton className="h-4 w-2/3 mb-2" />
        {lines > 1 && <Skeleton className="h-3 w-full mb-1" />}
        {lines > 2 && <Skeleton className="h-3 w-1/2" />}
      </div>
      <Skeleton className="w-6 h-6 rounded flex-shrink-0" />
    </div>
  )
}

interface SkeletonListProps {
  count?: number
  hasAvatar?: boolean
  hasImage?: boolean
  lines?: number
  divided?: boolean
  className?: string
}

export function SkeletonList({
  count = 5,
  hasAvatar = true,
  hasImage = false,
  lines = 2,
  divided = true,
  className = '',
}: SkeletonListProps) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>
          <SkeletonListItem
            hasAvatar={hasAvatar}
            hasImage={hasImage}
            lines={lines}
          />
          {divided && index < count - 1 && (
            <div className="border-b border-gray-100 mx-4" />
          )}
        </div>
      ))}
    </div>
  )
}

// ==================== HOUSE CARD SKELETON ====================

export function SkeletonHouseCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <SkeletonImage aspectRatio="3:2" />
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-2/3 mb-3" />
        <div className="flex gap-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  )
}

// ==================== GRID SKELETON ====================

interface SkeletonGridProps {
  count?: number
  columns?: 1 | 2 | 3 | 4
  children?: ReactNode
  className?: string
}

export function SkeletonGrid({
  count = 6,
  columns = 3,
  children,
  className = '',
}: SkeletonGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  }

  return (
    <div className={`grid gap-6 ${gridCols[columns]} ${className}`} aria-hidden="true">
      {children ||
        Array.from({ length: count }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
    </div>
  )
}

// ==================== TABLE SKELETON ====================

interface SkeletonTableProps {
  rows?: number
  columns?: number
  hasHeader?: boolean
  className?: string
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
  hasHeader = true,
  className = '',
}: SkeletonTableProps) {
  return (
    <div className={`overflow-hidden ${className}`} aria-hidden="true">
      <table className="w-full">
        {hasHeader && (
          <thead>
            <tr className="border-b border-gray-200">
              {Array.from({ length: columns }).map((_, index) => (
                <th key={index} className="p-4 text-left">
                  <Skeleton className="h-4 w-20" />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-gray-100">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="p-4">
                  <Skeleton
                    className={`h-4 ${
                      colIndex === 0 ? 'w-32' : colIndex === columns - 1 ? 'w-16' : 'w-24'
                    }`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ==================== RECORDING SKELETON ====================

export function SkeletonRecording({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}
      aria-hidden="true"
    >
      <div className="flex items-start gap-3">
        <Skeleton className="w-16 h-16 rounded-lg flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-12 rounded-full" />
          </div>
          <Skeleton className="h-8 w-full rounded-full mb-2" />
          <SkeletonText lines={2} />
        </div>
      </div>
    </div>
  )
}

// ==================== PAGE SKELETON ====================

interface SkeletonPageProps {
  hasHeader?: boolean
  hasSidebar?: boolean
  children?: ReactNode
}

export function SkeletonPage({
  hasHeader = true,
  hasSidebar = false,
  children,
}: SkeletonPageProps) {
  return (
    <div className="min-h-screen bg-gray-50" aria-hidden="true">
      {hasHeader && (
        <header className="bg-white border-b border-gray-200 h-16 px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="w-8 h-8 rounded" />
            <Skeleton className="w-32 h-6" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <SkeletonAvatar />
          </div>
        </header>
      )}
      <div className="flex">
        {hasSidebar && (
          <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)] p-4">
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          </aside>
        )}
        <main className="flex-1 p-6">
          {children || (
            <div className="space-y-6">
              <Skeleton className="h-8 w-48" />
              <SkeletonGrid count={6} />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
