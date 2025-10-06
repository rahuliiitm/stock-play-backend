import { Test, TestingModule } from '@nestjs/testing';
import { StrategyFactory } from '../strategy-factory.service';
import { EmaGapAtrStrategyService } from '../../services/ema-gap-atr-strategy.service';
import { AdvancedATRStrategyService } from '../../services/advanced-atr-strategy.service';
import { NiftyOptionSellingService } from '../../services/nifty-option-selling.service';

describe('StrategyFactory', () => {
  let service: StrategyFactory;
  let emaGapAtrStrategy: EmaGapAtrStrategyService;
  let advancedATRStrategy: AdvancedATRStrategyService;
  let niftyOptionStrategy: NiftyOptionSellingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StrategyFactory,
        EmaGapAtrStrategyService,
        AdvancedATRStrategyService,
        NiftyOptionSellingService,
      ],
    }).compile();

    service = module.get<StrategyFactory>(StrategyFactory);
    emaGapAtrStrategy = module.get<EmaGapAtrStrategyService>(EmaGapAtrStrategyService);
    advancedATRStrategy = module.get<AdvancedATRStrategyService>(AdvancedATRStrategyService);
    niftyOptionStrategy = module.get<NiftyOptionSellingService>(NiftyOptionSellingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should register all available strategies', () => {
    const strategies = service.listStrategies();
    expect(strategies).toContain('ema-gap-atr');
    expect(strategies).toContain('advanced-atr');
    expect(strategies).toContain('nifty-options');
    expect(strategies).toHaveLength(3);
  });

  it('should get strategy by name', () => {
    const strategy = service.getStrategy('advanced-atr');
    expect(strategy).toBeDefined();
    expect(strategy.name).toBe('advanced-atr');
    expect(strategy.version).toBe('1.0.0');
  });

  it('should throw error for unknown strategy', () => {
    expect(() => service.getStrategy('unknown-strategy')).toThrow('Strategy \'unknown-strategy\' not found');
  });

  it('should check if strategy exists', () => {
    expect(service.hasStrategy('advanced-atr')).toBe(true);
    expect(service.hasStrategy('unknown-strategy')).toBe(false);
  });

  it('should get strategy info', () => {
    const info = service.getStrategyInfo('advanced-atr');
    expect(info.name).toBe('advanced-atr');
    expect(info.version).toBe('1.0.0');
    expect(info.description).toBe('Advanced ATR Strategy with Supertrend and pyramiding');
  });

  it('should validate strategy configuration', async () => {
    const validConfig = {
      symbol: 'NIFTY',
      timeframe: '15m',
      emaFastPeriod: 9,
      emaSlowPeriod: 21,
      atrPeriod: 14,
      rsiPeriod: 14,
      rsiEntryLong: 50,
      rsiEntryShort: 50,
      rsiExitLong: 70,
      rsiExitShort: 30,
    };

    const strategy = service.getStrategy('ema-gap-atr');
    const validation = strategy.validateConfig(validConfig);
    
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should detect invalid configuration', async () => {
    const invalidConfig = {
      symbol: 'NIFTY',
      // Missing required fields
    };

    const strategy = service.getStrategy('ema-gap-atr');
    const validation = strategy.validateConfig(invalidConfig);
    
    expect(validation.isValid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it('should get default configuration', () => {
    const strategy = service.getStrategy('advanced-atr');
    const defaultConfig = strategy.getDefaultConfig();
    
    expect(defaultConfig.symbol).toBe('NIFTY');
    expect(defaultConfig.timeframe).toBe('15m');
    expect(defaultConfig.emaFastPeriod).toBe(9);
    expect(defaultConfig.emaSlowPeriod).toBe(21);
  });

  it('should evaluate strategy with valid configuration', async () => {
    const strategy = service.getStrategy('advanced-atr');
    const config = strategy.getDefaultConfig();
    
    const mockCandles = [
      { timestamp: Date.now(), open: 100, high: 105, low: 95, close: 102, volume: 1000 },
      { timestamp: Date.now(), open: 102, high: 108, low: 98, close: 106, volume: 1200 },
    ];

    const evaluation = await strategy.evaluate(config, mockCandles);
    
    expect(evaluation).toBeDefined();
    expect(evaluation.signals).toBeDefined();
    expect(Array.isArray(evaluation.signals)).toBe(true);
  });
});


