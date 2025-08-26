import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET) should return Hello World!', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/leaderboard/global (GET) should return global leaderboard', () => {
    return request(app.getHttpServer())
      .get('/leaderboard/global')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('/stocks/quote/RELIANCE (GET) should return stock quote', () => {
    return request(app.getHttpServer())
      .get('/stocks/quote/RELIANCE')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('symbol');
        expect(res.body).toHaveProperty('priceCents');
        expect(res.body).toHaveProperty('asOf');
      });
  });
});
