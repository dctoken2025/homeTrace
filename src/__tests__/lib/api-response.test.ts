import { describe, it, expect } from 'vitest'
import {
  successResponse,
  createdResponse,
  errorResponse,
  paginatedResponse,
  parsePaginationParams,
  parseSortParams,
  ErrorCode,
  Errors,
} from '@/lib/api-response'

describe('API Response Utilities', () => {
  describe('successResponse', () => {
    it('should create a success response with data', async () => {
      const data = { id: '1', name: 'Test' }
      const response = successResponse(data)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data).toEqual(data)
      expect(body.error).toBeUndefined()
    })

    it('should include meta information when provided', async () => {
      const data = [{ id: '1' }, { id: '2' }]
      const meta = { page: 1, limit: 10, total: 100, totalPages: 10 }
      const response = successResponse(data, meta)
      const body = await response.json()

      expect(body.meta).toEqual(meta)
    })

    it('should allow custom status code', async () => {
      const response = successResponse({ ok: true }, undefined, 202)
      expect(response.status).toBe(202)
    })
  })

  describe('createdResponse', () => {
    it('should return 201 status', async () => {
      const data = { id: 'new-id' }
      const response = createdResponse(data)
      const body = await response.json()

      expect(response.status).toBe(201)
      expect(body.success).toBe(true)
      expect(body.data).toEqual(data)
    })
  })

  describe('errorResponse', () => {
    it('should create error response with correct status', async () => {
      const response = errorResponse(ErrorCode.NOT_FOUND, 'Resource not found')
      const body = await response.json()

      expect(response.status).toBe(404)
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('NOT_FOUND')
      expect(body.error.message).toBe('Resource not found')
    })

    it('should include details when provided', async () => {
      const details = { field: 'email', reason: 'invalid format' }
      const response = errorResponse(ErrorCode.VALIDATION_ERROR, 'Validation failed', details)
      const body = await response.json()

      expect(body.error.details).toEqual(details)
    })

    it('should map error codes to correct HTTP status', async () => {
      const testCases = [
        { code: ErrorCode.UNAUTHORIZED, status: 401 },
        { code: ErrorCode.FORBIDDEN, status: 403 },
        { code: ErrorCode.NOT_FOUND, status: 404 },
        { code: ErrorCode.CONFLICT, status: 409 },
        { code: ErrorCode.VALIDATION_ERROR, status: 400 },
        { code: ErrorCode.UNPROCESSABLE, status: 422 },
        { code: ErrorCode.RATE_LIMIT_EXCEEDED, status: 429 },
        { code: ErrorCode.INTERNAL_ERROR, status: 500 },
      ]

      for (const { code, status } of testCases) {
        const response = errorResponse(code, 'Test')
        expect(response.status).toBe(status)
      }
    })
  })

  describe('paginatedResponse', () => {
    it('should include pagination meta', async () => {
      const data = [{ id: '1' }, { id: '2' }]
      const response = paginatedResponse(data, 2, 10, 50)
      const body = await response.json()

      expect(body.meta).toEqual({
        page: 2,
        limit: 10,
        total: 50,
        totalPages: 5,
      })
    })

    it('should calculate totalPages correctly', async () => {
      const response = paginatedResponse([], 1, 10, 25)
      const body = await response.json()

      expect(body.meta.totalPages).toBe(3) // ceil(25/10) = 3
    })
  })

  describe('Errors helpers', () => {
    it('should create unauthorized error', async () => {
      const response = Errors.unauthorized()
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body.error.code).toBe('UNAUTHORIZED')
    })

    it('should create notFound error with resource name', async () => {
      const response = Errors.notFound('User')
      const body = await response.json()

      expect(response.status).toBe(404)
      expect(body.error.message).toBe('User not found')
    })

    it('should create validation error with details', async () => {
      const response = Errors.validationError('Invalid input', { field: 'email' })
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.error.details).toEqual({ field: 'email' })
    })
  })

  describe('parsePaginationParams', () => {
    it('should return default values when no params', () => {
      const params = new URLSearchParams()
      const result = parsePaginationParams(params)

      expect(result).toEqual({ page: 1, limit: 20, skip: 0 })
    })

    it('should parse page and limit', () => {
      const params = new URLSearchParams({ page: '3', limit: '50' })
      const result = parsePaginationParams(params)

      expect(result).toEqual({ page: 3, limit: 50, skip: 100 })
    })

    it('should enforce minimum page of 1', () => {
      const params = new URLSearchParams({ page: '0' })
      const result = parsePaginationParams(params)

      expect(result.page).toBe(1)
    })

    it('should enforce maximum limit of 100', () => {
      const params = new URLSearchParams({ limit: '200' })
      const result = parsePaginationParams(params)

      expect(result.limit).toBe(100)
    })

    it('should calculate skip correctly', () => {
      const params = new URLSearchParams({ page: '5', limit: '20' })
      const result = parsePaginationParams(params)

      expect(result.skip).toBe(80) // (5-1) * 20
    })
  })

  describe('parseSortParams', () => {
    const allowedFields = ['createdAt', 'name', 'price']

    it('should return defaults when no params', () => {
      const params = new URLSearchParams()
      const result = parseSortParams(params, allowedFields)

      expect(result).toEqual({ field: 'createdAt', order: 'desc' })
    })

    it('should parse valid sort field and order', () => {
      const params = new URLSearchParams({ sortBy: 'name', sortOrder: 'asc' })
      const result = parseSortParams(params, allowedFields)

      expect(result).toEqual({ field: 'name', order: 'asc' })
    })

    it('should fallback to default for invalid field', () => {
      const params = new URLSearchParams({ sortBy: 'invalidField' })
      const result = parseSortParams(params, allowedFields)

      expect(result.field).toBe('createdAt')
    })

    it('should fallback to default for invalid order', () => {
      const params = new URLSearchParams({ sortOrder: 'random' })
      const result = parseSortParams(params, allowedFields)

      expect(result.order).toBe('desc')
    })

    it('should use custom defaults', () => {
      const params = new URLSearchParams()
      const result = parseSortParams(params, allowedFields, 'name', 'asc')

      expect(result).toEqual({ field: 'name', order: 'asc' })
    })
  })
})
