import { NextResponse } from 'next/server'

// Standard API response format
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  meta?: {
    page?: number
    limit?: number
    total?: number
    totalPages?: number
  }
}

// Error codes enum for consistency
export enum ErrorCode {
  // Authentication errors (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',

  // Authorization errors (403)
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // Validation errors (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Not found errors (404)
  NOT_FOUND = 'NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  HOUSE_NOT_FOUND = 'HOUSE_NOT_FOUND',
  VISIT_NOT_FOUND = 'VISIT_NOT_FOUND',
  RECORDING_NOT_FOUND = 'RECORDING_NOT_FOUND',

  // Conflict errors (409)
  CONFLICT = 'CONFLICT',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  DUPLICATE_EMAIL = 'DUPLICATE_EMAIL',
  HOUSE_ALREADY_ADDED = 'HOUSE_ALREADY_ADDED',

  // Business logic errors (422)
  UNPROCESSABLE = 'UNPROCESSABLE',
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',
  MINIMUM_HOUSES_NOT_MET = 'MINIMUM_HOUSES_NOT_MET',
  REPORT_ALREADY_GENERATING = 'REPORT_ALREADY_GENERATING',

  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Server errors (500)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
}

// HTTP status codes for each error type
const errorStatusMap: Record<ErrorCode, number> = {
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.INVALID_TOKEN]: 401,
  [ErrorCode.TOKEN_EXPIRED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 403,
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_INPUT]: 400,
  [ErrorCode.MISSING_REQUIRED_FIELD]: 400,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.USER_NOT_FOUND]: 404,
  [ErrorCode.HOUSE_NOT_FOUND]: 404,
  [ErrorCode.VISIT_NOT_FOUND]: 404,
  [ErrorCode.RECORDING_NOT_FOUND]: 404,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.ALREADY_EXISTS]: 409,
  [ErrorCode.DUPLICATE_EMAIL]: 409,
  [ErrorCode.HOUSE_ALREADY_ADDED]: 409,
  [ErrorCode.UNPROCESSABLE]: 422,
  [ErrorCode.INVALID_STATE_TRANSITION]: 422,
  [ErrorCode.MINIMUM_HOUSES_NOT_MET]: 422,
  [ErrorCode.REPORT_ALREADY_GENERATING]: 422,
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.EXTERNAL_API_ERROR]: 500,
}

// Success response helper
export function successResponse<T>(
  data: T,
  meta?: ApiResponse['meta'],
  status = 200
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data,
  }

  if (meta) {
    response.meta = meta
  }

  return NextResponse.json(response, { status })
}

// Created response helper (201)
export function createdResponse<T>(data: T): NextResponse<ApiResponse<T>> {
  return successResponse(data, undefined, 201)
}

// No content response helper (204)
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

// Error response helper
export function errorResponse(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>
): NextResponse<ApiResponse<never>> {
  const status = errorStatusMap[code] || 500

  const response: ApiResponse<never> = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  }

  return NextResponse.json(response, { status })
}

// Pagination helper
export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): NextResponse<ApiResponse<T[]>> {
  return successResponse(data, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  })
}

// Common error responses
export const Errors = {
  unauthorized: (message = 'Authentication required') =>
    errorResponse(ErrorCode.UNAUTHORIZED, message),

  forbidden: (message = 'Access denied') =>
    errorResponse(ErrorCode.FORBIDDEN, message),

  notFound: (resource = 'Resource') =>
    errorResponse(ErrorCode.NOT_FOUND, `${resource} not found`),

  validationError: (message: string, details?: Record<string, unknown>) =>
    errorResponse(ErrorCode.VALIDATION_ERROR, message, details),

  conflict: (message: string) =>
    errorResponse(ErrorCode.CONFLICT, message),

  internalError: (message = 'An unexpected error occurred') =>
    errorResponse(ErrorCode.INTERNAL_ERROR, message),

  rateLimitExceeded: (message = 'Too many requests. Please try again later.') =>
    errorResponse(ErrorCode.RATE_LIMIT_EXCEEDED, message),
}

// Parse pagination params from request
export function parsePaginationParams(searchParams: URLSearchParams): {
  page: number
  limit: number
  skip: number
} {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
  const skip = (page - 1) * limit

  return { page, limit, skip }
}

// Parse sort params from request
export function parseSortParams(
  searchParams: URLSearchParams,
  allowedFields: string[],
  defaultField = 'createdAt',
  defaultOrder: 'asc' | 'desc' = 'desc'
): { field: string; order: 'asc' | 'desc' } {
  const field = searchParams.get('sortBy') || defaultField
  const order = (searchParams.get('sortOrder') || defaultOrder) as 'asc' | 'desc'

  return {
    field: allowedFields.includes(field) ? field : defaultField,
    order: ['asc', 'desc'].includes(order) ? order : defaultOrder,
  }
}
