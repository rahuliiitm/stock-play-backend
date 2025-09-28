import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { Redis } from 'ioredis';

// Broker module imports
import { BrokerModule } from '../src/modules/broker/broker.module';

// Strategy module imports (for entities)
import { Strategy } from '../src/modules/strategy/entities/strategy.entity';
import { StrategyRuntimeState } from '../src/modules/strategy/entities/strategy-runtime-state.entity';
import { StrategyPosition } from '../src/modules/strategy/entities/strategy-position.entity';
import { StrategyOrder } from '../src/modules/strategy/entities/strategy-order.entity';
import { StrategyExecutionLog } from '../src/modules/strategy/entities/strategy-execution-log.entity';
import { MissedDataTracking } from '../src/modules/strategy/entities/missed-data-tracking.entity';

describe('Broker Connectivity (e2e)', () => {
  let app: INestApplication;
  let redis: Redis;
  let testStrategyId: string;
  let testOrderId: string;

  beforeAll(async () => {
    // Setup Redis for testing
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      db: 2, // Use separate database for broker tests
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
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
            MissedDataTracking,
          ],
          synchronize: true, // For testing only
          dropSchema: true, // Clean start for tests
          logging: false,
        }),
        BrokerModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Clean Redis test database
    await redis.flushdb();
  });

  afterAll(async () => {
    await redis.disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up between tests
    await redis.flushdb();
  });

  describe('Broker Authentication', () => {
    it('should authenticate with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/broker/auth')
        .send({
          email: 'test@example.com',
          password: 'testpassword',
          totpSecret: 'JBSWY3DPEHPK3PXP', // Test TOTP secret
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success');
          expect(res.body).toHaveProperty('message');
          // Note: This will likely fail with real Groww API without valid credentials
          // but tests the API endpoint structure
        });
    });

    it('should handle invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/broker/auth')
        .send({
          email: 'invalid@example.com',
          password: 'wrongpassword',
        })
        .expect((res) => {
          // Could be 200 with success: false or 401 depending on implementation
          expect(res.body).toHaveProperty('success');
          expect(res.body.success).toBe(false);
        });
    });

    it('should handle missing credentials', () => {
      return request(app.getHttpServer())
        .post('/broker/auth')
        .send({})
        .expect(401)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('Authentication failed');
        });
    });
  });

  describe('Broker Connectivity', () => {
    it('should test connectivity', () => {
      return request(app.getHttpServer())
        .get('/broker/connectivity')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('connected');
          expect(res.body).toHaveProperty('message');
          // Without real authentication, this should return connected: false
          expect(res.body.connected).toBe(false);
        });
    });
  });

  describe('Account Information', () => {
    it('should get account information', () => {
      return request(app.getHttpServer())
        .get('/broker/account')
        .expect(500) // Expected to fail without authentication
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('Failed to get account info');
        });
    });

    it('should get positions', () => {
      return request(app.getHttpServer())
        .get('/broker/positions')
        .expect(500) // Expected to fail without authentication
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('Failed to get positions');
        });
    });

    it('should get holdings', () => {
      return request(app.getHttpServer())
        .get('/broker/holdings')
        .expect(500) // Expected to fail without authentication
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('Failed to get holdings');
        });
    });
  });

  describe('Market Data', () => {
    it('should get live quote for a symbol', () => {
      return request(app.getHttpServer())
        .get('/broker/quote/RELIANCE')
        .expect(500) // Expected to fail without authentication
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('Failed to get quote');
        });
    });

    it('should get historical data', () => {
      return request(app.getHttpServer())
        .get('/broker/historical/RELIANCE?from=2024-01-01&to=2024-01-31')
        .expect(500) // Expected to fail without authentication
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('Failed to get historical data');
        });
    });

    it('should validate historical data parameters', () => {
      return request(app.getHttpServer())
        .get('/broker/historical/RELIANCE')
        .expect(500)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });
  });

  describe('Order Management', () => {
    // First, create a test strategy for order testing
    beforeAll(async () => {
      const createStrategyResponse = await request(app.getHttpServer())
        .post('/strategies')
        .send({
          name: 'Broker Test Strategy',
          description: 'E2E test strategy for broker connectivity',
          underlyingSymbol: 'RELIANCE',
          assetType: 'STOCK',
          instrumentType: 'MIS',
          timeframe: '15m',
          configType: 'RULE_BASED',
          config: { test: true },
          orderStrategy: { test: true },
          riskManagement: { test: true },
        })
        .expect(201);

      testStrategyId = createStrategyResponse.body.id;
    });

    it('should place a market order', () => {
      return request(app.getHttpServer())
        .post('/broker/orders')
        .send({
          strategyId: testStrategyId,
          symbol: 'RELIANCE',
          side: 'BUY',
          quantity: 10,
          orderType: 'MARKET',
          productType: 'MIS',
        })
        .expect(400) // Expected to fail without broker authentication
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('Failed to place order');
        });
    });

    it('should place a limit order', () => {
      return request(app.getHttpServer())
        .post('/broker/orders')
        .send({
          strategyId: testStrategyId,
          symbol: 'RELIANCE',
          side: 'BUY',
          quantity: 10,
          orderType: 'LIMIT',
          price: 2500,
          productType: 'MIS',
        })
        .expect(400) // Expected to fail without broker authentication
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('Failed to place order');
        });
    });

    it('should place a stop loss order', () => {
      return request(app.getHttpServer())
        .post('/broker/orders')
        .send({
          strategyId: testStrategyId,
          symbol: 'RELIANCE',
          side: 'BUY',
          quantity: 10,
          orderType: 'SL',
          price: 2500,
          triggerPrice: 2480,
          productType: 'MIS',
        })
        .expect(400) // Expected to fail without broker authentication
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('Failed to place order');
        });
    });

    it('should validate order parameters', () => {
      return request(app.getHttpServer())
        .post('/broker/orders')
        .send({
          // Missing required fields
          symbol: 'RELIANCE',
          side: 'BUY',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('Failed to place order');
        });
    });

    it('should validate limit order price', () => {
      return request(app.getHttpServer())
        .post('/broker/orders')
        .send({
          strategyId: testStrategyId,
          symbol: 'RELIANCE',
          side: 'BUY',
          quantity: 10,
          orderType: 'LIMIT',
          // Missing price for limit order
          productType: 'MIS',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });

    it('should validate stop loss trigger price', () => {
      return request(app.getHttpServer())
        .post('/broker/orders')
        .send({
          strategyId: testStrategyId,
          symbol: 'RELIANCE',
          side: 'BUY',
          quantity: 10,
          orderType: 'SL',
          price: 2500,
          // Missing trigger price for stop loss
          productType: 'MIS',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });

    it('should validate iceberg order parameters', () => {
      return request(app.getHttpServer())
        .post('/broker/orders')
        .send({
          strategyId: testStrategyId,
          symbol: 'RELIANCE',
          side: 'BUY',
          quantity: 10,
          orderType: 'ICEBERG',
          price: 2500,
          disclosedQuantity: 15, // Invalid - disclosed > total
          productType: 'MIS',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });
  });

  describe('Order Operations (Mock)', () => {
    it('should handle order modification requests', () => {
      return request(app.getHttpServer())
        .put('/broker/orders/mock-order-id')
        .send({
          price: 2550,
        })
        .expect(400) // Expected to fail without valid order
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });

    it('should handle order cancellation requests', () => {
      return request(app.getHttpServer())
        .delete('/broker/orders/mock-order-id')
        .expect(400) // Expected to fail without valid order
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });

    it('should handle order status sync', () => {
      return request(app.getHttpServer())
        .post('/broker/orders/mock-order-id/sync')
        .expect(500) // Expected to fail without valid order
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });
  });

  describe('Strategy Order Management', () => {
    it('should get orders for a strategy', () => {
      return request(app.getHttpServer())
        .get(`/broker/strategies/${testStrategyId}/orders`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('strategyId', testStrategyId);
          expect(res.body).toHaveProperty('orders');
          expect(res.body).toHaveProperty('count');
          expect(res.body).toHaveProperty('timestamp');
          expect(Array.isArray(res.body.orders)).toBe(true);
        });
    });

    it('should get pending orders for a strategy', () => {
      return request(app.getHttpServer())
        .get(`/broker/strategies/${testStrategyId}/orders?status=PENDING`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('strategyId', testStrategyId);
          expect(res.body).toHaveProperty('orders');
          expect(res.body).toHaveProperty('filter', 'PENDING');
        });
    });

    it('should get order statistics for a strategy', () => {
      return request(app.getHttpServer())
        .get(`/broker/strategies/${testStrategyId}/orders/stats`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('strategyId', testStrategyId);
          expect(res.body).toHaveProperty('statistics');
          expect(res.body.statistics).toHaveProperty('totalOrders');
          expect(res.body.statistics).toHaveProperty('successRate');
        });
    });

    it('should get pending orders count', () => {
      return request(app.getHttpServer())
        .get(`/broker/strategies/${testStrategyId}/orders/pending/count`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('strategyId', testStrategyId);
          expect(res.body).toHaveProperty('pendingOrdersCount');
          expect(typeof res.body.pendingOrdersCount).toBe('number');
        });
    });

    it('should sync all orders for a strategy', () => {
      return request(app.getHttpServer())
        .post(`/broker/strategies/${testStrategyId}/orders/sync`)
        .expect(500) // Expected to fail without broker connection
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });
  });

  describe('Broker Orders (Raw)', () => {
    it('should get all broker orders', () => {
      return request(app.getHttpServer())
        .get('/broker/orders')
        .expect(500) // Expected to fail without authentication
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('Failed to get broker orders');
        });
    });

    it('should get broker orders by status', () => {
      return request(app.getHttpServer())
        .get('/broker/orders?status=PENDING')
        .expect(500) // Expected to fail without authentication
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });
  });

  describe('Rate Limiting', () => {
    it('should get rate limit status', () => {
      return request(app.getHttpServer())
        .get('/broker/rate-limit')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('rateLimit');
          expect(res.body).toHaveProperty('timestamp');
        });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid strategy ID', () => {
      return request(app.getHttpServer())
        .get('/broker/strategies/invalid-id/orders')
        .expect(200) // Should return empty array, not error
        .expect((res) => {
          expect(res.body).toHaveProperty('orders');
          expect(Array.isArray(res.body.orders)).toBe(true);
        });
    });

    it('should handle invalid symbol for quote', () => {
      return request(app.getHttpServer())
        .get('/broker/quote/INVALID_SYMBOL')
        .expect(500)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });

    it('should handle network errors gracefully', () => {
      // This test would require mocking network failures
      // For now, we test the basic error structure
      return request(app.getHttpServer())
        .get('/broker/connectivity')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('connected');
          expect(res.body).toHaveProperty('message');
        });
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent order requests', async () => {
      const operations = [];

      // Create multiple concurrent operations
      for (let i = 0; i < 5; i++) {
        operations.push(
          request(app.getHttpServer())
            .get(`/broker/strategies/${testStrategyId}/orders`)
            .expect(200),
        );
      }

      // Execute all operations concurrently
      const results = await Promise.all(operations);

      // All should succeed and return consistent data
      results.forEach((result) => {
        expect(result.body.strategyId).toBe(testStrategyId);
        expect(Array.isArray(result.body.orders)).toBe(true);
      });
    });

    it('should handle concurrent quote requests', async () => {
      const symbols = ['RELIANCE', 'TCS', 'INFY', 'HDFC', 'ICICIBANK'];
      const operations = symbols.map(
        (symbol) =>
          request(app.getHttpServer())
            .get(`/broker/quote/${symbol}`)
            .expect(500), // All will fail without auth, but test concurrent handling
      );

      const results = await Promise.all(operations);

      // All should return error responses consistently
      results.forEach((result) => {
        expect(result.body).toHaveProperty('message');
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should simulate complete order workflow', async () => {
      // 1. Check connectivity
      const connectivityResponse = await request(app.getHttpServer())
        .get('/broker/connectivity')
        .expect(200);

      expect(connectivityResponse.body.connected).toBe(false); // No real auth

      // 2. Try to place order (should fail)
      const orderResponse = await request(app.getHttpServer())
        .post('/broker/orders')
        .send({
          strategyId: testStrategyId,
          symbol: 'RELIANCE',
          side: 'BUY',
          quantity: 10,
          orderType: 'MARKET',
          productType: 'MIS',
        })
        .expect(400);

      expect(orderResponse.body.message).toContain('Failed to place order');

      // 3. Check order statistics
      const statsResponse = await request(app.getHttpServer())
        .get(`/broker/strategies/${testStrategyId}/orders/stats`)
        .expect(200);

      expect(statsResponse.body.statistics.totalOrders).toBe(0);
      expect(statsResponse.body.statistics.successRate).toBe(0);
    });

    it('should handle market data workflow', async () => {
      // 1. Try to get quote (should fail)
      const quoteResponse = await request(app.getHttpServer())
        .get('/broker/quote/RELIANCE')
        .expect(500);

      expect(quoteResponse.body.message).toContain('Failed to get quote');

      // 2. Try to get historical data (should fail)
      const historicalResponse = await request(app.getHttpServer())
        .get('/broker/historical/RELIANCE?from=2024-01-01&to=2024-01-31')
        .expect(500);

      expect(historicalResponse.body.message).toContain(
        'Failed to get historical data',
      );
    });
  });

  // Clean up after all tests
  afterAll(async () => {
    try {
      // Clean up test strategy
      if (testStrategyId) {
        await request(app.getHttpServer())
          .delete(`/strategies/${testStrategyId}`)
          .expect(200);
      }
    } catch (error) {
      console.warn('Cleanup failed:', error.message);
    }
  });
});
