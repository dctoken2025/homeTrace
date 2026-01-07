import { describe, it, expect } from 'vitest'
import {
  formatPrice,
  formatAddress,
  formatSqft,
  getStatusLabel,
  getStatusColor,
  transformPropertyToHouse,
  PropertySearchResult,
  PropertyAddress,
} from '@/lib/realty-api'

describe('Realty API Utilities', () => {
  describe('formatPrice', () => {
    it('formats price with dollar sign and commas', () => {
      expect(formatPrice(500000)).toBe('$500,000')
      expect(formatPrice(1250000)).toBe('$1,250,000')
      expect(formatPrice(99999)).toBe('$99,999')
    })

    it('handles small prices', () => {
      expect(formatPrice(1000)).toBe('$1,000')
      expect(formatPrice(100)).toBe('$100')
    })

    it('handles zero', () => {
      expect(formatPrice(0)).toBe('$0')
    })
  })

  describe('formatAddress', () => {
    it('formats address correctly', () => {
      const address: PropertyAddress = {
        line: '123 Main St',
        city: 'Los Angeles',
        state_code: 'CA',
        state: 'California',
        postal_code: '90001',
        country: 'US',
        lat: 34.0522,
        lon: -118.2437,
      }

      expect(formatAddress(address)).toBe('123 Main St, Los Angeles, CA 90001')
    })
  })

  describe('formatSqft', () => {
    it('formats square feet with commas', () => {
      expect(formatSqft(2500)).toBe('2,500')
      expect(formatSqft(12345)).toBe('12,345')
      expect(formatSqft(500)).toBe('500')
    })
  })

  describe('getStatusLabel', () => {
    it('returns correct label for each status', () => {
      expect(getStatusLabel('for_sale')).toBe('For Sale')
      expect(getStatusLabel('sold')).toBe('Sold')
      expect(getStatusLabel('off_market')).toBe('Off Market')
      expect(getStatusLabel('pending')).toBe('Pending')
    })

    it('returns original value for unknown status', () => {
      expect(getStatusLabel('unknown')).toBe('unknown')
    })
  })

  describe('getStatusColor', () => {
    it('returns correct colors for each status', () => {
      expect(getStatusColor('for_sale')).toContain('emerald')
      expect(getStatusColor('sold')).toContain('gray')
      expect(getStatusColor('off_market')).toContain('amber')
      expect(getStatusColor('pending')).toContain('blue')
    })

    it('returns gray for unknown status', () => {
      expect(getStatusColor('unknown')).toContain('gray')
    })
  })

  describe('transformPropertyToHouse', () => {
    it('transforms property search result to house format', () => {
      const property: PropertySearchResult = {
        property_id: 'prop-123',
        listing_id: 'list-123',
        status: 'for_sale',
        list_price: 750000,
        list_date: '2024-01-15',
        last_update_date: '2024-01-20',
        property_type: 'single_family',
        address: {
          line: '456 Oak Ave',
          city: 'San Francisco',
          state_code: 'CA',
          state: 'California',
          postal_code: '94102',
          country: 'US',
          lat: 37.7749,
          lon: -122.4194,
        },
        photos: [
          { href: 'https://example.com/photo1.jpg' },
          { href: 'https://example.com/photo2.jpg' },
        ],
        description: {
          beds: 3,
          baths: 2,
          sqft: 1800,
          lot_sqft: 5000,
          year_built: 1990,
          garage: 2,
          stories: 2,
          type: 'single_family',
        },
      }

      const result = transformPropertyToHouse(property)

      expect(result.externalId).toBe('prop-123')
      expect(result.address).toBe('456 Oak Ave, San Francisco, CA 94102')
      expect(result.city).toBe('San Francisco')
      expect(result.state).toBe('CA')
      expect(result.zipCode).toBe('94102')
      expect(result.latitude).toBe(37.7749)
      expect(result.longitude).toBe(-122.4194)
      expect(result.price).toBe(750000)
      expect(result.bedrooms).toBe(3)
      expect(result.bathrooms).toBe(2)
      expect(result.sqft).toBe(1800)
      expect(result.yearBuilt).toBe(1990)
      expect(result.propertyType).toBe('single_family')
      expect(result.listingStatus).toBe('for_sale')
      expect(result.images).toEqual([
        'https://example.com/photo1.jpg',
        'https://example.com/photo2.jpg',
      ])
    })

    it('handles missing optional fields', () => {
      const property: PropertySearchResult = {
        property_id: 'prop-456',
        listing_id: 'list-456',
        status: 'for_sale',
        list_price: 500000,
        list_date: '2024-01-15',
        last_update_date: '2024-01-20',
        address: {
          line: '789 Pine St',
          city: 'Seattle',
          state_code: 'WA',
          state: 'Washington',
          postal_code: '98101',
          country: 'US',
          lat: 47.6062,
          lon: -122.3321,
        },
      }

      const result = transformPropertyToHouse(property)

      expect(result.externalId).toBe('prop-456')
      expect(result.bedrooms).toBeNull()
      expect(result.bathrooms).toBeNull()
      expect(result.sqft).toBeNull()
      expect(result.yearBuilt).toBeNull()
      expect(result.images).toEqual([])
    })
  })
})
