import { config } from 'dotenv'
import { join } from 'path'
import { TestDatabaseSetup } from './database-setup'

// Load test environment variables
config({ path: join(__dirname, '../.env.development') })

// Polyfill crypto for Node.js
if (typeof global.crypto === 'undefined') {
  global.crypto = require('crypto')
}

// Set test environment
process.env.NODE_ENV = 'test'

// Use PostgreSQL for testing (same as production)
process.env.DB_HOST = process.env.DB_HOST || 'localhost'
process.env.DB_PORT = process.env.DB_PORT || '5432'
process.env.DB_USERNAME = process.env.DB_USERNAME || 'rjain'
process.env.DB_PASSWORD = process.env.DB_PASSWORD || ''
process.env.DB_NAME = process.env.DB_NAME || 'stockplay'
process.env.DATABASE_URL = process.env.DATABASE_URL || `postgresql://${process.env.DB_USERNAME}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

console.log('Setting up test environment...')
console.log('Database URL:', process.env.DATABASE_URL)
console.log('Redis URL:', process.env.REDIS_URL)

// Global test setup
beforeAll(async () => {
  try {
    // Initialize test database
    await TestDatabaseSetup.createTestDatabase()
    console.log('Test environment setup complete')
  } catch (error) {
    console.error('Failed to setup test database:', error)
    throw error
  }
})

// Global test cleanup
afterAll(async () => {
  try {
    // Clean up test database
    await TestDatabaseSetup.resetTestDatabase()
    await TestDatabaseSetup.closeTestDatabase()
    console.log('Test environment cleanup complete')
  } catch (error) {
    console.error('Failed to cleanup test database:', error)
  }
})


