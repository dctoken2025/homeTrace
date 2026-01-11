/**
 * Client-safe utility functions for formatting
 * These can be safely imported in Client Components
 */

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price)
}

export function formatSqft(sqft: number): string {
  return new Intl.NumberFormat('en-US').format(sqft)
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    for_sale: 'For Sale',
    sold: 'Sold',
    off_market: 'Off Market',
    pending: 'Pending',
  }
  return labels[status] || status
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    for_sale: 'bg-[#E3F2FD] text-[#006AFF]',
    sold: 'bg-gray-100 text-gray-800',
    off_market: 'bg-amber-100 text-amber-800',
    pending: 'bg-[#BBDEFB] text-[#0D47A1]',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}
