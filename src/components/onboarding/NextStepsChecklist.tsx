'use client'

import Link from 'next/link'
import Card from '@/components/ui/Card'

interface ChecklistItem {
  id: string
  label: string
  description: string
  href: string
  completed: boolean
}

interface NextStepsChecklistProps {
  role: 'BUYER' | 'REALTOR'
  stats: {
    hasHouses?: boolean
    hasVisits?: boolean
    hasRecordings?: boolean
    hasDreamProfile?: boolean
    hasReport?: boolean
    hasClients?: boolean
    hasSentInvites?: boolean
  }
}

export default function NextStepsChecklist({ role, stats }: NextStepsChecklistProps) {
  const buyerItems: ChecklistItem[] = [
    {
      id: 'houses',
      label: 'Add your first house',
      description: 'Search for a property to add to your list',
      href: '/client/houses/add',
      completed: stats.hasHouses || false,
    },
    {
      id: 'dream',
      label: 'Define your dream home',
      description: 'Tell our AI what you\'re looking for',
      href: '/client/dream-house',
      completed: stats.hasDreamProfile || false,
    },
    {
      id: 'visits',
      label: 'Schedule a visit',
      description: 'Plan your first house tour',
      href: '/client/calendar',
      completed: stats.hasVisits || false,
    },
    {
      id: 'recordings',
      label: 'Record your impressions',
      description: 'Capture your thoughts during a visit',
      href: '/client/houses',
      completed: stats.hasRecordings || false,
    },
    {
      id: 'report',
      label: 'Generate AI report',
      description: 'Get personalized recommendations',
      href: '/client/reports',
      completed: stats.hasReport || false,
    },
  ]

  const realtorItems: ChecklistItem[] = [
    {
      id: 'invite',
      label: 'Invite your first client',
      description: 'Send an invitation to get started',
      href: '/realtor/invite',
      completed: stats.hasSentInvites || false,
    },
    {
      id: 'clients',
      label: 'Connect with a client',
      description: 'Wait for a client to accept your invite',
      href: '/realtor/clients',
      completed: stats.hasClients || false,
    },
    {
      id: 'houses',
      label: 'Add houses for clients',
      description: 'Recommend properties to your clients',
      href: '/realtor/houses',
      completed: stats.hasHouses || false,
    },
    {
      id: 'schedule',
      label: 'View visit schedule',
      description: 'Check your clients\' upcoming visits',
      href: '/realtor/schedule',
      completed: stats.hasVisits || false,
    },
  ]

  const items = role === 'BUYER' ? buyerItems : realtorItems
  const completedCount = items.filter((item) => item.completed).length
  const progress = Math.round((completedCount / items.length) * 100)

  // Don't show if all items are completed
  if (completedCount === items.length) {
    return null
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Getting Started</h2>
        <span className="text-sm text-gray-500">
          {completedCount}/{items.length} completed
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-200 rounded-full mb-6">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${progress}%`, background: '#006AFF' }}
        />
      </div>

      {/* Checklist */}
      <div className="space-y-3">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.completed ? '#' : item.href}
            className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
              item.completed
                ? 'bg-gray-50 cursor-default'
                : 'bg-white hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
              style={item.completed ? { background: '#E3F2FD', color: '#006AFF' } : { background: '#F3F4F6', color: '#9CA3AF' }}
            >
              {item.completed ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <span className="w-2 h-2 bg-gray-300 rounded-full" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium ${
                  item.completed ? 'text-gray-400 line-through' : 'text-gray-900'
                }`}
              >
                {item.label}
              </p>
              <p className="text-xs text-gray-500 truncate">{item.description}</p>
            </div>
            {!item.completed && (
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}
          </Link>
        ))}
      </div>
    </Card>
  )
}
