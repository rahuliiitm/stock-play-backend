import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { StocksModule } from '../src/modules/stocks/stocks.module';

describe('Stocks API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [StocksModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Stock Quotes', () => {
    it('should get stock quote for RELIANCE', async () => {
      const response = await request(app.getHttpServer())
        .get('/stocks/quote/RELIANCE')
        .expect(200);

      expect(response.body).toHaveProperty('symbol', 'RELIANCE');
      expect(response.body).toHaveProperty('price');
      expect(response.body).toHaveProperty('asOf');
      expect(typeof response.body.price).toBe('number');
      expect(response.body.price).toBeGreaterThan(0);
    });

    it('should get stock quote for INFY', async () => {
      const response = await request(app.getHttpServer())
        .get('/stocks/quote/INFY')
        .expect(200);

      expect(response.body).toHaveProperty('symbol', 'INFY');
      expect(response.body).toHaveProperty('price');
      expect(response.body).toHaveProperty('asOf');
      expect(typeof response.body.price).toBe('number');
      expect(response.body.price).toBeGreaterThan(0);
    });

    it('should get stock quote for TCS', async () => {
      const response = await request(app.getHttpServer())
        .get('/stocks/quote/TCS')
        .expect(200);

      expect(response.body).toHaveProperty('symbol', 'TCS');
      expect(response.body).toHaveProperty('price');
      expect(response.body).toHaveProperty('asOf');
      expect(typeof response.body.price).toBe('number');
      expect(response.body.price).toBeGreaterThan(0);
    });
  });

  describe('Stock History', () => {
    it('should get stock historical data for RELIANCE', async () => {
      const response = await request(app.getHttpServer())
        .get('/stocks/history/RELIANCE?interval=1M')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        const candle = response.body[0];
        expect(candle).toHaveProperty('timestamp');
        expect(candle).toHaveProperty('open');
        expect(candle).toHaveProperty('high');
        expect(candle).toHaveProperty('low');
        expect(candle).toHaveProperty('close');
        expect(candle).toHaveProperty('volume');
        expect(typeof candle.open).toBe('number');
        expect(typeof candle.high).toBe('number');
        expect(typeof candle.low).toBe('number');
        expect(typeof candle.close).toBe('number');
        expect(typeof candle.volume).toBe('number');
      }
    });

    it('should get stock historical data for INFY', async () => {
      const response = await request(app.getHttpServer())
        .get('/stocks/history/INFY?interval=1W')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        const candle = response.body[0];
        expect(candle).toHaveProperty('timestamp');
        expect(candle).toHaveProperty('open');
        expect(candle).toHaveProperty('high');
        expect(candle).toHaveProperty('low');
        expect(candle).toHaveProperty('close');
        expect(candle).toHaveProperty('volume');
      }
    });
  });

  describe('Stock Indicators', () => {
    it('should calculate RSI for RELIANCE', async () => {
      const response = await request(app.getHttpServer())
        .get('/stocks/indicators/RELIANCE/rsi?period=14')
        .expect(200);

      expect(response.body).toHaveProperty('symbol', 'RELIANCE');
      expect(response.body).toHaveProperty('indicator', 'rsi');
      expect(response.body).toHaveProperty('value');
      expect(typeof response.body.value).toBe('number');
      expect(response.body.value).toBeGreaterThanOrEqual(0);
      expect(response.body.value).toBeLessThanOrEqual(100);
    });

    it('should calculate SMA for INFY', async () => {
      const response = await request(app.getHttpServer())
        .get('/stocks/indicators/INFY/sma?period=20')
        .expect(200);

      expect(response.body).toHaveProperty('symbol', 'INFY');
      expect(response.body).toHaveProperty('indicator', 'sma');
      expect(response.body).toHaveProperty('value');
      expect(typeof response.body.value).toBe('number');
      expect(response.body.value).toBeGreaterThan(0);
    });
  });
});
