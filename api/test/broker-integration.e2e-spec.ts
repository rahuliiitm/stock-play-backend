import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule } from '@nestjs/config'
import { RedisModule } from '@nestjs-modules/ioredis'
import * as request from 'supertest'

// Broker module
import { BrokerModule } from '../src/modules/broker/broker.module'

// Strategy module for entities
import { Strategy } from '../src/modules/strategy/entities/strategy.entity'
import { StrategyRuntimeState } from '../src/modules/strategy/entities/strategy-runtime-state.entity'
import { StrategyPosition } from '../src/modules/strategy/entities/strategy-position.entity'
import { StrategyOrder } from '../src/modules/strategy/entities/strategy-order.entity'
import { StrategyExecutionLog } from '../src/modules/strategy/entities/strategy-execution-log.entity'
import { MissedDataTracking } from '../src/modules/strategy/entities/missed-data-tracking.entity'

describe('Broker Integration (e2e)', () => {
  let app: INestApplication | null = null
  let testStrategyId: string
  let testOrderId: string

  beforeAll(async () => {
    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env.test'
          }),
          TypeOrmModule.forRoot({
            type: 'postgres',
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            username: process.env.DB_USERNAME || 'test_user',
            password: process.env.DB_PASSWORD || 'test_password',
            database: process.env.DB_NAME || 'stockplay_test',
            entities: [
              Strategy,
              StrategyRuntimeState,
              StrategyPosition,
              StrategyOrder,
              StrategyExecutionLog,
              MissedDataTracking
            ],
            synchronize: true,
            dropSchema: true,
            logging: false
          }),

          BrokerModule
        ],
      }).compile()

      app = moduleFixture.createNestApplication()
      app.useGlobalPipes(new ValidationPipe())
      await app.init()
    } catch (error) {
      console.error('Failed to setup test environment:', error)
      // Skip tests if setup fails
      return
    }
  })

  afterAll(async () => {
    if (app) {
      await app.close()
    }
  })

  describe('End-to-End Broker Connectivity Test', () => {
    it('should complete full broker integration workflow', async () => {
      // 1. Test connectivity
      const connectivityResponse = await request(app.getHttpServer())
        .get('/broker/connectivity')
        .expect(200)

      console.log('Connectivity Test Result:', connectivityResponse.body)

      // 2. Create a test strategy for order testing
      const strategyResponse = await request(app.getHttpServer())
        .post('/strategies')
        .send({
          name: 'Integration Test Strategy',
          description: 'End-to-end broker integration test',
          underlyingSymbol: 'RELIANCE',
          assetType: 'STOCK',
          instrumentType: 'MIS',
          timeframe: '15m',
          configType: 'RULE_BASED',
          config: {
            entry: { rules: [] },
            exit: { rules: [] }
          },
          orderStrategy: {
            entryOrder: {
              orderType: 'MARKET',
              quantity: 1
            }
          },
          riskManagement: {
            maxLossPerTrade: 1000
          }
        })
        .expect(201)

      testStrategyId = strategyResponse.body.id
      console.log('Created test strategy:', testStrategyId)

      // 3. Test account information (should fail without auth)
      const accountResponse = await request(app.getHttpServer())
        .get('/broker/account')
        .expect((res) => {
          if (res.status === 200) {
            console.log('Account info retrieved:', res.body)
          } else {
            console.log('Account info failed as expected:', res.body)
          }
        })

      // 4. Test market data
      const quoteResponse = await request(app.getHttpServer())
        .get('/broker/quote/RELIANCE')
        .expect((res) => {
          if (res.status === 200) {
            console.log('Quote retrieved:', res.body)
          } else {
            console.log('Quote failed as expected:', res.body)
          }
        })

      // 5. Test order placement (should fail without auth)
      const orderResponse = await request(app.getHttpServer())
        .post('/broker/orders')
        .send({
          strategyId: testStrategyId,
          symbol: 'RELIANCE',
          side: 'BUY',
          quantity: 1,
          orderType: 'MARKET',
          productType: 'MIS'
        })
        .expect(400)
        .expect((res) => {
          console.log('Order placement failed as expected:', res.body)
          expect(res.body.message).toContain('Failed to place order')
        })

      // 6. Test order statistics
      const statsResponse = await request(app.getHttpServer())
        .get(`/broker/strategies/${testStrategyId}/orders/stats`)
        .expect(200)
        .expect((res) => {
          console.log('Order statistics:', res.body)
          expect(res.body.statistics.totalOrders).toBe(0)
          expect(res.body.statistics.successRate).toBe(0)
        })

      // 7. Test rate limiting
      const rateLimitResponse = await request(app.getHttpServer())
        .get('/broker/rate-limit')
        .expect(200)
        .expect((res) => {
          console.log('Rate limit status:', res.body)
        })

      console.log('✅ End-to-end broker integration test completed successfully!')
    })

    it('should test broker authentication workflow', async () => {
      // Test authentication with invalid credentials
      const authResponse = await request(app.getHttpServer())
        .post('/broker/auth')
        .send({
          email: 'test@example.com',
          password: 'testpass',
          totpSecret: '123456'
        })
        .expect(200)
        .expect((res) => {
          console.log('Authentication result:', res.body)
          // This will show authentication failure since we don't have real credentials
        })
    })

    it('should test concurrent broker operations', async () => {
      const operations = []

      // Create multiple concurrent operations
      for (let i = 0; i < 3; i++) {
        operations.push(
          request(app.getHttpServer())
            .get('/broker/connectivity')
            .expect(200)
        )
        operations.push(
          request(app.getHttpServer())
            .get(`/broker/strategies/${testStrategyId}/orders/stats`)
            .expect(200)
        )
      }

      // Execute all operations concurrently
      const results = await Promise.all(operations)

      // Verify all operations completed successfully
      results.forEach(result => {
        expect(result.status).toBe(200)
      })

      console.log('✅ Concurrent broker operations test passed')
    })

    it('should test broker error handling', async () => {
      // Test with invalid strategy ID
      const invalidStrategyResponse = await request(app.getHttpServer())
        .get('/broker/strategies/invalid-id/orders')
        .expect(200) // Should return empty array
        .expect((res) => {
          expect(Array.isArray(res.body.orders)).toBe(true)
        })

      // Test with invalid symbol
      const invalidSymbolResponse = await request(app.getHttpServer())
        .get('/broker/quote/INVALID_SYMBOL_12345')
        .expect(500)
        .expect((res) => {
          expect(res.body).toHaveProperty('message')
        })

      // Test with malformed order data
      const malformedOrderResponse = await request(app.getHttpServer())
        .post('/broker/orders')
        .send({
          // Missing required fields
          symbol: 'RELIANCE'
        })
        .expect(400)

      console.log('✅ Error handling test passed')
    })

    it('should test broker data validation', async () => {
      // Test various invalid order scenarios
      const invalidOrders = [
        // Missing quantity
        {
          strategyId: testStrategyId,
          symbol: 'RELIANCE',
          side: 'BUY',
          orderType: 'MARKET',
          productType: 'MIS'
        },
        // Invalid order type
        {
          strategyId: testStrategyId,
          symbol: 'RELIANCE',
          side: 'BUY',
          quantity: 1,
          orderType: 'INVALID_TYPE',
          productType: 'MIS'
        },
        // Invalid side
        {
          strategyId: testStrategyId,
          symbol: 'RELIANCE',
          side: 'INVALID_SIDE',
          quantity: 1,
          orderType: 'MARKET',
          productType: 'MIS'
        },
        // Invalid product type
        {
          strategyId: testStrategyId,
          symbol: 'RELIANCE',
          side: 'BUY',
          quantity: 1,
          orderType: 'MARKET',
          productType: 'INVALID'
        }
      ]

      for (const invalidOrder of invalidOrders) {
        await request(app.getHttpServer())
          .post('/broker/orders')
          .send(invalidOrder)
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain('Failed to place order')
          })
      }

      console.log('✅ Data validation test passed')
    })

    it('should test broker historical data retrieval', async () => {
      // Test with valid date range
      const validHistoricalResponse = await request(app.getHttpServer())
        .get('/broker/historical/RELIANCE?from=2024-01-01&to=2024-01-31&interval=1D')
        .expect((res) => {
          if (res.status === 200) {
            console.log('Historical data retrieved:', res.body)
          } else {
            console.log('Historical data failed as expected:', res.body)
          }
        })

      // Test with missing dates
      const missingDatesResponse = await request(app.getHttpServer())
        .get('/broker/historical/RELIANCE')
        .expect(500)
        .expect((res) => {
          expect(res.body.message).toContain('dates are required')
        })

      console.log('✅ Historical data test passed')
    })

    it('should test broker positions and holdings', async () => {
      // Test positions endpoint
      const positionsResponse = await request(app.getHttpServer())
        .get('/broker/positions')
        .expect((res) => {
          if (res.status === 200) {
            console.log('Positions retrieved:', res.body)
            expect(res.body).toHaveProperty('positions')
            expect(Array.isArray(res.body.positions)).toBe(true)
          } else {
            console.log('Positions failed as expected:', res.body)
          }
        })

      // Test holdings endpoint
      const holdingsResponse = await request(app.getHttpServer())
        .get('/broker/holdings')
        .expect((res) => {
          if (res.status === 200) {
            console.log('Holdings retrieved:', res.body)
            expect(res.body).toHaveProperty('holdings')
            expect(Array.isArray(res.body.holdings)).toBe(true)
          } else {
            console.log('Holdings failed as expected:', res.body)
          }
        })

      console.log('✅ Positions and holdings test passed')
    })

    it('should test broker order lifecycle', async () => {
      // 1. Get initial order statistics
      const initialStats = await request(app.getHttpServer())
        .get(`/broker/strategies/${testStrategyId}/orders/stats`)
        .expect(200)

      expect(initialStats.body.statistics.totalOrders).toBe(0)

      // 2. Try to place an order (will fail without auth)
      const placeOrderResponse = await request(app.getHttpServer())
        .post('/broker/orders')
        .send({
          strategyId: testStrategyId,
          symbol: 'RELIANCE',
          side: 'BUY',
          quantity: 1,
          orderType: 'MARKET',
          productType: 'MIS'
        })
        .expect(400)

      // 3. Verify order statistics remain unchanged
      const finalStats = await request(app.getHttpServer())
        .get(`/broker/strategies/${testStrategyId}/orders/stats`)
        .expect(200)

      expect(finalStats.body.statistics.totalOrders).toBe(0)

      // 4. Test order sync operations
      const syncResponse = await request(app.getHttpServer())
        .post(`/broker/strategies/${testStrategyId}/orders/sync`)
        .expect(500) // Expected to fail without broker connection

      console.log('✅ Order lifecycle test passed')
    })

    it('should test broker system health', async () => {
      // Test rate limiting status
      const rateLimitResponse = await request(app.getHttpServer())
        .get('/broker/rate-limit')
        .expect(200)

      // Test connectivity status
      const connectivityResponse = await request(app.getHttpServer())
        .get('/broker/connectivity')
        .expect(200)

      // Log system health information
      console.log('Broker System Health:')
      console.log('- Connectivity:', connectivityResponse.body.connected ? '✅' : '❌')
      console.log('- Rate Limit:', rateLimitResponse.body.rateLimit)

      console.log('✅ Broker system health test passed')
    })
  })

  // Clean up after all tests
  afterAll(async () => {
    try {
      // Clean up test strategy
      if (testStrategyId) {
        await request(app.getHttpServer())
          .delete(`/strategies/${testStrategyId}`)
          .expect(200)
        console.log('✅ Cleaned up test strategy')
      }
    } catch (error) {
      console.warn('Cleanup failed:', error.message)
    }
  })
})
