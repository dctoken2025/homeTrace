import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Button, { LoadingSpinner, IconButton } from '@/components/ui/Button'

describe('Button Component', () => {
  describe('Base Button', () => {
    it('renders with children', () => {
      render(<Button>Click me</Button>)
      expect(screen.getByRole('button')).toHaveTextContent('Click me')
    })

    it('calls onClick when clicked', () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Click me</Button>)
      fireEvent.click(screen.getByRole('button'))
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('is disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>)
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('is disabled when isLoading is true', () => {
      render(<Button isLoading>Loading</Button>)
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('shows loading spinner when isLoading is true', () => {
      render(<Button isLoading>Submit</Button>)
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('renders with left icon', () => {
      render(
        <Button leftIcon={<span data-testid="left-icon">←</span>}>
          Back
        </Button>
      )
      expect(screen.getByTestId('left-icon')).toBeInTheDocument()
    })

    it('renders with right icon', () => {
      render(
        <Button rightIcon={<span data-testid="right-icon">→</span>}>
          Next
        </Button>
      )
      expect(screen.getByTestId('right-icon')).toBeInTheDocument()
    })

    it('applies primary variant styles by default', () => {
      render(<Button>Primary</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('bg-emerald-600')
    })

    it('applies secondary variant styles', () => {
      render(<Button variant="secondary">Secondary</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('bg-gray-100')
    })

    it('applies danger variant styles', () => {
      render(<Button variant="danger">Delete</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('bg-red-600')
    })

    it('applies fullWidth class when fullWidth is true', () => {
      render(<Button fullWidth>Full Width</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('w-full')
    })

    it('applies custom className', () => {
      render(<Button className="custom-class">Custom</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('custom-class')
    })
  })

  describe('Button Sizes', () => {
    it('applies sm size styles', () => {
      render(<Button size="sm">Small</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('min-h-[32px]')
    })

    it('applies md size styles by default', () => {
      render(<Button>Medium</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('min-h-[40px]')
    })

    it('applies lg size styles', () => {
      render(<Button size="lg">Large</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('min-h-[48px]')
    })
  })
})

describe('LoadingSpinner Component', () => {
  it('renders with default size', () => {
    render(<LoadingSpinner />)
    const svg = document.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg?.getAttribute('class')).toContain('w-5 h-5')
  })

  it('renders with small size', () => {
    render(<LoadingSpinner size="sm" />)
    const svg = document.querySelector('svg')
    expect(svg?.getAttribute('class')).toContain('w-4 h-4')
  })

  it('renders with large size', () => {
    render(<LoadingSpinner size="lg" />)
    const svg = document.querySelector('svg')
    expect(svg?.getAttribute('class')).toContain('w-6 h-6')
  })

  it('applies animate-spin class', () => {
    render(<LoadingSpinner />)
    const svg = document.querySelector('svg')
    expect(svg?.getAttribute('class')).toContain('animate-spin')
  })

  it('applies custom className', () => {
    render(<LoadingSpinner className="text-red-500" />)
    const svg = document.querySelector('svg')
    expect(svg?.getAttribute('class')).toContain('text-red-500')
  })
})

describe('IconButton Component', () => {
  it('renders with children', () => {
    render(
      <IconButton aria-label="Settings">
        <span data-testid="icon">⚙</span>
      </IconButton>
    )
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('requires aria-label prop', () => {
    render(
      <IconButton aria-label="Close button">
        <span>×</span>
      </IconButton>
    )
    expect(screen.getByLabelText('Close button')).toBeInTheDocument()
  })

  it('applies ghost variant by default', () => {
    render(
      <IconButton aria-label="Test">
        <span>T</span>
      </IconButton>
    )
    const button = screen.getByRole('button')
    expect(button.className).toContain('text-gray-500')
  })

  it('applies primary variant styles', () => {
    render(
      <IconButton aria-label="Test" variant="primary">
        <span>T</span>
      </IconButton>
    )
    const button = screen.getByRole('button')
    expect(button.className).toContain('bg-emerald-600')
  })

  it('shows loading spinner when isLoading is true', () => {
    render(
      <IconButton aria-label="Test" isLoading>
        <span>T</span>
      </IconButton>
    )
    const svg = document.querySelector('svg')
    expect(svg?.getAttribute('class')).toContain('animate-spin')
  })

  it('is disabled when isLoading is true', () => {
    render(
      <IconButton aria-label="Test" isLoading>
        <span>T</span>
      </IconButton>
    )
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
