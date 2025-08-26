import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Simple E2E Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Health Check', () => {
    it('should return Hello World!', async () => {
      const response = await request(app.getHttpServer())
        .get('/')
        .expect(200);

      expect(response.text).toBe('Hello World!');
    });
  });

  describe('Market Data SDK', () => {
    it('should have market data SDK available', () => {
      // Test that the SDK is properly imported and available
      const { GrowwSource, NseSource } = require('../src/lib/market-data-sdk/sources/groww');
      expect(GrowwSource).toBeDefined();
      expect(NseSource).toBeDefined();
    });

    it('should have technical indicators available', () => {
      const { rsi, sma, macd } = require('../src/lib/market-data-sdk/indicators');
      expect(rsi).toBeDefined();
      expect(sma).toBeDefined();
      expect(macd).toBeDefined();
    });
  });

  describe('Portfolio Value Update Service', () => {
    it('should have portfolio value update service available', () => {
      const { PortfolioValueUpdateService } = require('../src/modules/portfolio/portfolio-value-update.service');
      expect(PortfolioValueUpdateService).toBeDefined();
    });
  });

  describe('Scheduled Jobs', () => {
    it('should have leaderboard refresh service available', () => {
      const { LeaderboardRefreshService } = require('../src/modules/tasks/leaderboard-refresh.service');
      expect(LeaderboardRefreshService).toBeDefined();
    });
  });
});
