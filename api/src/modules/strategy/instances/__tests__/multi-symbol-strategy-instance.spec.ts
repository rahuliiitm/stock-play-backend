import { Test, TestingModule } from '@nestjs/testing';
import { MultiSymbolStrategyInstance } from '../multi-symbol-strategy-instance';
import { IStrategy, StrategyConfig, StrategyEvaluation } from '../../interfaces/strategy.interface';
import { SymbolRiskManagement, GlobalStrategyConfig } from '../../interfaces/multi-symbol-strategy.interface';

describe('MultiSymbolStrategyInstance', () => {
  let instance: MultiSymbolStrategyInstance;
  let mockStrategy: IStrategy;
  let mockConfig: Record<string, any>;
  let mockRiskManagement: SymbolRiskManagement;
  let mockGlobalConfig: GlobalStrategyConfig;

  beforeEach(() => {
    mockStrategy = {
      name: 'test-strategy',
      version: '1.0.0',
      description: 'Test Strategy',
      evaluate: jest.fn(),
      validateConfig: jest.fn(),
      getDefaultConfig: jest.fn(),
    };

    mockConfig = {
      emaFastPeriod: 9,
      emaSlowPeriod: 21,
      rsiEntryLong: 50,
      rsiEntryShort: 50,
      rsiExitLong: 65,
      rsiExitShort: 35,
    };

    mockRiskManagement = {
      maxLots: 15,
      maxLossPct: 0.05,
      positionSizingMode: 'CONSERVATIVE',
      stopLossPct: 0.02,
      takeProfitPct: 0.03,
    };

    mockGlobalConfig = {
      maxConcurrentPositions: 2,
      maxTotalRisk: 0.08,
      correlationLimit: 0.7,
    };

    instance = new MultiSymbolStrategyInstance(
      'NIFTY',
      mockStrategy,
      mockConfig,
      mockRiskManagement,
      mockGlobalConfig,
      'CSV',
      'MOCK'
    );
  });

  it('should be defined', () => {
    expect(instance).toBeDefined();
  });

  it('should get symbol', () => {
    expect(instance.getSymbol()).toBe('NIFTY');
  });

  it('should get strategy name', () => {
    expect(instance.getStrategyName()).toBe('test-strategy');
  });

  it('should get strategy version', () => {
    expect(instance.getStrategyVersion()).toBe('1.0.0');
  });

  it('should get strategy description', () => {
    expect(instance.getStrategyDescription()).toBe('Test Strategy');
  });

  it('should get data provider type', () => {
    expect(instance.getDataProviderType()).toBe('CSV');
  });

  it('should get order execution type', () => {
    expect(instance.getOrderExecutionType()).toBe('MOCK');
  });

  it('should get risk management', () => {
    const riskManagement = instance.getRiskManagement();
    expect(riskManagement.maxLots).toBe(15);
    expect(riskManagement.maxLossPct).toBe(0.05);
    expect(riskManagement.positionSizingMode).toBe('CONSERVATIVE');
  });

  it('should get config', () => {
    const config = instance.getConfig();
    expect(config.emaFastPeriod).toBe(9);
    expect(config.emaSlowPeriod).toBe(21);
    expect(config.rsiEntryLong).toBe(50);
  });

  it('should get global config', () => {
    const globalConfig = instance.getGlobalConfig();
    expect(globalConfig.maxConcurrentPositions).toBe(2);
    expect(globalConfig.maxTotalRisk).toBe(0.08);
    expect(globalConfig.correlationLimit).toBe(0.7);
  });

  it('should evaluate strategy', async () => {
    const mockEvaluation: StrategyEvaluation = {
      signals: [
        {
          type: 'ENTRY',
          strength: 80,
          confidence: 75,
          data: { direction: 'LONG', quantity: 1, price: 100 },
          timestamp: new Date(),
        }
      ],
      diagnostics: {},
    };

    mockStrategy.evaluate = jest.fn().mockResolvedValue(mockEvaluation);

    const mockCandles = [
      { timestamp: Date.now(), open: 100, high: 105, low: 95, close: 102, volume: 1000 },
    ];

    const result = await instance.evaluate(mockCandles);

    expect(result).toEqual(mockEvaluation);
    expect(mockStrategy.evaluate).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: 'NIFTY',
        timeframe: '15m',
        emaFastPeriod: 9,
        emaSlowPeriod: 21,
      }),
      mockCandles,
      expect.objectContaining({
        globalConfig: mockGlobalConfig,
      })
    );
  });

  it('should validate configuration', () => {
    const mockValidation = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    mockStrategy.validateConfig = jest.fn().mockReturnValue(mockValidation);

    const result = instance.validateConfig();

    expect(result).toEqual(mockValidation);
    expect(mockStrategy.validateConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: 'NIFTY',
        timeframe: '15m',
        emaFastPeriod: 9,
        emaSlowPeriod: 21,
      })
    );
  });

  it('should get default configuration', () => {
    const mockDefaultConfig: StrategyConfig = {
      id: 'default',
      name: 'Default Strategy',
      symbol: 'NIFTY',
      timeframe: '15m',
      emaFastPeriod: 9,
      emaSlowPeriod: 21,
    };

    mockStrategy.getDefaultConfig = jest.fn().mockReturnValue(mockDefaultConfig);

    const result = instance.getDefaultConfig();

    expect(result).toEqual(mockDefaultConfig);
    expect(mockStrategy.getDefaultConfig).toHaveBeenCalled();
  });

  it('should apply risk management to order', () => {
    const order = {
      symbol: 'NIFTY',
      quantity: 20,
      price: 100,
      orderType: 'MARKET' as const,
      product: 'MIS' as const,
      validity: 'DAY' as const,
    };

    const riskAdjustedOrder = instance.applyRiskManagement(order);

    // Should reduce quantity based on risk management
    expect(riskAdjustedOrder.quantity).toBeLessThanOrEqual(15); // maxLots
    expect(riskAdjustedOrder.quantity).toBeLessThanOrEqual(20); // original quantity
  });

  it('should check if order is within risk limits', () => {
    const validOrder = {
      symbol: 'NIFTY',
      quantity: 10,
      price: 100,
      orderType: 'MARKET' as const,
      product: 'MIS' as const,
      validity: 'DAY' as const,
    };

    const invalidOrder = {
      symbol: 'NIFTY',
      quantity: 100,
      price: 100,
      orderType: 'MARKET' as const,
      product: 'MIS' as const,
      validity: 'DAY' as const,
    };

    expect(instance.isWithinRiskLimits(validOrder)).toBe(true);
    expect(instance.isWithinRiskLimits(invalidOrder)).toBe(false);
  });

  it('should create summary', () => {
    const summary = instance.getSummary();

    expect(summary.symbol).toBe('NIFTY');
    expect(summary.strategyName).toBe('test-strategy');
    expect(summary.strategyVersion).toBe('1.0.0');
    expect(summary.dataProvider).toBe('CSV');
    expect(summary.orderExecution).toBe('MOCK');
    expect(summary.config).toEqual(mockConfig);
    expect(summary.riskManagement).toEqual(mockRiskManagement);
  });

  it('should handle evaluation errors', async () => {
    mockStrategy.evaluate = jest.fn().mockRejectedValue(new Error('Evaluation failed'));

    const mockCandles = [
      { timestamp: Date.now(), open: 100, high: 105, low: 95, close: 102, volume: 1000 },
    ];

    await expect(instance.evaluate(mockCandles)).rejects.toThrow('Strategy evaluation failed for NIFTY: Evaluation failed');
  });

  it('should apply position sizing modes correctly', () => {
    // Test CONSERVATIVE mode
    const conservativeInstance = new MultiSymbolStrategyInstance(
      'NIFTY',
      mockStrategy,
      mockConfig,
      { ...mockRiskManagement, positionSizingMode: 'CONSERVATIVE' },
      mockGlobalConfig
    );

    const order = {
      symbol: 'NIFTY',
      quantity: 20,
      price: 100,
      orderType: 'MARKET' as const,
      product: 'MIS' as const,
      validity: 'DAY' as const,
    };

    const conservativeOrder = conservativeInstance.applyRiskManagement(order);
    expect(conservativeOrder.quantity).toBeLessThan(20); // Should reduce quantity

    // Test AGGRESSIVE mode
    const aggressiveInstance = new MultiSymbolStrategyInstance(
      'NIFTY',
      mockStrategy,
      mockConfig,
      { ...mockRiskManagement, positionSizingMode: 'AGGRESSIVE' },
      mockGlobalConfig
    );

    const aggressiveOrder = aggressiveInstance.applyRiskManagement(order);
    expect(aggressiveOrder.quantity).toBeGreaterThan(20); // Should increase quantity
  });
});


