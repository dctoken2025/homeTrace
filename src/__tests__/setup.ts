import { beforeAll, afterAll, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Global test setup
beforeAll(() => {
  // Set up test environment variables
  process.env.NODE_ENV = 'test'
  process.env.JWT_SECRET = 'test-jwt-secret-key-minimum-32-characters'
  process.env.JWT_EXPIRES_IN = '7d'
})

afterEach(() => {
  // Clean up React Testing Library after each test
  cleanup()
})

afterAll(() => {
  // Cleanup
})
