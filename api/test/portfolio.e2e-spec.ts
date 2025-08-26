import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Portfolio Management (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let portfolioId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Register a test user and get auth token
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'testpassword123',
        displayName: 'Test User'
      });

    if (registerResponse.status === 201) {
      authToken = registerResponse.body.accessToken;
    } else {
      // Try to login if user already exists
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testpassword123'
        });
      authToken = loginResponse.body.accessToken;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Portfolio CRUD', () => {
    it('should create a new portfolio', async () => {
      const response = await request(app.getHttpServer())
        .post('/v2/portfolios')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Portfolio',
          visibility: 'private',
          initialValueCents: 1000000
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Portfolio');
      expect(response.body.visibility).toBe('private');
      
      portfolioId = response.body.id;
    });

    it('should get user portfolios', async () => {
      const response = await request(app.getHttpServer())
        .get('/v2/portfolios')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should get portfolio details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/v2/portfolios/${portfolioId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(portfolioId);
      expect(response.body.name).toBe('Test Portfolio');
    });
  });

  describe('Holdings Management', () => {
    it('should add stock to portfolio', async () => {
      const response = await request(app.getHttpServer())
        .post(`/v2/portfolios/${portfolioId}/stocks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          symbol: 'RELIANCE',
          quantity: 10,
          exchange: 'NSE'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.symbol).toBe('RELIANCE');
      expect(response.body.quantity).toBe('10');
    });

    it('should remove stock from portfolio', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/v2/portfolios/${portfolioId}/stocks/RELIANCE`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          quantity: 5
        });

      expect(response.status).toBe(200);
    });
  });

  describe('Stock Data', () => {
    it('should get stock quote', async () => {
      const response = await request(app.getHttpServer())
        .get('/stocks/quote/RELIANCE');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('symbol', 'RELIANCE');
      expect(response.body).toHaveProperty('priceCents');
      expect(response.body).toHaveProperty('asOf');
    });

    it('should get stock historical data', async () => {
      const response = await request(app.getHttpServer())
        .get('/stocks/history/RELIANCE?interval=1M');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('timestamp');
        expect(response.body[0]).toHaveProperty('open');
        expect(response.body[0]).toHaveProperty('high');
        expect(response.body[0]).toHaveProperty('low');
        expect(response.body[0]).toHaveProperty('close');
        expect(response.body[0]).toHaveProperty('volume');
      }
    });
  });

  describe('Leaderboard', () => {
    it('should get global leaderboard', async () => {
      const response = await request(app.getHttpServer())
        .get('/leaderboard/global');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get leaderboard by window', async () => {
      const response = await request(app.getHttpServer())
        .get('/leaderboard/ALL');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should delete portfolio', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/v2/portfolios/${portfolioId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(204);
    });
  });
});
