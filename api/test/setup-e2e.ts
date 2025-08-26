import 'reflect-metadata'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.test' })

// Polyfill crypto for Jest environment
if (typeof global.crypto === 'undefined') {
  global.crypto = require('crypto')
}

// Set test environment variables
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/stockplay_test'
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379/1'

// Increase timeout for database operations
jest.setTimeout(30000)

// Global test setup
beforeAll(async () => {
  console.log('Setting up test environment...')
})

// Global test cleanup
afterAll(async () => {
  console.log('Cleaning up test environment...')
})


