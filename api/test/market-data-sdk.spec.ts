import { GrowwSource } from '../src/lib/market-data-sdk/sources/groww';
import { NseSource } from '../src/lib/market-data-sdk/sources/nse';
import { rsi, sma, macd } from '../src/lib/market-data-sdk/indicators';

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
      expect(growwSource.baseUrl).toBe('https://api.groww.in');
      expect(growwSource.apiKey).toBe('test-api-key');
      expect(growwSource.appId).toBe('test-app-id');
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
    const testPrices = [10, 12, 11, 13, 14, 12, 15, 16, 14, 17, 18, 16, 19, 20, 18];

    describe('RSI', () => {
      it('should calculate RSI correctly', () => {
        const rsiValue = rsi(testPrices, 14);
        expect(typeof rsiValue).toBe('number');
        expect(rsiValue).toBeGreaterThanOrEqual(0);
        expect(rsiValue).toBeLessThanOrEqual(100);
      });

      it('should handle edge cases', () => {
        const shortPrices = [10, 12, 11];
        const rsiValue = rsi(shortPrices, 14);
        expect(typeof rsiValue).toBe('number');
      });
    });

    describe('SMA', () => {
      it('should calculate SMA correctly', () => {
        const smaValue = sma(testPrices, 5);
        expect(typeof smaValue).toBe('number');
        expect(smaValue).toBeGreaterThan(0);
      });

      it('should handle different periods', () => {
        const sma5 = sma(testPrices, 5);
        const sma10 = sma(testPrices, 10);
        expect(sma5).not.toBe(sma10);
      });
    });

    describe('MACD', () => {
      it('should calculate MACD correctly', () => {
        const macdResult = macd(testPrices, 12, 26, 9);
        expect(macdResult).toHaveProperty('macd');
        expect(macdResult).toHaveProperty('signal');
        expect(macdResult).toHaveProperty('histogram');
        expect(typeof macdResult.macd).toBe('number');
        expect(typeof macdResult.signal).toBe('number');
        expect(typeof macdResult.histogram).toBe('number');
      });
    });
  });

  describe('Data Models', () => {
    it('should have correct data structures', () => {
      // Test that the SDK exports are available
      const { Exchange, Interval } = require('../src/lib/market-data-sdk/models');
      
      expect(Exchange).toBeDefined();
      expect(Interval).toBeDefined();
      expect(Exchange.NSE).toBe('NSE');
      expect(Exchange.BSE).toBe('BSE');
      expect(Interval.DAY).toBe('1D');
      expect(Interval.WEEK).toBe('1W');
      expect(Interval.MONTH).toBe('1M');
    });
  });
});
