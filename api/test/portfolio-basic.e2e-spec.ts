import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Portfolio Basic Functionality (e2e)', () => {
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

  describe('Stock Data', () => {
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
  });

  describe('Leaderboard', () => {
    it('should get global leaderboard', async () => {
      const response = await request(app.getHttpServer())
        .get('/leaderboard/global')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get leaderboard by window', async () => {
      const response = await request(app.getHttpServer())
        .get('/leaderboard/ALL')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Health Check', () => {
    it('should return Hello World!', async () => {
      const response = await request(app.getHttpServer())
        .get('/')
        .expect(200);

      expect(response.text).toBe('Hello World!');
    });
  });

  describe('Authentication', () => {
    it('should reject unauthorized portfolio access', async () => {
      await request(app.getHttpServer())
        .get('/v2/portfolios')
        .expect(401);
    });

    it('should reject unauthorized portfolio creation', async () => {
      await request(app.getHttpServer())
        .post('/v2/portfolios')
        .send({
          name: 'Test Portfolio',
          visibility: 'private'
        })
        .expect(401);
    });
  });
});
