import { Test, TestingModule } from '@nestjs/testing';
import { MultiSymbolBacktestOrchestrator } from '../multi-symbol-backtest-orchestrator.service';
import { MultiSymbolStrategyOrchestrator } from '../../../strategy/orchestrators/multi-symbol-strategy-orchestrator.service';
import { MultiSymbolStrategyConfig } from '../../../strategy/interfaces/multi-symbol-strategy.interface';
import { MarketDataProvider } from '../../interfaces/data-provider.interface';
import { OrderExecutionProvider } from '../../interfaces/order-execution.interface';

describe('MultiSymbolBacktestOrchestrator', () => {
  let service: MultiSymbolBacktestOrchestrator;
  let mockMultiSymbolStrategyOrchestrator: jest.Mocked<MultiSymbolStrategyOrchestrator>;
  let mockDataProvider: jest.Mocked<MarketDataProvider>;
  let mockOrderExecution: jest.Mocked<OrderExecutionProvider>;

  beforeEach(async () => {
    const mockOrchestrator = {
      runMultiSymbolStrategy: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MultiSymbolBacktestOrchestrator,
        {
          provide: MultiSymbolStrategyOrchestrator,
          useValue: mockOrchestrator,
        },
      ],
    }).compile();

    service = module.get<MultiSymbolBacktestOrchestrator>(MultiSymbolBacktestOrchestrator);
    mockMultiSymbolStrategyOrchestrator = module.get(MultiSymbolStrategyOrchestrator);
  });

  beforeEach(() => {
    mockDataProvider = {
      getQuote: jest.fn(),
      getHistoricalCandles: jest.fn(),
      getOptionChain: jest.fn(),
      isAvailable: jest.fn().mockResolvedValue(true),
    };

    mockOrderExecution = {
      placeBuyOrder: jest.fn(),
      placeSellOrder: jest.fn(),
      isAvailable: jest.fn().mockResolvedValue(true),
    };
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should run multi-symbol backtest', async () => {
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
        }
      ],
      globalConfig: {
        maxConcurrentPositions: 2,
        maxTotalRisk: 0.08,
      }
    };

    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    const mockResults = {
      symbolResults: new Map([
        ['NIFTY', {
          symbol: 'NIFTY',
          trades: [],
          totalReturn: 1000,
          totalReturnPercentage: 1.0,
          winRate: 0.6,
          profitFactor: 1.5,
          maxDrawdown: 0.05,
          maxDrawdownPercentage: 5.0,
          sharpeRatio: 1.2,
          avgWin: 100,
          avgLoss: -50,
          maxWin: 200,
          maxLoss: -100,
          totalTrades: 10,
          winningTrades: 6,
          losingTrades: 4,
          executionTime: 1000,
        }]
      ]),
      globalMetrics: {
        totalReturn: 1000,
        totalReturnPercentage: 1.0,
        winRate: 0.6,
        profitFactor: 1.5,
        maxDrawdown: 0.05,
        maxDrawdownPercentage: 5.0,
        sharpeRatio: 1.2,
        avgWin: 100,
        avgLoss: -50,
        totalTrades: 10,
        winningTrades: 6,
        losingTrades: 4,
        executionTime: 1000,
      },
      crossSymbolAnalysis: {
        correlationMatrix: {},
        diversificationRatio: 0.8,
        portfolioVolatility: 0.15,
        portfolioReturn: 0.01,
        riskAdjustedReturn: 0.067,
        concentrationRisk: 0.5,
        maxCorrelation: 0.7,
        minCorrelation: 0.3,
      },
      portfolioMetrics: {
        totalValue: 101000,
        totalReturn: 1000,
        totalReturnPercentage: 1.0,
        dailyReturns: [0.01, -0.005, 0.02],
        volatility: 0.15,
        sharpeRatio: 1.2,
        sortinoRatio: 1.5,
        calmarRatio: 0.8,
        maxDrawdown: 0.05,
        maxDrawdownDuration: 5,
        var95: 0.02,
        var99: 0.03,
        cvar95: 0.025,
        cvar99: 0.035,
      },
      executionTime: 2000,
      totalTrades: 10,
      totalReturn: 1000,
      maxDrawdown: 0.05,
      sharpeRatio: 1.2,
    };

    mockMultiSymbolStrategyOrchestrator.runMultiSymbolStrategy.mockResolvedValue(mockResults);

    const results = await service.runMultiSymbolBacktest(
      config,
      mockDataProvider,
      mockOrderExecution,
      startDate,
      endDate
    );

    expect(results).toEqual(mockResults);
    expect(mockMultiSymbolStrategyOrchestrator.runMultiSymbolStrategy).toHaveBeenCalledWith(
      expect.objectContaining({
        strategyName: 'advanced-atr',
        backtestConfig: expect.objectContaining({
          startDate,
          endDate,
          initialCapital: 100000,
          commission: 0.001,
          slippage: 0.0005,
          enableCrossSymbolAnalysis: true,
          enableCorrelationAnalysis: true,
          enablePortfolioMetrics: true,
        }),
      }),
      mockDataProvider,
      mockOrderExecution,
      startDate,
      endDate
    );
  });

  it('should run multi-symbol backtest with CSV data', async () => {
    const config: MultiSymbolStrategyConfig = {
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
        maxConcurrentPositions: 2,
        maxTotalRisk: 0.08,
      }
    };

    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    const mockResults = {
      symbolResults: new Map(),
      globalMetrics: {
        totalReturn: 0,
        totalReturnPercentage: 0,
        winRate: 0,
        profitFactor: 0,
        maxDrawdown: 0,
        maxDrawdownPercentage: 0,
        sharpeRatio: 0,
        avgWin: 0,
        avgLoss: 0,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        executionTime: 0,
      },
      crossSymbolAnalysis: {
        correlationMatrix: {},
        diversificationRatio: 0,
        portfolioVolatility: 0,
        portfolioReturn: 0,
        riskAdjustedReturn: 0,
        concentrationRisk: 0,
        maxCorrelation: 0,
        minCorrelation: 0,
      },
      portfolioMetrics: {
        totalValue: 100000,
        totalReturn: 0,
        totalReturnPercentage: 0,
        dailyReturns: [],
        volatility: 0,
        sharpeRatio: 0,
        sortinoRatio: 0,
        calmarRatio: 0,
        maxDrawdown: 0,
        maxDrawdownDuration: 0,
        var95: 0,
        var99: 0,
        cvar95: 0,
        cvar99: 0,
      },
      executionTime: 1000,
      totalTrades: 0,
      totalReturn: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
    };

    mockMultiSymbolStrategyOrchestrator.runMultiSymbolStrategy.mockResolvedValue(mockResults);

    const results = await service.runMultiSymbolBacktestWithCSV(
      config,
      startDate,
      endDate
    );

    expect(results).toEqual(mockResults);
  });

  it('should handle backtest errors', async () => {
    const config: MultiSymbolStrategyConfig = {
      strategyName: 'advanced-atr',
      symbols: [],
      globalConfig: {
        maxConcurrentPositions: 2,
        maxTotalRisk: 0.08,
      }
    };

    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    mockMultiSymbolStrategyOrchestrator.runMultiSymbolStrategy.mockRejectedValue(
      new Error('Backtest failed')
    );

    await expect(
      service.runMultiSymbolBacktest(
        config,
        mockDataProvider,
        mockOrderExecution,
        startDate,
        endDate
      )
    ).rejects.toThrow('Backtest failed');
  });

  it('should get available strategies', () => {
    const strategies = service.getAvailableStrategies();
    expect(Array.isArray(strategies)).toBe(true);
    expect(strategies.length).toBeGreaterThan(0);
  });

  it('should get strategy info', () => {
    const info = service.getStrategyInfo('advanced-atr');
    expect(info.name).toBe('advanced-atr');
    expect(info.version).toBe('1.0.0');
    expect(info.description).toBe('advanced-atr strategy');
  });

  it('should validate configuration', () => {
    const config: MultiSymbolStrategyConfig = {
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
        maxConcurrentPositions: 2,
        maxTotalRisk: 0.08,
      }
    };

    const validation = service.validateConfig(config);
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should handle CSV import errors gracefully', async () => {
    // Mock the import to throw an error
    jest.doMock('../../trading/providers/csv-data-provider.js', () => {
      throw new Error('CSV provider not found');
    });

    const config: MultiSymbolStrategyConfig = {
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
        maxConcurrentPositions: 2,
        maxTotalRisk: 0.08,
      }
    };

    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    await expect(
      service.runMultiSymbolBacktestWithCSV(config, startDate, endDate)
    ).rejects.toThrow();
  });
});


