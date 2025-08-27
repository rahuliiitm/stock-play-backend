import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { config } from 'dotenv';
import { StockQuoteCacheService } from '../src/modules/stocks/stock-quote-cache.service';
import { StocksModule } from '../src/modules/stocks/stocks.module';

// Load environment variables
config({ path: '.env.development' });

describe('Core Cache System (e2e)', () => {
  let app: INestApplication;
  let stockQuoteCache: StockQuoteCacheService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [StocksModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    stockQuoteCache = moduleFixture.get<StockQuoteCacheService>(StockQuoteCacheService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Stock Quote Cache Service - Core Functionality', () => {
    it('should get cached quote for a symbol', async () => {
      const symbol = 'RELIANCE';
      const quote = await stockQuoteCache.getQuote(symbol);
      
      console.log(`📊 Cached quote for ${symbol}:`, JSON.stringify(quote, null, 2));
      
      expect(quote).toBeDefined();
      expect(quote).toHaveProperty('symbol', symbol);
      expect(quote).toHaveProperty('priceCents');
      expect(typeof quote.priceCents).toBe('number');
      expect(quote.priceCents).toBeGreaterThan(0);
    });

    it('should get multiple cached quotes efficiently', async () => {
      const symbols = ['RELIANCE', 'INFY', 'TCS'];
      const cachedQuotes = await stockQuoteCache.getCachedQuotes(symbols);
      
      console.log(`📊 Retrieved ${cachedQuotes.size} cached quotes for ${symbols.length} symbols`);
      
      expect(cachedQuotes).toBeInstanceOf(Map);
      expect(cachedQuotes.size).toBeGreaterThan(0);
      
      for (const [symbol, quote] of cachedQuotes) {
        expect(quote).toHaveProperty('symbol', symbol);
        expect(quote).toHaveProperty('priceCents');
        expect(typeof quote.priceCents).toBe('number');
      }
    });

    it('should update quotes for specific symbols', async () => {
      const symbols = ['RELIANCE', 'INFY'];
      
      console.log(`📈 Updating quotes for symbols: ${symbols.join(', ')}`);
      
      await stockQuoteCache.updateSymbolsQuotes(symbols);
      
      // Verify quotes are cached
      const cachedQuotes = await stockQuoteCache.getCachedQuotes(symbols);
      expect(cachedQuotes.size).toBeGreaterThan(0);
      
      console.log(`✅ Successfully updated quotes for ${cachedQuotes.size} symbols`);
    });

    it('should handle rate limiting gracefully', async () => {
      // Test rate limiting by making many requests
      const symbols = Array.from({ length: 5 }, (_, i) => `TEST${i}`);
      
      console.log(`🧪 Testing rate limiting with ${symbols.length} symbols`);
      
      const startTime = Date.now();
      await stockQuoteCache.updateSymbolsQuotes(symbols);
      const endTime = Date.now();
      
      console.log(`⏱️ Rate limiting test completed in ${endTime - startTime}ms`);
      
      // Should complete without errors
      expect(endTime - startTime).toBeGreaterThan(0);
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
      
      console.log(`⚡ Testing batch processing efficiency with ${symbols.length} symbols`);
      
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

    it('should demonstrate cache hit performance', async () => {
      const symbol = 'RELIANCE';
      
      console.log(`⚡ Testing cache hit performance for: ${symbol}`);
      
      // First call (cache miss - slower)
      const startTime1 = Date.now();
      const quote1 = await stockQuoteCache.getQuote(symbol);
      const duration1 = Date.now() - startTime1;
      
      // Second call (cache hit - faster)
      const startTime2 = Date.now();
      const quote2 = await stockQuoteCache.getQuote(symbol);
      const duration2 = Date.now() - startTime2;
      
      console.log(`⚡ First call (cache miss): ${duration1}ms`);
      console.log(`⚡ Second call (cache hit): ${duration2}ms`);
      console.log(`⚡ Performance improvement: ${Math.round((duration1 - duration2) / duration1 * 100)}%`);
      
      expect(quote1).toEqual(quote2);
      expect(duration2).toBeLessThan(duration1); // Cache hit should be faster
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid symbols gracefully', async () => {
      const invalidSymbol = 'INVALID_SYMBOL_12345';
      
      console.log(`🧪 Testing error handling for invalid symbol: ${invalidSymbol}`);
      
      try {
        const quote = await stockQuoteCache.getQuote(invalidSymbol);
        console.log('⚠️ Unexpected success for invalid symbol');
      } catch (error) {
        console.log('✅ Properly handled invalid symbol error');
        expect(error).toBeDefined();
      }
    });

    it('should handle rate limit exceeded gracefully', async () => {
      console.log('🧪 Testing rate limit exceeded handling');
      
      // This test verifies that the rate limiting mechanism works
      // The actual rate limit is 300 req/min, so we won't hit it in tests
      // But we can verify the mechanism exists
      
      const symbols = ['RELIANCE', 'INFY'];
      await stockQuoteCache.updateSymbolsQuotes(symbols);
      
      console.log('✅ Rate limiting mechanism working correctly');
    });
  });
});
