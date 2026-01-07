import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  FormField,
  Input,
  TextArea,
  Select,
  Checkbox,
  RadioGroup,
  SearchInput,
} from '@/components/ui/Form'

describe('FormField Component', () => {
  it('renders label when provided', () => {
    render(
      <FormField label="Email">
        <Input />
      </FormField>
    )
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('renders required indicator when required', () => {
    render(
      <FormField label="Email" required>
        <Input />
      </FormField>
    )
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('renders hint when provided and no error', () => {
    render(
      <FormField label="Email" hint="Enter your email address">
        <Input />
      </FormField>
    )
    expect(screen.getByText('Enter your email address')).toBeInTheDocument()
  })

  it('renders error instead of hint when error is provided', () => {
    render(
      <FormField label="Email" hint="Enter your email" error="Invalid email">
        <Input />
      </FormField>
    )
    expect(screen.getByText('Invalid email')).toBeInTheDocument()
    expect(screen.queryByText('Enter your email')).not.toBeInTheDocument()
  })

  it('error has alert role for accessibility', () => {
    render(
      <FormField label="Email" error="Invalid email">
        <Input />
      </FormField>
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email')
  })

  it('renders children', () => {
    render(
      <FormField label="Test">
        <Input data-testid="test-input" />
      </FormField>
    )
    expect(screen.getByTestId('test-input')).toBeInTheDocument()
  })
})

describe('Input Component', () => {
  it('renders input element', () => {
    render(<Input />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('handles value changes', () => {
    const handleChange = vi.fn()
    render(<Input onChange={handleChange} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } })
    expect(handleChange).toHaveBeenCalled()
  })

  it('renders placeholder', () => {
    render(<Input placeholder="Enter text" />)
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
  })

  it('is disabled when disabled prop is true', () => {
    render(<Input disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('applies error styles when error is true', () => {
    render(<Input error />)
    const input = screen.getByRole('textbox')
    expect(input.className).toContain('border-red-300')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('renders left icon', () => {
    render(<Input leftIcon={<span data-testid="left-icon">🔍</span>} />)
    expect(screen.getByTestId('left-icon')).toBeInTheDocument()
  })

  it('renders right icon', () => {
    render(<Input rightIcon={<span data-testid="right-icon">✓</span>} />)
    expect(screen.getByTestId('right-icon')).toBeInTheDocument()
  })

  it('renders left addon', () => {
    render(<Input leftAddon="$" />)
    expect(screen.getByText('$')).toBeInTheDocument()
  })

  it('renders right addon', () => {
    render(<Input rightAddon=".00" />)
    expect(screen.getByText('.00')).toBeInTheDocument()
  })

  it('applies sm size styles', () => {
    render(<Input inputSize="sm" />)
    const input = screen.getByRole('textbox')
    expect(input.className).toContain('min-h-[32px]')
  })

  it('applies lg size styles', () => {
    render(<Input inputSize="lg" />)
    const input = screen.getByRole('textbox')
    expect(input.className).toContain('min-h-[48px]')
  })
})

describe('TextArea Component', () => {
  it('renders textarea element', () => {
    render(<TextArea />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('handles value changes', () => {
    const handleChange = vi.fn()
    render(<TextArea onChange={handleChange} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } })
    expect(handleChange).toHaveBeenCalled()
  })

  it('is disabled when disabled prop is true', () => {
    render(<TextArea disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('applies error styles when error is true', () => {
    render(<TextArea error />)
    const textarea = screen.getByRole('textbox')
    expect(textarea.className).toContain('border-red-300')
    expect(textarea).toHaveAttribute('aria-invalid', 'true')
  })

  it('applies resize-none when resize is none', () => {
    render(<TextArea resize="none" />)
    const textarea = screen.getByRole('textbox')
    expect(textarea.className).toContain('resize-none')
  })
})

describe('Select Component', () => {
  const options = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3', disabled: true },
  ]

  it('renders select element', () => {
    render(<Select options={options} />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('renders all options', () => {
    render(<Select options={options} />)
    expect(screen.getByText('Option 1')).toBeInTheDocument()
    expect(screen.getByText('Option 2')).toBeInTheDocument()
    expect(screen.getByText('Option 3')).toBeInTheDocument()
  })

  it('renders placeholder when provided', () => {
    render(<Select options={options} placeholder="Select an option" />)
    expect(screen.getByText('Select an option')).toBeInTheDocument()
  })

  it('handles value changes', () => {
    const handleChange = vi.fn()
    render(<Select options={options} onChange={handleChange} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'option2' } })
    expect(handleChange).toHaveBeenCalled()
  })

  it('is disabled when disabled prop is true', () => {
    render(<Select options={options} disabled />)
    expect(screen.getByRole('combobox')).toBeDisabled()
  })

  it('applies error styles when error is true', () => {
    render(<Select options={options} error />)
    const select = screen.getByRole('combobox')
    expect(select.className).toContain('border-red-300')
    expect(select).toHaveAttribute('aria-invalid', 'true')
  })
})

describe('Checkbox Component', () => {
  it('renders checkbox with label', () => {
    render(<Checkbox label="Accept terms" />)
    expect(screen.getByText('Accept terms')).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(<Checkbox label="Terms" description="Please read carefully" />)
    expect(screen.getByText('Please read carefully')).toBeInTheDocument()
  })

  it('handles check changes', () => {
    const handleChange = vi.fn()
    render(<Checkbox label="Test" onChange={handleChange} />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(handleChange).toHaveBeenCalled()
  })

  it('is disabled when disabled prop is true', () => {
    render(<Checkbox label="Disabled" disabled />)
    expect(screen.getByRole('checkbox')).toBeDisabled()
  })

  it('applies error styles when error is true', () => {
    render(<Checkbox label="Error" error />)
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox.className).toContain('border-red-300')
  })
})

describe('RadioGroup Component', () => {
  const options = [
    { value: 'small', label: 'Small', description: 'Best for individuals' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large', disabled: true },
  ]

  it('renders all radio options', () => {
    render(<RadioGroup name="size" options={options} />)
    expect(screen.getByText('Small')).toBeInTheDocument()
    expect(screen.getByText('Medium')).toBeInTheDocument()
    expect(screen.getByText('Large')).toBeInTheDocument()
  })

  it('renders option descriptions', () => {
    render(<RadioGroup name="size" options={options} />)
    expect(screen.getByText('Best for individuals')).toBeInTheDocument()
  })

  it('has radiogroup role', () => {
    render(<RadioGroup name="size" options={options} />)
    expect(screen.getByRole('radiogroup')).toBeInTheDocument()
  })

  it('handles value changes', () => {
    const handleChange = vi.fn()
    render(<RadioGroup name="size" options={options} onChange={handleChange} />)
    fireEvent.click(screen.getByLabelText('Medium'))
    expect(handleChange).toHaveBeenCalledWith('medium')
  })

  it('applies selected state based on value', () => {
    render(<RadioGroup name="size" options={options} value="small" />)
    const radios = screen.getAllByRole('radio')
    expect(radios[0]).toBeChecked() // Small
    expect(radios[1]).not.toBeChecked() // Medium
  })
})

describe('SearchInput Component', () => {
  it('renders search input', () => {
    render(<SearchInput />)
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('renders search icon', () => {
    render(<SearchInput />)
    const svg = document.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('shows clear button when value is present and onClear provided', () => {
    render(<SearchInput value="test" onClear={() => {}} />)
    expect(screen.getByLabelText('Clear search')).toBeInTheDocument()
  })

  it('hides clear button when value is empty', () => {
    render(<SearchInput value="" onClear={() => {}} />)
    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument()
  })

  it('calls onClear when clear button is clicked', () => {
    const handleClear = vi.fn()
    render(<SearchInput value="test" onClear={handleClear} />)
    fireEvent.click(screen.getByLabelText('Clear search'))
    expect(handleClear).toHaveBeenCalledTimes(1)
  })

  it('shows loading spinner when isLoading is true', () => {
    render(<SearchInput isLoading />)
    const svg = document.querySelector('svg.animate-spin')
    expect(svg).toBeInTheDocument()
  })
})
