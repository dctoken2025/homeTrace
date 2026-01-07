import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import EmptyState, {
  NoHousesEmpty,
  NoRecordingsEmpty,
  NoSearchResultsEmpty,
  NoBuyersEmpty,
} from '@/components/ui/EmptyState'

describe('EmptyState Component', () => {
  it('renders title', () => {
    render(<EmptyState title="No items found" />)
    expect(screen.getByText('No items found')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(
      <EmptyState
        title="No items"
        description="Start by adding your first item."
      />
    )
    expect(screen.getByText('Start by adding your first item.')).toBeInTheDocument()
  })

  it('renders action button when provided', () => {
    const handleClick = vi.fn()
    render(
      <EmptyState
        title="No items"
        action={{
          label: 'Add Item',
          onClick: handleClick,
        }}
      />
    )
    const button = screen.getByRole('button', { name: 'Add Item' })
    expect(button).toBeInTheDocument()
    fireEvent.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('renders secondary action when provided', () => {
    const handlePrimary = vi.fn()
    const handleSecondary = vi.fn()
    render(
      <EmptyState
        title="No items"
        action={{
          label: 'Add Item',
          onClick: handlePrimary,
        }}
        secondaryAction={{
          label: 'Learn More',
          onClick: handleSecondary,
        }}
      />
    )
    expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Learn More' })).toBeInTheDocument()
  })

  it('renders custom icon when provided', () => {
    render(
      <EmptyState
        title="Custom Icon"
        icon={<span data-testid="custom-icon">🏠</span>}
      />
    )
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })

  it('applies sm size styles', () => {
    render(<EmptyState title="Small" size="sm" />)
    const heading = screen.getByRole('heading')
    expect(heading.className).toContain('text-base')
  })

  it('applies lg size styles', () => {
    render(<EmptyState title="Large" size="lg" />)
    const heading = screen.getByRole('heading')
    expect(heading.className).toContain('text-xl')
  })

  it('applies custom className', () => {
    const { container } = render(
      <EmptyState title="Test" className="custom-class" />
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })
})

describe('Pre-configured Empty States', () => {
  describe('NoHousesEmpty', () => {
    it('renders with correct title', () => {
      render(<NoHousesEmpty onAddHouse={() => {}} />)
      expect(screen.getByText('No houses yet')).toBeInTheDocument()
    })

    it('calls onAddHouse when action is clicked', () => {
      const handleAdd = vi.fn()
      render(<NoHousesEmpty onAddHouse={handleAdd} />)
      fireEvent.click(screen.getByRole('button', { name: 'Add Your First House' }))
      expect(handleAdd).toHaveBeenCalledTimes(1)
    })
  })

  describe('NoRecordingsEmpty', () => {
    it('renders with correct title', () => {
      render(<NoRecordingsEmpty onStartRecording={() => {}} />)
      expect(screen.getByText('No recordings yet')).toBeInTheDocument()
    })

    it('calls onStartRecording when action is clicked', () => {
      const handleStart = vi.fn()
      render(<NoRecordingsEmpty onStartRecording={handleStart} />)
      fireEvent.click(screen.getByRole('button', { name: 'Start Recording' }))
      expect(handleStart).toHaveBeenCalledTimes(1)
    })
  })

  describe('NoSearchResultsEmpty', () => {
    it('renders with correct title', () => {
      render(<NoSearchResultsEmpty onClearSearch={() => {}} />)
      expect(screen.getByText('No results found')).toBeInTheDocument()
    })

    it('calls onClearSearch when action is clicked', () => {
      const handleClear = vi.fn()
      render(<NoSearchResultsEmpty onClearSearch={handleClear} />)
      fireEvent.click(screen.getByRole('button', { name: 'Clear Search' }))
      expect(handleClear).toHaveBeenCalledTimes(1)
    })
  })

  describe('NoBuyersEmpty', () => {
    it('renders with correct title', () => {
      render(<NoBuyersEmpty onInviteBuyer={() => {}} />)
      expect(screen.getByText('No buyers connected')).toBeInTheDocument()
    })

    it('calls onInviteBuyer when action is clicked', () => {
      const handleInvite = vi.fn()
      render(<NoBuyersEmpty onInviteBuyer={handleInvite} />)
      fireEvent.click(screen.getByRole('button', { name: 'Invite a Buyer' }))
      expect(handleInvite).toHaveBeenCalledTimes(1)
    })
  })
})
