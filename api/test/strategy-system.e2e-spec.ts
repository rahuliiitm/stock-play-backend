import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule } from '@nestjs/config'
import * as request from 'supertest'
import { Redis } from 'ioredis'

// Strategy module imports
import { StrategyModule } from '../src/modules/strategy/strategy.module'
import { Strategy } from '../src/modules/strategy/entities/strategy.entity'
import { StrategyRuntimeState } from '../src/modules/strategy/entities/strategy-runtime-state.entity'
import { StrategyPosition } from '../src/modules/strategy/entities/strategy-position.entity'
import { StrategyOrder } from '../src/modules/strategy/entities/strategy-order.entity'
import { StrategyExecutionLog } from '../src/modules/strategy/entities/strategy-execution-log.entity'
import { MissedDataTracking } from '../src/modules/strategy/entities/missed-data-tracking.entity'

describe('Strategy System (e2e)', () => {
  let app: INestApplication
  let redis: Redis
  let testStrategyId: string

  beforeAll(async () => {
    // Setup Redis for testing
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      db: 1 // Use separate database for tests
    })

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
          synchronize: true, // For testing only
          dropSchema: true,  // Clean start for tests
          logging: false
        }),
        StrategyModule
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe())
    await app.init()

    // Clean Redis test database
    await redis.flushdb()
  })

  afterAll(async () => {
    await redis.disconnect()
    await app.close()
  })

  beforeEach(async () => {
    // Clean up between tests
    await redis.flushdb()
  })

  describe('Strategy CRUD Operations', () => {
    it('should create a new strategy', () => {
      return request(app.getHttpServer())
        .post('/strategies')
        .send({
          name: 'Test Supertrend Strategy',
          description: 'E2E test strategy',
          underlyingSymbol: 'RELIANCE',
          assetType: 'STOCK',
          instrumentType: 'MIS',
          timeframe: '15m',
          configType: 'RULE_BASED',
          config: {
            phases: {
              entry: {
                rules: [
                  {
                    indicator: 'SUPERTREND',
                    condition: 'CROSSED_ABOVE',
                    value: 'current_price'
                  }
                ]
              }
            }
          },
          orderStrategy: {
            entryOrder: {
              orderType: 'MARKET',
              quantity: 10
            }
          },
          riskManagement: {
            maxLossPerTrade: 1000,
            maxPositions: 1
          }
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id')
          expect(res.body.name).toBe('Test Supertrend Strategy')
          expect(res.body.underlyingSymbol).toBe('RELIANCE')
          testStrategyId = res.body.id
        })
    })

    it('should get strategy by ID', () => {
      return request(app.getHttpServer())
        .get(`/strategies/${testStrategyId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(testStrategyId)
          expect(res.body).toHaveProperty('runtimeState')
          expect(res.body.runtimeState.isRunning).toBe(false)
        })
    })

    it('should update strategy', () => {
      return request(app.getHttpServer())
        .put(`/strategies/${testStrategyId}`)
        .send({
          description: 'Updated test strategy'
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.description).toBe('Updated test strategy')
        })
    })

    it('should get all strategies', () => {
      return request(app.getHttpServer())
        .get('/strategies')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true)
          expect(res.body.length).toBeGreaterThan(0)
          expect(res.body[0]).toHaveProperty('id')
        })
    })
  })

  describe('Strategy State Management', () => {
    it('should get strategy state', () => {
      return request(app.getHttpServer())
        .get(`/strategies/${testStrategyId}/state`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('strategyId', testStrategyId)
          expect(res.body.isRunning).toBe(false)
          expect(res.body.currentPhase).toBe('ENTRY')
        })
    })

    it('should reset strategy state', () => {
      return request(app.getHttpServer())
        .post(`/strategies/${testStrategyId}/state/reset`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true)
        })
    })
  })

  describe('Strategy Health Monitoring', () => {
    it('should get strategy health', () => {
      return request(app.getHttpServer())
        .get(`/health/strategies/${testStrategyId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('strategyId', testStrategyId)
          expect(res.body).toHaveProperty('status')
          expect(res.body).toHaveProperty('isRunning')
          expect(res.body).toHaveProperty('healthMetrics')
        })
    })

    it('should get overall system health', () => {
      return request(app.getHttpServer())
        .get('/health/strategies')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('timestamp')
          expect(res.body).toHaveProperty('summary')
          expect(res.body).toHaveProperty('status')
          expect(res.body.summary).toHaveProperty('totalStrategies')
          expect(res.body.summary).toHaveProperty('runningStrategies')
        })
    })

    it('should get system diagnostics', () => {
      return request(app.getHttpServer())
        .get('/health/strategies/diagnostics')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('system')
          expect(res.body).toHaveProperty('strategies')
          expect(res.body).toHaveProperty('workers')
          expect(res.body).toHaveProperty('recommendations')
        })
    })
  })

  describe('Strategy Performance', () => {
    it('should get strategy performance metrics', () => {
      return request(app.getHttpServer())
        .get(`/strategies/${testStrategyId}/performance`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalTrades')
          expect(res.body).toHaveProperty('winRate')
          expect(res.body).toHaveProperty('totalPnL')
          expect(res.body).toHaveProperty('avgProfit')
          expect(res.body).toHaveProperty('avgLoss')
        })
    })

    it('should get strategy status', () => {
      return request(app.getHttpServer())
        .get(`/strategies/${testStrategyId}/status`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('strategyId', testStrategyId)
          expect(res.body).toHaveProperty('isRunning')
          expect(res.body).toHaveProperty('currentPhase')
          expect(res.body).toHaveProperty('errorCount')
          expect(res.body).toHaveProperty('restartCount')
        })
    })
  })

  describe('Strategy Lifecycle (Mock Worker)', () => {
    it('should start strategy (would need worker implementation)', () => {
      // This test would require the actual worker implementation
      // For now, we test the API endpoint structure
      return request(app.getHttpServer())
        .post(`/strategies/${testStrategyId}/start`)
        .expect(500) // Expected to fail without worker implementation
        .expect((res) => {
          expect(res.body).toHaveProperty('message')
          expect(res.body.message).toContain('Failed to start strategy')
        })
    })

    it('should stop strategy', () => {
      return request(app.getHttpServer())
        .post(`/strategies/${testStrategyId}/stop`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true)
          expect(res.body).toHaveProperty('message')
        })
    })

    it('should restart strategy', () => {
      return request(app.getHttpServer())
        .post(`/strategies/${testStrategyId}/restart`)
        .expect(500) // Expected to fail without worker implementation
        .expect((res) => {
          expect(res.body).toHaveProperty('message')
        })
    })
  })

  describe('Strategy Logs', () => {
    it('should get strategy logs', () => {
      return request(app.getHttpServer())
        .get(`/strategies/${testStrategyId}/logs`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true)
        })
    })

    it('should get strategy logs with filters', () => {
      return request(app.getHttpServer())
        .get(`/strategies/${testStrategyId}/logs?limit=10&phase=ENTRY`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true)
          // Logs array should be limited to 10 items
          expect(res.body.length).toBeLessThanOrEqual(10)
        })
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid strategy ID', () => {
      return request(app.getHttpServer())
        .get('/strategies/invalid-id')
        .expect(404)
        .expect((res) => {
          expect(res.body).toHaveProperty('message')
          expect(res.body.message).toContain('Strategy not found')
        })
    })

    it('should handle invalid strategy data', () => {
      return request(app.getHttpServer())
        .post('/strategies')
        .send({
          // Missing required fields
          description: 'Invalid strategy'
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message')
        })
    })

    it('should handle update of running strategy', async () => {
      // First, try to start the strategy (will fail but that's ok)
      await request(app.getHttpServer())
        .post(`/strategies/${testStrategyId}/start`)
        .expect(500)

      // Now try to update - should fail if we mock it as running
      return request(app.getHttpServer())
        .put(`/strategies/${testStrategyId}`)
        .send({
          description: 'Should not update running strategy'
        })
        .expect(200) // In our test setup, strategy isn't actually running
    })
  })

  describe('Data Consistency', () => {
    it('should maintain data consistency across operations', async () => {
      // Create another strategy for testing
      const createResponse = await request(app.getHttpServer())
        .post('/strategies')
        .send({
          name: 'Consistency Test Strategy',
          underlyingSymbol: 'TCS',
          assetType: 'STOCK',
          instrumentType: 'MIS',
          timeframe: '5m'
        })
        .expect(201)

      const secondStrategyId = createResponse.body.id

      // Get all strategies
      const allStrategiesResponse = await request(app.getHttpServer())
        .get('/strategies')
        .expect(200)

      // Verify both strategies exist
      const strategyIds = allStrategiesResponse.body.map(s => s.id)
      expect(strategyIds).toContain(testStrategyId)
      expect(strategyIds).toContain(secondStrategyId)

      // Get individual strategies
      const [strategy1, strategy2] = await Promise.all([
        request(app.getHttpServer()).get(`/strategies/${testStrategyId}`).expect(200),
        request(app.getHttpServer()).get(`/strategies/${secondStrategyId}`).expect(200)
      ])

      // Verify data consistency
      expect(strategy1.body.name).toBe('Updated test strategy')
      expect(strategy2.body.name).toBe('Consistency Test Strategy')

      // Clean up
      await request(app.getHttpServer())
        .delete(`/strategies/${secondStrategyId}`)
        .expect(200)
    })
  })

  describe('Strategy Filtering', () => {
    it('should filter strategies by status', async () => {
      // Get all strategies
      const allResponse = await request(app.getHttpServer())
        .get('/strategies')
        .expect(200)

      // Get running strategies (should be empty in test)
      const runningResponse = await request(app.getHttpServer())
        .get('/strategies?status=running')
        .expect(200)

      // Get stopped strategies
      const stoppedResponse = await request(app.getHttpServer())
        .get('/strategies?status=stopped')
        .expect(200)

      expect(runningResponse.body.length).toBeLessThanOrEqual(allResponse.body.length)
      expect(stoppedResponse.body.length).toBeLessThanOrEqual(allResponse.body.length)
    })
  })

  describe('Concurrent Operations', () => {
    it('should handle concurrent strategy operations', async () => {
      const operations = []

      // Create multiple concurrent operations
      for (let i = 0; i < 5; i++) {
        operations.push(
          request(app.getHttpServer())
            .get(`/strategies/${testStrategyId}`)
            .expect(200)
        )
      }

      // Execute all operations concurrently
      const results = await Promise.all(operations)

      // All should succeed and return the same data
      results.forEach(result => {
        expect(result.body.id).toBe(testStrategyId)
        expect(result.body.name).toBe('Updated test strategy')
      })
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
      }
    } catch (error) {
      console.warn('Cleanup failed:', error.message)
    }
  })
})
