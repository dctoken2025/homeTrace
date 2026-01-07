import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ErrorState, {
  NetworkError,
  NotFoundError,
  PermissionError,
  ServerError,
  LoadingError,
} from '@/components/ui/ErrorState'

describe('ErrorState Component', () => {
  it('renders default error title', () => {
    render(<ErrorState />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('renders custom title', () => {
    render(<ErrorState title="Custom Error" />)
    expect(screen.getByText('Custom Error')).toBeInTheDocument()
  })

  it('renders message when provided', () => {
    render(<ErrorState message="An error occurred." />)
    expect(screen.getByText('An error occurred.')).toBeInTheDocument()
  })

  it('renders error object message', () => {
    const error = new Error('Test error message')
    render(<ErrorState error={error} />)
    expect(screen.getByText('Test error message')).toBeInTheDocument()
  })

  it('renders error string', () => {
    render(<ErrorState error="String error message" />)
    expect(screen.getByText('String error message')).toBeInTheDocument()
  })

  it('renders retry button when onRetry is provided', () => {
    const handleRetry = vi.fn()
    render(<ErrorState onRetry={handleRetry} />)
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
  })

  it('calls onRetry when retry button is clicked', () => {
    const handleRetry = vi.fn()
    render(<ErrorState onRetry={handleRetry} />)
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }))
    expect(handleRetry).toHaveBeenCalledTimes(1)
  })

  it('renders custom retry label', () => {
    render(<ErrorState onRetry={() => {}} retryLabel="Reload" />)
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
  })

  it('renders go back button when onGoBack is provided', () => {
    const handleGoBack = vi.fn()
    render(<ErrorState onGoBack={handleGoBack} />)
    expect(screen.getByRole('button', { name: 'Go Back' })).toBeInTheDocument()
  })

  it('calls onGoBack when go back button is clicked', () => {
    const handleGoBack = vi.fn()
    render(<ErrorState onGoBack={handleGoBack} />)
    fireEvent.click(screen.getByRole('button', { name: 'Go Back' }))
    expect(handleGoBack).toHaveBeenCalledTimes(1)
  })

  it('renders both retry and go back buttons', () => {
    render(<ErrorState onRetry={() => {}} onGoBack={() => {}} />)
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go Back' })).toBeInTheDocument()
  })

  it('renders custom icon', () => {
    render(
      <ErrorState
        icon={<span data-testid="custom-icon">!</span>}
      />
    )
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })

  it('applies warning variant', () => {
    render(<ErrorState variant="warning" />)
    expect(screen.getByText('Warning')).toBeInTheDocument()
  })

  it('applies info variant', () => {
    render(<ErrorState variant="info" />)
    expect(screen.getByText('Information')).toBeInTheDocument()
  })

  it('has alert role for accessibility', () => {
    render(<ErrorState />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('shows error details when showDetails is true in development', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    const error = new Error('Test error')
    error.stack = 'Error: Test error\n    at test.js:1:1'

    render(<ErrorState error={error} showDetails />)
    expect(screen.getByText('Show error details')).toBeInTheDocument()

    process.env.NODE_ENV = originalEnv
  })
})

describe('Pre-configured Error States', () => {
  describe('NetworkError', () => {
    it('renders with correct title', () => {
      render(<NetworkError onRetry={() => {}} />)
      expect(screen.getByText('Connection Error')).toBeInTheDocument()
    })

    it('renders retry button', () => {
      render(<NetworkError onRetry={() => {}} />)
      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
    })
  })

  describe('NotFoundError', () => {
    it('renders with correct title', () => {
      render(<NotFoundError onGoBack={() => {}} />)
      expect(screen.getByText('Not Found')).toBeInTheDocument()
    })

    it('renders go back button', () => {
      render(<NotFoundError onGoBack={() => {}} />)
      expect(screen.getByRole('button', { name: 'Go Back' })).toBeInTheDocument()
    })
  })

  describe('PermissionError', () => {
    it('renders with correct title', () => {
      render(<PermissionError onGoBack={() => {}} />)
      expect(screen.getByText('Access Denied')).toBeInTheDocument()
    })

    it('renders go back button', () => {
      render(<PermissionError onGoBack={() => {}} />)
      expect(screen.getByRole('button', { name: 'Go Back' })).toBeInTheDocument()
    })
  })

  describe('ServerError', () => {
    it('renders with correct title', () => {
      render(<ServerError onRetry={() => {}} />)
      expect(screen.getByText('Server Error')).toBeInTheDocument()
    })

    it('renders refresh button', () => {
      render(<ServerError onRetry={() => {}} />)
      expect(screen.getByRole('button', { name: 'Refresh Page' })).toBeInTheDocument()
    })
  })

  describe('LoadingError', () => {
    it('renders with correct title', () => {
      render(<LoadingError onRetry={() => {}} />)
      expect(screen.getByText('Failed to Load')).toBeInTheDocument()
    })

    it('renders retry button', () => {
      render(<LoadingError onRetry={() => {}} />)
      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
    })
  })
})
