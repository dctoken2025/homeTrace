import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import BottomNav, {
  BuyerBottomNav,
  RealtorBottomNav,
  RecordingFAB,
} from '@/components/ui/BottomNav'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/client',
}))

describe('BottomNav Component', () => {
  const mockItems = [
    {
      href: '/home',
      label: 'Home',
      icon: <span data-testid="home-icon">🏠</span>,
    },
    {
      href: '/settings',
      label: 'Settings',
      icon: <span data-testid="settings-icon">⚙️</span>,
    },
  ]

  it('renders all navigation items', () => {
    render(<BottomNav items={mockItems} />)
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('renders icons for each item', () => {
    render(<BottomNav items={mockItems} />)
    expect(screen.getByTestId('home-icon')).toBeInTheDocument()
    expect(screen.getByTestId('settings-icon')).toBeInTheDocument()
  })

  it('renders navigation with correct role', () => {
    render(<BottomNav items={mockItems} />)
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  it('renders links with correct hrefs', () => {
    render(<BottomNav items={mockItems} />)
    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/home')
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/settings')
  })

  it('applies custom className', () => {
    render(<BottomNav items={mockItems} className="custom-nav" />)
    expect(screen.getByRole('navigation')).toHaveClass('custom-nav')
  })

  it('renders badge when provided', () => {
    const itemsWithBadge = [
      {
        href: '/notifications',
        label: 'Notifications',
        icon: <span>🔔</span>,
        badge: 5,
      },
    ]
    render(<BottomNav items={itemsWithBadge} />)
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('renders 99+ when badge exceeds 99', () => {
    const itemsWithBadge = [
      {
        href: '/notifications',
        label: 'Notifications',
        icon: <span>🔔</span>,
        badge: 150,
      },
    ]
    render(<BottomNav items={itemsWithBadge} />)
    expect(screen.getByText('99+')).toBeInTheDocument()
  })

  it('does not render badge when badge is 0', () => {
    const itemsWithZeroBadge = [
      {
        href: '/notifications',
        label: 'Notifications',
        icon: <span>🔔</span>,
        badge: 0,
      },
    ]
    render(<BottomNav items={itemsWithZeroBadge} />)
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })
})

describe('BuyerBottomNav', () => {
  it('renders buyer navigation items', () => {
    render(<BuyerBottomNav />)
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Houses')).toBeInTheDocument()
    expect(screen.getByText('Visits')).toBeInTheDocument()
    expect(screen.getByText('Profile')).toBeInTheDocument()
  })

  it('has correct navigation links', () => {
    render(<BuyerBottomNav />)
    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/client')
    expect(screen.getByRole('link', { name: /houses/i })).toHaveAttribute('href', '/client/houses')
    expect(screen.getByRole('link', { name: /visits/i })).toHaveAttribute('href', '/client/visits')
    expect(screen.getByRole('link', { name: /profile/i })).toHaveAttribute('href', '/client/profile')
  })
})

describe('RealtorBottomNav', () => {
  it('renders realtor navigation items', () => {
    render(<RealtorBottomNav />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Buyers')).toBeInTheDocument()
    expect(screen.getByText('Houses')).toBeInTheDocument()
    expect(screen.getByText('Profile')).toBeInTheDocument()
  })

  it('has correct navigation links', () => {
    render(<RealtorBottomNav />)
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/realtor')
    expect(screen.getByRole('link', { name: /buyers/i })).toHaveAttribute('href', '/realtor/buyers')
    expect(screen.getByRole('link', { name: /houses/i })).toHaveAttribute('href', '/realtor/houses')
    expect(screen.getByRole('link', { name: /profile/i })).toHaveAttribute('href', '/realtor/profile')
  })
})

describe('RecordingFAB Component', () => {
  it('renders recording button', () => {
    render(<RecordingFAB onClick={() => {}} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('has correct aria-label when not recording', () => {
    render(<RecordingFAB onClick={() => {}} />)
    expect(screen.getByLabelText('Start recording')).toBeInTheDocument()
  })

  it('has correct aria-label when recording', () => {
    render(<RecordingFAB onClick={() => {}} isRecording />)
    expect(screen.getByLabelText('Stop recording')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<RecordingFAB onClick={handleClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is true', () => {
    render(<RecordingFAB onClick={() => {}} disabled />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('applies emerald color when not recording', () => {
    render(<RecordingFAB onClick={() => {}} />)
    const button = screen.getByRole('button')
    expect(button.className).toContain('bg-emerald-600')
  })

  it('applies red color and pulse animation when recording', () => {
    render(<RecordingFAB onClick={() => {}} isRecording />)
    const button = screen.getByRole('button')
    expect(button.className).toContain('bg-red-500')
    expect(button.className).toContain('animate-pulse')
  })
})
