import { GrowwSource } from './lib/market-data-sdk/sources/groww';
import { NseSource } from './lib/market-data-sdk/sources/nse';
import { rsi, sma, macd } from './lib/market-data-sdk/indicators';
import type { Exchange, Interval } from './lib/market-data-sdk/models';

describe('Market Data SDK', () => {
  describe('GrowwSource', () => {
    let growwSource: GrowwSource;

    beforeEach(() => {
      // Mock HTTP functions
      const mockHttpGet = jest.fn();
      const mockHttpPost = jest.fn();
      const mockGetAccessToken = jest.fn().mockResolvedValue('mock-token');

      growwSource = new GrowwSource({
        httpGet: mockHttpGet,
        httpPost: mockHttpPost,
        getAccessToken: mockGetAccessToken,
        baseUrl: 'https://api.groww.in',
        apiKey: 'test-api-key',
        appId: 'test-app-id',
      });
    });

    it('should be instantiated correctly', () => {
      expect(growwSource).toBeDefined();
      // Note: baseUrl, apiKey, appId are private properties, so we test methods instead
    });

    it('should have required methods', () => {
      expect(typeof growwSource.getQuote).toBe('function');
      expect(typeof growwSource.getHistory).toBe('function');
      expect(typeof growwSource.getHoldings).toBe('function');
      expect(typeof growwSource.getPositions).toBe('function');
      expect(typeof growwSource.getOrders).toBe('function');
      expect(typeof growwSource.getMargin).toBe('function');
      expect(typeof growwSource.getInstrumentsMaster).toBe('function');
    });
  });

  describe('NseSource', () => {
    let nseSource: NseSource;

    beforeEach(() => {
      const mockHttpGet = jest.fn();
      nseSource = new NseSource({
        httpGet: mockHttpGet,
      });
    });

    it('should be instantiated correctly', () => {
      expect(nseSource).toBeDefined();
    });

    it('should have required methods', () => {
      expect(typeof nseSource.getQuote).toBe('function');
      expect(typeof nseSource.getHistory).toBe('function');
    });
  });

  describe('Technical Indicators', () => {
    // Create test candles with proper structure (more data for MACD)
    const testCandles = [
      { time: '2024-01-01', open: 10, high: 12, low: 9, close: 11, volume: 1000 },
      { time: '2024-01-02', open: 11, high: 13, low: 10, close: 12, volume: 1100 },
      { time: '2024-01-03', open: 12, high: 14, low: 11, close: 13, volume: 1200 },
      { time: '2024-01-04', open: 13, high: 15, low: 12, close: 14, volume: 1300 },
      { time: '2024-01-05', open: 14, high: 16, low: 13, close: 15, volume: 1400 },
      { time: '2024-01-06', open: 15, high: 17, low: 14, close: 16, volume: 1500 },
      { time: '2024-01-07', open: 16, high: 18, low: 15, close: 17, volume: 1600 },
      { time: '2024-01-08', open: 17, high: 19, low: 16, close: 18, volume: 1700 },
      { time: '2024-01-09', open: 18, high: 20, low: 17, close: 19, volume: 1800 },
      { time: '2024-01-10', open: 19, high: 21, low: 18, close: 20, volume: 1900 },
      { time: '2024-01-11', open: 20, high: 22, low: 19, close: 21, volume: 2000 },
      { time: '2024-01-12', open: 21, high: 23, low: 20, close: 22, volume: 2100 },
      { time: '2024-01-13', open: 22, high: 24, low: 21, close: 23, volume: 2200 },
      { time: '2024-01-14', open: 23, high: 25, low: 22, close: 24, volume: 2300 },
      { time: '2024-01-15', open: 24, high: 26, low: 23, close: 25, volume: 2400 },
      { time: '2024-01-16', open: 25, high: 27, low: 24, close: 26, volume: 2500 },
      { time: '2024-01-17', open: 26, high: 28, low: 25, close: 27, volume: 2600 },
      { time: '2024-01-18', open: 27, high: 29, low: 26, close: 28, volume: 2700 },
      { time: '2024-01-19', open: 28, high: 30, low: 27, close: 29, volume: 2800 },
      { time: '2024-01-20', open: 29, high: 31, low: 28, close: 30, volume: 2900 },
      { time: '2024-01-21', open: 30, high: 32, low: 29, close: 31, volume: 3000 },
      { time: '2024-01-22', open: 31, high: 33, low: 30, close: 32, volume: 3100 },
      { time: '2024-01-23', open: 32, high: 34, low: 31, close: 33, volume: 3200 },
      { time: '2024-01-24', open: 33, high: 35, low: 32, close: 34, volume: 3300 },
      { time: '2024-01-25', open: 34, high: 36, low: 33, close: 35, volume: 3400 },
      { time: '2024-01-26', open: 35, high: 37, low: 34, close: 36, volume: 3500 },
      { time: '2024-01-27', open: 36, high: 38, low: 35, close: 37, volume: 3600 },
      { time: '2024-01-28', open: 37, high: 39, low: 36, close: 38, volume: 3700 },
      { time: '2024-01-29', open: 38, high: 40, low: 37, close: 39, volume: 3800 },
      { time: '2024-01-30', open: 39, high: 41, low: 38, close: 40, volume: 3900 },
      { time: '2024-01-31', open: 40, high: 42, low: 39, close: 41, volume: 4000 },
      { time: '2024-02-01', open: 41, high: 43, low: 40, close: 42, volume: 4100 },
      { time: '2024-02-02', open: 42, high: 44, low: 41, close: 43, volume: 4200 },
      { time: '2024-02-03', open: 43, high: 45, low: 42, close: 44, volume: 4300 },
      { time: '2024-02-04', open: 44, high: 46, low: 43, close: 45, volume: 4400 },
      { time: '2024-02-05', open: 45, high: 47, low: 44, close: 46, volume: 4500 },
      { time: '2024-02-06', open: 46, high: 48, low: 45, close: 47, volume: 4600 },
      { time: '2024-02-07', open: 47, high: 49, low: 46, close: 48, volume: 4700 },
      { time: '2024-02-08', open: 48, high: 50, low: 47, close: 49, volume: 4800 },
      { time: '2024-02-09', open: 49, high: 51, low: 48, close: 50, volume: 4900 },
    ];

    describe('RSI', () => {
      it('should calculate RSI correctly', () => {
        const rsiValue = rsi(testCandles, 14);
        expect(typeof rsiValue).toBe('number');
        expect(rsiValue).toBeGreaterThanOrEqual(0);
        expect(rsiValue).toBeLessThanOrEqual(100);
      });

      it('should handle edge cases', () => {
        const shortCandles = testCandles.slice(0, 3);
        const rsiValue = rsi(shortCandles, 14);
        expect(rsiValue).toBeNull(); // Should return null for insufficient data
      });
    });

    describe('SMA', () => {
      it('should calculate SMA correctly', () => {
        const smaValue = sma(testCandles, 5);
        expect(typeof smaValue).toBe('number');
        expect(smaValue).toBeGreaterThan(0);
      });

      it('should handle different periods', () => {
        const sma5 = sma(testCandles, 5);
        const sma10 = sma(testCandles, 10);
        expect(sma5).not.toBe(sma10);
        expect(sma5).toBeGreaterThan(0);
        expect(sma10).toBeGreaterThan(0);
      });

      it('should return null for insufficient data', () => {
        const shortCandles = testCandles.slice(0, 3);
        const smaValue = sma(shortCandles, 5);
        expect(smaValue).toBeNull();
      });
    });

    describe('MACD', () => {
      it('should calculate MACD correctly', () => {
        const macdResult = macd(testCandles, 12, 26, 9);
        expect(macdResult).not.toBeNull();
        if (macdResult) {
          expect(macdResult).toHaveProperty('macd');
          expect(macdResult).toHaveProperty('signal');
          expect(macdResult).toHaveProperty('histogram');
          expect(typeof macdResult.macd).toBe('number');
          expect(typeof macdResult.signal).toBe('number');
          expect(typeof macdResult.histogram).toBe('number');
        }
      });

      it('should return null for insufficient data', () => {
        const shortCandles = testCandles.slice(0, 10);
        const macdResult = macd(shortCandles, 12, 26, 9);
        expect(macdResult).toBeNull();
      });
    });
  });

  describe('Data Models', () => {
    it('should have correct type definitions', () => {
      // Test that the types are available
      const exchange: Exchange = 'NSE';
      const interval: Interval = 1440; // 1 day in minutes
      
      expect(exchange).toBe('NSE');
      expect(interval).toBe(1440);
    });

    it('should validate Exchange type', () => {
      const validExchanges: Exchange[] = ['NSE', 'BSE', 'POLYGON'];
      validExchanges.forEach(exchange => {
        expect(typeof exchange).toBe('string');
      });
    });

    it('should validate Interval type', () => {
      const validIntervals: Interval[] = [1, 5, 10, 60, 240, 1440, 10080];
      validIntervals.forEach(interval => {
        expect(typeof interval).toBe('number');
      });
    });
  });
});
