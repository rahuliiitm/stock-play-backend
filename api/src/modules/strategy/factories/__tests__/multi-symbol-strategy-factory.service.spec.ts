import { Test, TestingModule } from '@nestjs/testing';
import { MultiSymbolStrategyFactory } from '../multi-symbol-strategy-factory.service';
import { StrategyFactory } from '../strategy-factory.service';
import { MultiSymbolStrategyConfig } from '../../interfaces/multi-symbol-strategy.interface';

describe('MultiSymbolStrategyFactory', () => {
  let service: MultiSymbolStrategyFactory;
  let strategyFactory: StrategyFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MultiSymbolStrategyFactory,
        StrategyFactory,
      ],
    }).compile();

    service = module.get<MultiSymbolStrategyFactory>(MultiSymbolStrategyFactory);
    strategyFactory = module.get<StrategyFactory>(StrategyFactory);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should validate valid multi-symbol configuration', () => {
    const validConfig: MultiSymbolStrategyConfig = {
      strategyName: 'advanced-atr',
      symbols: [
        {
          symbol: 'NIFTY',
          timeframe: '15m',
          strategyConfig: {
            emaFastPeriod: 9,
            emaSlowPeriod: 21,
            rsiEntryLong: 50,
            rsiEntryShort: 50,
            rsiExitLong: 65,
            rsiExitShort: 35,
          },
          riskManagement: {
            maxLots: 15,
            maxLossPct: 0.05,
            positionSizingMode: 'CONSERVATIVE',
          }
        }
      ],
      globalConfig: {
        maxConcurrentPositions: 2,
        maxTotalRisk: 0.08,
      }
    };

    const validation = service.validateMultiSymbolConfig(validConfig);
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should detect missing strategy name', () => {
    const invalidConfig: MultiSymbolStrategyConfig = {
      strategyName: '',
      symbols: [],
      globalConfig: {
        maxConcurrentPositions: 2,
        maxTotalRisk: 0.08,
      }
    };

    const validation = service.validateMultiSymbolConfig(invalidConfig);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('Strategy name is required');
  });

  it('should detect unknown strategy', () => {
    const invalidConfig: MultiSymbolStrategyConfig = {
      strategyName: 'unknown-strategy',
      symbols: [
        {
          symbol: 'NIFTY',
          timeframe: '15m',
          strategyConfig: {},
          riskManagement: {
            maxLots: 15,
            maxLossPct: 0.05,
            positionSizingMode: 'CONSERVATIVE',
          }
        }
      ],
      globalConfig: {
        maxConcurrentPositions: 2,
        maxTotalRisk: 0.08,
      }
    };

    const validation = service.validateMultiSymbolConfig(invalidConfig);
    expect(validation.isValid).toBe(false);
    expect(validation.errors.some(error => error.includes('not found'))).toBe(true);
  });

  it('should detect missing symbols', () => {
    const invalidConfig: MultiSymbolStrategyConfig = {
      strategyName: 'advanced-atr',
      symbols: [],
      globalConfig: {
        maxConcurrentPositions: 2,
        maxTotalRisk: 0.08,
      }
    };

    const validation = service.validateMultiSymbolConfig(invalidConfig);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('At least one symbol is required');
  });

  it('should detect duplicate symbols', () => {
    const invalidConfig: MultiSymbolStrategyConfig = {
      strategyName: 'advanced-atr',
      symbols: [
        {
          symbol: 'NIFTY',
          timeframe: '15m',
          strategyConfig: {},
          riskManagement: {
            maxLots: 15,
            maxLossPct: 0.05,
            positionSizingMode: 'CONSERVATIVE',
          }
        },
        {
          symbol: 'NIFTY',
          timeframe: '15m',
          strategyConfig: {},
          riskManagement: {
            maxLots: 10,
            maxLossPct: 0.03,
            positionSizingMode: 'AGGRESSIVE',
          }
        }
      ],
      globalConfig: {
        maxConcurrentPositions: 2,
        maxTotalRisk: 0.08,
      }
    };

    const validation = service.validateMultiSymbolConfig(invalidConfig);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('Duplicate symbol: NIFTY');
  });

  it('should detect invalid global configuration', () => {
    const invalidConfig: MultiSymbolStrategyConfig = {
      strategyName: 'advanced-atr',
      symbols: [
        {
          symbol: 'NIFTY',
          timeframe: '15m',
          strategyConfig: {},
          riskManagement: {
            maxLots: 15,
            maxLossPct: 0.05,
            positionSizingMode: 'CONSERVATIVE',
          }
        }
      ],
      globalConfig: {
        maxConcurrentPositions: 0, // Invalid
        maxTotalRisk: 1.5, // Invalid
      }
    };

    const validation = service.validateMultiSymbolConfig(invalidConfig);
    expect(validation.isValid).toBe(false);
    expect(validation.errors.some(error => error.includes('Max concurrent positions'))).toBe(true);
    expect(validation.errors.some(error => error.includes('Max total risk'))).toBe(true);
  });

  it('should create multi-symbol strategy instances', async () => {
    const config: MultiSymbolStrategyConfig = {
      strategyName: 'advanced-atr',
      symbols: [
        {
          symbol: 'NIFTY',
          timeframe: '15m',
          strategyConfig: {
            emaFastPeriod: 9,
            emaSlowPeriod: 21,
            rsiEntryLong: 50,
            rsiEntryShort: 50,
            rsiExitLong: 65,
            rsiExitShort: 35,
          },
          riskManagement: {
            maxLots: 15,
            maxLossPct: 0.05,
            positionSizingMode: 'CONSERVATIVE',
          }
        },
        {
          symbol: 'BANKNIFTY',
          timeframe: '15m',
          strategyConfig: {
            emaFastPeriod: 5,
            emaSlowPeriod: 13,
            rsiEntryLong: 40,
            rsiEntryShort: 60,
            rsiExitLong: 80,
            rsiExitShort: 20,
          },
          riskManagement: {
            maxLots: 10,
            maxLossPct: 0.03,
            positionSizingMode: 'AGGRESSIVE',
          }
        }
      ],
      globalConfig: {
        maxConcurrentPositions: 2,
        maxTotalRisk: 0.08,
      }
    };

    const instances = await service.createMultiSymbolStrategy(config);
    
    expect(instances).toHaveLength(2);
    expect(instances[0].getSymbol()).toBe('NIFTY');
    expect(instances[1].getSymbol()).toBe('BANKNIFTY');
    expect(instances[0].getStrategyName()).toBe('advanced-atr');
    expect(instances[1].getStrategyName()).toBe('advanced-atr');
  });

  it('should get available strategies', () => {
    const strategies = service.getAvailableStrategies();
    expect(strategies).toContain('advanced-atr');
    expect(strategies).toContain('ema-gap-atr');
    expect(strategies).toContain('nifty-options');
  });

  it('should get strategy info', () => {
    const info = service.getStrategyInfo('advanced-atr');
    expect(info.name).toBe('advanced-atr');
    expect(info.version).toBe('1.0.0');
    expect(info.description).toBe('Advanced ATR Strategy with Supertrend and pyramiding');
  });
});


