import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { StocksController } from '../src/modules/stocks/stocks.controller';
import { QuotesService } from '../src/modules/stocks/quotes.service';
import { IndicatorsService } from '../src/modules/stocks/indicators.service';
import { SymbolsService } from '../src/modules/stocks/symbols.service';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

// Skips if env not present
const hasGroww =
  !!process.env.GROWW_API_KEY &&
  (!!process.env.GROWW_ACCESS_TOKEN || !!process.env.GROWW_API_SECRET);

const suiteName = hasGroww
  ? 'Stocks (e2e) - Groww'
  : 'Stocks (e2e) - Groww [skipped: missing env]';

describe(suiteName, () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ envFilePath: ['.env.development'] }),
        HttpModule,
        JwtModule.register({}),
      ],
      controllers: [StocksController],
      providers: [
        QuotesService,
        IndicatorsService,
        {
          provide: SymbolsService,
          useValue: {
            list: () => [],
            get: () => null,
            sync: () => Promise.resolve(),
          },
        },
        {
          provide: 'QUOTES_PROVIDER',
          useFactory: () => ({
            getQuote: async (symbol: string) => ({
              symbol,
              price: 140930, // Mock price for RELIANCE
              asOf: new Date().toISOString(),
              source: 'groww',
            }),
            getHistory: async () => [
              {
                time: new Date().toISOString(),
                open: 1409.3,
                high: 1417.0,
                low: 1405.7,
                close: 1409.2,
                volume: 1000000,
              },
            ],
          }),
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  const symbol = 'RELIANCE';

  it('GET /stocks/:symbol/quote returns quote', async () => {
    if (!hasGroww) return;
    const res = await request(app.getHttpServer())
      .get(`/stocks/${symbol}/quote`)
      .expect(200);
    expect(res.body).toHaveProperty('symbol', symbol);
    expect(typeof res.body.price).toBe('number');
  });

  it('GET /stocks/:symbol/history returns candles', async () => {
    if (!hasGroww) return;
    const res = await request(app.getHttpServer())
      .get(`/stocks/${symbol}/history`)
      .query({ intervalMinutes: '1440' })
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length) {
      expect(res.body[0]).toHaveProperty('time');
      expect(res.body[0]).toHaveProperty('open');
    }
  });
});
