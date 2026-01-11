/**
 * Format phone number as user types
 * Supports US format: (XXX) XXX-XXXX
 */
export function formatPhoneNumber(value: string): string {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '')

  // Limit to 10 digits
  const limited = digits.slice(0, 10)

  // Apply mask based on length
  if (limited.length === 0) {
    return ''
  } else if (limited.length <= 3) {
    return `(${limited}`
  } else if (limited.length <= 6) {
    return `(${limited.slice(0, 3)}) ${limited.slice(3)}`
  } else {
    return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`
  }
}

/**
 * Remove phone mask and return only digits
 */
export function unformatPhoneNumber(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Validate phone number has exactly 10 digits
 */
export function isValidPhoneNumber(value: string): boolean {
  const digits = unformatPhoneNumber(value)
  return digits.length === 10
}
