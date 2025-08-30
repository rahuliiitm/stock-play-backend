import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Stocks API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
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
        .get('/stocks/RELIANCE/quote')
        .expect(200);

      expect(response.body).toHaveProperty('symbol', 'RELIANCE');
      expect(response.body).toHaveProperty('price');
      expect(response.body).toHaveProperty('asOf');
      expect(typeof response.body.price).toBe('number');
      expect(response.body.price).toBeGreaterThan(0);
    });

    it('should get stock quote for INFY', async () => {
      const response = await request(app.getHttpServer())
        .get('/stocks/INFY/quote')
        .expect(200);

      expect(response.body).toHaveProperty('symbol', 'INFY');
      expect(response.body).toHaveProperty('price');
      expect(response.body).toHaveProperty('asOf');
      expect(typeof response.body.price).toBe('number');
      expect(response.body.price).toBeGreaterThan(0);
    });

    it('should get stock quote for TCS', async () => {
      const response = await request(app.getHttpServer())
        .get('/stocks/TCS/quote')
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
        .get('/stocks/RELIANCE/history?intervalMinutes=1440')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        const candle = response.body[0];
        expect(candle).toHaveProperty('time');
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
        .get('/stocks/INFY/history?intervalMinutes=10080')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        const candle = response.body[0];
        expect(candle).toHaveProperty('time');
        expect(candle).toHaveProperty('open');
        expect(candle).toHaveProperty('high');
        expect(candle).toHaveProperty('low');
        expect(candle).toHaveProperty('close');
        expect(candle).toHaveProperty('volume');
      }
    });
  });

  describe('Stock Indicators', () => {
    it('should calculate indicators for RELIANCE', async () => {
      const response = await request(app.getHttpServer())
        .get('/stocks/RELIANCE/indicators')
        .expect(200);

      expect(response.body).toHaveProperty('rsi');
      expect(response.body).toHaveProperty('ma20');
      expect(response.body).toHaveProperty('macd');
      expect(typeof response.body.rsi).toBe('object');
      expect(typeof response.body.ma20).toBe('object');
      expect(typeof response.body.macd).toBe('object');
    });

    it('should calculate indicators for INFY', async () => {
      const response = await request(app.getHttpServer())
        .get('/stocks/INFY/indicators')
        .expect(200);

      expect(response.body).toHaveProperty('rsi');
      expect(response.body).toHaveProperty('ma20');
      expect(response.body).toHaveProperty('macd');
      expect(typeof response.body.rsi).toBe('object');
      expect(typeof response.body.ma20).toBe('object');
      expect(typeof response.body.macd).toBe('object');
    });
  });
});
