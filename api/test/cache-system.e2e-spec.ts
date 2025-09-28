import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { config } from 'dotenv';
import { StockQuoteCacheService } from '../src/modules/stocks/stock-quote-cache.service';
import { PortfolioValueUpdateService } from '../src/modules/portfolio/portfolio-value-update.service';
import { HoldingsService } from '../src/modules/portfolio/holdings.service';
import { AppModule } from '../src/app.module';

// Load environment variables
config({ path: '.env.development' });

describe('Optimized Cache System (e2e)', () => {
  let app: INestApplication;
  let stockQuoteCache: StockQuoteCacheService;
  let portfolioValueUpdate: PortfolioValueUpdateService;
  let holdingsService: HoldingsService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    stockQuoteCache = moduleFixture.get<StockQuoteCacheService>(
      StockQuoteCacheService,
    );
    portfolioValueUpdate = moduleFixture.get<PortfolioValueUpdateService>(
      PortfolioValueUpdateService,
    );
    holdingsService = moduleFixture.get<HoldingsService>(HoldingsService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Stock Quote Cache Service', () => {
    it('should get unique symbols from holdings', async () => {
      const symbols = await stockQuoteCache.getUniqueSymbols();
      console.log(
        `📊 Found ${symbols.length} unique symbols in all portfolios`,
      );

      expect(Array.isArray(symbols)).toBe(true);
      if (symbols.length > 0) {
        expect(symbols[0]).toBeDefined();
        expect(typeof symbols[0]).toBe('string');
      }
    });

    it('should get cached quote for a symbol', async () => {
      const symbol = 'RELIANCE';
      const quote = await stockQuoteCache.getQuote(symbol);

      console.log(
        `📊 Cached quote for ${symbol}:`,
        JSON.stringify(quote, null, 2),
      );

      expect(quote).toBeDefined();
      expect(quote).toHaveProperty('symbol', symbol);
      expect(quote).toHaveProperty('price');
      expect(typeof quote.price).toBe('number');
      expect(quote.price).toBeGreaterThan(0);
    });

    it('should get multiple cached quotes efficiently', async () => {
      const symbols = ['RELIANCE', 'INFY', 'TCS'];
      const cachedQuotes = await stockQuoteCache.getCachedQuotes(symbols);

      console.log(
        `📊 Retrieved ${cachedQuotes.size} cached quotes for ${symbols.length} symbols`,
      );

      expect(cachedQuotes).toBeInstanceOf(Map);
      expect(cachedQuotes.size).toBeGreaterThan(0);

      for (const [symbol, quote] of cachedQuotes) {
        expect(quote).toHaveProperty('symbol', symbol);
        expect(quote).toHaveProperty('price');
        expect(typeof quote.price).toBe('number');
      }
    });

    it('should update quotes for specific symbols', async () => {
      const symbols = ['RELIANCE', 'INFY'];

      console.log(`📈 Updating quotes for symbols: ${symbols.join(', ')}`);

      await stockQuoteCache.updateSymbolsQuotes(symbols);

      // Verify quotes are cached
      const cachedQuotes = await stockQuoteCache.getCachedQuotes(symbols);
      expect(cachedQuotes.size).toBeGreaterThan(0);

      console.log(
        `✅ Successfully updated quotes for ${cachedQuotes.size} symbols`,
      );
    });

    it('should handle rate limiting gracefully', async () => {
      // Test rate limiting by making many requests
      const symbols = Array.from({ length: 10 }, (_, i) => `TEST${i}`);

      console.log(`🧪 Testing rate limiting with ${symbols.length} symbols`);

      const startTime = Date.now();
      await stockQuoteCache.updateSymbolsQuotes(symbols);
      const endTime = Date.now();

      console.log(
        `⏱️ Rate limiting test completed in ${endTime - startTime}ms`,
      );

      // Should complete without errors
      expect(endTime - startTime).toBeGreaterThan(0);
    });
  });

  describe('Portfolio Value Update Service', () => {
    it('should update portfolio values using cached quotes', async () => {
      console.log('📊 Testing portfolio value update with cached quotes');

      // This will test the optimized update process
      await portfolioValueUpdate.updatePublicPortfolioValues();

      console.log('✅ Portfolio value update completed successfully');
    });

    it('should handle empty portfolios gracefully', async () => {
      console.log('📊 Testing portfolio update with empty portfolios');

      // This should not throw errors even with no portfolios
      await portfolioValueUpdate.updateAllPortfolioValues();

      console.log('✅ Empty portfolio update completed successfully');
    });
  });

  describe('Holdings Service', () => {
    it('should get portfolio holdings with cached quotes', async () => {
      console.log('📊 Testing holdings retrieval with cached quotes');

      // This will test the optimized holdings retrieval
      const holdings = await holdingsService.getAllHoldingsWithSymbols();

      console.log(`📊 Retrieved ${holdings.length} holdings with symbols`);

      expect(Array.isArray(holdings)).toBe(true);

      if (holdings.length > 0) {
        expect(holdings[0]).toHaveProperty('portfolioId');
        expect(holdings[0]).toHaveProperty('symbol');
      }
    });

    it('should get holdings by symbol', async () => {
      const symbol = 'RELIANCE';
      const holdings = await holdingsService.getHoldingsBySymbol(symbol);

      console.log(`📊 Found ${holdings.length} holdings for symbol: ${symbol}`);

      expect(Array.isArray(holdings)).toBe(true);

      if (holdings.length > 0) {
        expect(holdings[0]).toHaveProperty('symbol', symbol);
      }
    });
  });

  describe('Cache Management', () => {
    it('should clear cache for specific symbol', async () => {
      const symbol = 'TEST_CACHE_CLEAR';

      console.log(`🧹 Testing cache clear for symbol: ${symbol}`);

      await stockQuoteCache.clearSymbolCache(symbol);

      console.log('✅ Cache clear completed successfully');
    });

    it('should get quote after cache clear (should fetch from API)', async () => {
      const symbol = 'RELIANCE';

      console.log(`🔄 Testing quote fetch after cache clear for: ${symbol}`);

      // Clear cache first
      await stockQuoteCache.clearSymbolCache(symbol);

      // Get quote (should fetch from API)
      const quote = await stockQuoteCache.getQuote(symbol);

      expect(quote).toBeDefined();
      expect(quote).toHaveProperty('symbol', symbol);

      console.log('✅ Quote fetch after cache clear completed successfully');
    });
  });

  describe('Performance Metrics', () => {
    it('should demonstrate efficient batch processing', async () => {
      const symbols = ['RELIANCE', 'INFY', 'TCS', 'HDFC', 'ICICIBANK'];

      console.log(
        `⚡ Testing batch processing efficiency with ${symbols.length} symbols`,
      );

      const startTime = Date.now();

      // Get cached quotes (should be fast)
      const cachedQuotes = await stockQuoteCache.getCachedQuotes(symbols);

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`⚡ Batch processing completed in ${duration}ms`);
      console.log(`⚡ Retrieved ${cachedQuotes.size} quotes`);

      expect(duration).toBeLessThan(1000); // Should be very fast
      expect(cachedQuotes.size).toBeGreaterThan(0);
    });
  });
});
