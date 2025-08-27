import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { config } from 'dotenv';
import { IndicatorsModule } from '../src/modules/indicators/indicators.module';
import { IndicatorProviderRegistryService } from '../src/modules/indicators/indicator-provider-registry.service';

// Load environment variables
config({ path: '.env.development' });

describe('Indicators System (e2e)', () => {
  let app: INestApplication;
  let indicatorRegistry: IndicatorProviderRegistryService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [IndicatorsModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    indicatorRegistry = moduleFixture.get<IndicatorProviderRegistryService>(IndicatorProviderRegistryService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Indicator Provider Registry', () => {
    it('should have registered indicator providers', () => {
      const providers = indicatorRegistry.getAll();
      const providerNames = indicatorRegistry.getNames();
      
      console.log(`📊 Found ${providers.length} indicator providers:`, providerNames);
      
      expect(providers.length).toBeGreaterThan(0);
      expect(providerNames).toContain('RSI');
      expect(providerNames).toContain('SMA');
      expect(providerNames).toContain('MACD');
      expect(providerNames).toContain('BOLLINGER_BANDS');
    });

    it('should provide RSI indicator info', () => {
      const rsiInfo = indicatorRegistry.getProviderInfo('RSI');
      
      console.log('📊 RSI Indicator Info:', JSON.stringify(rsiInfo, null, 2));
      
      expect(rsiInfo).toBeDefined();
      expect(rsiInfo.name).toBe('RSI');
      expect(rsiInfo.requiredParameters).toContain('period');
      expect(rsiInfo.optionalParameters).toContain('overbought');
      expect(rsiInfo.optionalParameters).toContain('oversold');
      expect(rsiInfo.minDataPoints).toBe(14);
    });

    it('should provide SMA indicator info', () => {
      const smaInfo = indicatorRegistry.getProviderInfo('SMA');
      
      console.log('📊 SMA Indicator Info:', JSON.stringify(smaInfo, null, 2));
      
      expect(smaInfo).toBeDefined();
      expect(smaInfo.name).toBe('SMA');
      expect(smaInfo.requiredParameters).toContain('period');
      expect(smaInfo.minDataPoints).toBe(10);
    });

    it('should provide MACD indicator info', () => {
      const macdInfo = indicatorRegistry.getProviderInfo('MACD');
      
      console.log('📊 MACD Indicator Info:', JSON.stringify(macdInfo, null, 2));
      
      expect(macdInfo).toBeDefined();
      expect(macdInfo.name).toBe('MACD');
      expect(macdInfo.requiredParameters).toContain('fastPeriod');
      expect(macdInfo.requiredParameters).toContain('slowPeriod');
      expect(macdInfo.optionalParameters).toContain('signalPeriod');
      expect(macdInfo.minDataPoints).toBe(26);
    });

    it('should provide Bollinger Bands indicator info', () => {
      const bbInfo = indicatorRegistry.getProviderInfo('BOLLINGER_BANDS');
      
      console.log('📊 Bollinger Bands Indicator Info:', JSON.stringify(bbInfo, null, 2));
      
      expect(bbInfo).toBeDefined();
      expect(bbInfo.name).toBe('BOLLINGER_BANDS');
      expect(bbInfo.requiredParameters).toContain('period');
      expect(bbInfo.optionalParameters).toContain('stdDev');
      expect(bbInfo.minDataPoints).toBe(20);
    });

    it('should return null for non-existent indicator', () => {
      const nonExistentInfo = indicatorRegistry.getProviderInfo('NON_EXISTENT');
      expect(nonExistentInfo).toBeNull();
    });

    it('should get all provider info', () => {
      const allInfo = indicatorRegistry.getAllProviderInfo();
      
      console.log('📊 All Indicator Info:', JSON.stringify(allInfo, null, 2));
      
      expect(allInfo).toBeDefined();
      expect(Array.isArray(allInfo)).toBe(true);
      expect(allInfo.length).toBeGreaterThan(0);
      
      // Check that each provider has required fields
      allInfo.forEach(provider => {
        expect(provider).toHaveProperty('name');
        expect(provider).toHaveProperty('description');
        expect(provider).toHaveProperty('requiredParameters');
        expect(provider).toHaveProperty('minDataPoints');
      });
    });
  });

  describe('Indicator Provider Functionality', () => {
    it('should get RSI provider', () => {
      const rsiProvider = indicatorRegistry.get('RSI');
      expect(rsiProvider).toBeDefined();
      expect(rsiProvider.name).toBe('RSI');
    });

    it('should get SMA provider', () => {
      const smaProvider = indicatorRegistry.get('SMA');
      expect(smaProvider).toBeDefined();
      expect(smaProvider.name).toBe('SMA');
    });

    it('should get MACD provider', () => {
      const macdProvider = indicatorRegistry.get('MACD');
      expect(macdProvider).toBeDefined();
      expect(macdProvider.name).toBe('MACD');
    });

    it('should get Bollinger Bands provider', () => {
      const bbProvider = indicatorRegistry.get('BOLLINGER_BANDS');
      expect(bbProvider).toBeDefined();
      expect(bbProvider.name).toBe('BOLLINGER_BANDS');
    });

    it('should return undefined for non-existent provider', () => {
      const nonExistentProvider = indicatorRegistry.get('NON_EXISTENT');
      expect(nonExistentProvider).toBeUndefined();
    });
  });
});
