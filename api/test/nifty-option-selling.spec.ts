import { Test, TestingModule } from '@nestjs/testing';
import {
  NiftyOptionSellingService,
  NiftyOptionStrategy,
  SpreadPosition,
} from '../src/modules/strategy/services/nifty-option-selling.service';
import {
  StrategyBuildingBlocksService,
  CandleData,
  IndicatorValue,
} from '../src/modules/strategy/services/strategy-building-blocks.service';
import { StrategyExecutionLog } from '../src/modules/strategy/entities/strategy-execution-log.entity';

describe('NiftyOptionSellingService', () => {
  let service: NiftyOptionSellingService;
  let mockStrategyBlocks: jest.Mocked<StrategyBuildingBlocksService>;

  beforeEach(async () => {
    const mockStrategyBlocksService = {
      evaluateSequentialRule: jest.fn(),
      evaluateCondition: jest.fn(),
      generateSignal: jest.fn(),
      calculateRiskMetrics: jest.fn(),
      calculatePerformanceMetrics: jest.fn(),
      validateStrategyConfig: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NiftyOptionSellingService,
        {
          provide: StrategyBuildingBlocksService,
          useValue: mockStrategyBlocksService,
        },
      ],
    }).compile();

    service = module.get<NiftyOptionSellingService>(NiftyOptionSellingService);
    mockStrategyBlocks = module.get(StrategyBuildingBlocksService);
  });

  describe('Strategy Creation', () => {
    it('should create a valid NIFTY option selling strategy', () => {
      const strategy = service.createStrategy();

      expect(strategy).toBeDefined();
      expect(strategy.id).toBe('nifty-weekly-option-selling');
      expect(strategy.underlyingSymbol).toBe('NIFTY');
      expect(strategy.timeframe).toBe('1H');

      expect(strategy.entryRules.bullish).toBeDefined();
      expect(strategy.entryRules.bearish).toBeDefined();
      expect(strategy.exitRules).toBeDefined();
      expect(strategy.riskManagement).toBeDefined();
      expect(strategy.strikeSelection).toBeDefined();
    });

    it('should validate strategy configuration', () => {
      const strategy = service.createStrategy();
      const validation = service.validateStrategy(strategy);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid strategy configuration', () => {
      const invalidStrategy = {
        id: 'invalid',
        name: 'Invalid Strategy',
        underlyingSymbol: null,
        timeframe: '1H',
      } as any;

      const validation = service.validateStrategy(invalidStrategy);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Underlying symbol is required');
    });
  });

  describe('Entry Conditions Testing', () => {
    let strategy: NiftyOptionStrategy;
    let bullishContext: any;
    let bearishContext: any;

    beforeEach(() => {
      strategy = service.createStrategy();

      bullishContext = {
        candle: {
          timestamp: Date.now(),
          open: 22000,
          high: 22100,
          low: 21900,
          close: 22050,
          volume: 1000000,
        },
        indicators: {
          supertrend_direction: { value: 'bullish', timestamp: new Date() },
          ema20: { value: 21950, timestamp: new Date() },
        },
        marketData: {},
        previousSignals: [],
        executionHistory: [],
        currentPositions: [],
      };

      bearishContext = {
        ...bullishContext,
        indicators: {
          supertrend_direction: { value: 'bearish', timestamp: new Date() },
          ema20: { value: 22100, timestamp: new Date() },
        },
      };
    });

    it('should trigger bullish entry signal when conditions are met', async () => {
      mockStrategyBlocks.evaluateSequentialRule.mockResolvedValue({
        satisfied: true,
        progress: 100,
        nextExpectedTime: undefined,
      });

      mockStrategyBlocks.generateSignal.mockResolvedValue({
        type: 'ENTRY',
        strength: 80,
        confidence: 75,
        data: { entryDirection: 'bullish' },
        timestamp: new Date(),
      });

      const result = await service.evaluateStrategy(strategy, bullishContext);

      expect(result.signals).toHaveLength(1);
      expect(result.signals[0].type).toBe('ENTRY');
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].signalType).toBe('BULL_PUT_SPREAD');
    });

    it('should trigger bearish entry signal when conditions are met', async () => {
      mockStrategyBlocks.evaluateSequentialRule.mockResolvedValue({
        satisfied: true,
        progress: 100,
        nextExpectedTime: undefined,
      });

      mockStrategyBlocks.generateSignal.mockResolvedValue({
        type: 'ENTRY',
        strength: 80,
        confidence: 75,
        data: { entryDirection: 'bearish' },
        timestamp: new Date(),
      });

      const result = await service.evaluateStrategy(strategy, bearishContext);

      expect(result.signals).toHaveLength(1);
      expect(result.signals[0].type).toBe('ENTRY');
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].signalType).toBe('BEAR_CALL_SPREAD');
    });

    it('should not trigger entry signal when Supertrend is neutral', async () => {
      const neutralContext = {
        ...bullishContext,
        indicators: {
          supertrend_direction: { value: 'neutral', timestamp: new Date() },
          ema20: { value: 21950, timestamp: new Date() },
        },
      };

      const result = await service.evaluateStrategy(strategy, neutralContext);

      expect(result.signals).toHaveLength(0);
      expect(result.actions).toHaveLength(0);
    });

    it('should not trigger entry signal when price is below EMA20 in bullish context', async () => {
      const invalidBullishContext = {
        ...bullishContext,
        indicators: {
          supertrend_direction: { value: 'bullish', timestamp: new Date() },
          ema20: { value: 22100, timestamp: new Date() },
        },
      };

      mockStrategyBlocks.evaluateSequentialRule.mockResolvedValue({
        satisfied: false,
        progress: 50,
        nextExpectedTime: new Date(),
      });

      const result = await service.evaluateStrategy(
        strategy,
        invalidBullishContext,
      );

      expect(result.signals).toHaveLength(0);
      expect(result.actions).toHaveLength(0);
    });

    it('should not trigger entry signal when price is above EMA20 in bearish context', async () => {
      const invalidBearishContext = {
        ...bearishContext,
        indicators: {
          supertrend_direction: { value: 'bearish', timestamp: new Date() },
          ema20: { value: 21900, timestamp: new Date() },
        },
      };

      mockStrategyBlocks.evaluateSequentialRule.mockResolvedValue({
        satisfied: false,
        progress: 50,
        nextExpectedTime: new Date(),
      });

      const result = await service.evaluateStrategy(
        strategy,
        invalidBearishContext,
      );

      expect(result.signals).toHaveLength(0);
      expect(result.actions).toHaveLength(0);
    });

    it('should handle sequential rule evaluation in progress', async () => {
      mockStrategyBlocks.evaluateSequentialRule.mockResolvedValue({
        satisfied: false,
        progress: 50,
        nextExpectedTime: new Date(Date.now() + 3600000),
      });

      const result = await service.evaluateStrategy(strategy, bullishContext);

      expect(result.signals).toHaveLength(0);
      expect(result.actions).toHaveLength(0);
    });
  });

  describe('Exit Conditions Testing', () => {
    let strategy: NiftyOptionStrategy;
    let position: SpreadPosition;
    let exitContext: any;

    beforeEach(() => {
      strategy = service.createStrategy();
      position = {
        id: 'test-position',
        strategyId: strategy.id,
        type: 'BULL_PUT_SPREAD',
        sellLeg: {
          id: 'sell-leg',
          strategyId: strategy.id,
          side: 'SELL',
          optionType: 'PE',
          strike: 22000,
          quantity: 50,
          premium: 40,
          expiry: new Date(Date.now() + 86400000), // 1 day from now
          entryPrice: 40,
        },
        buyLeg: {
          id: 'buy-leg',
          strategyId: strategy.id,
          side: 'BUY',
          optionType: 'PE',
          strike: 21800,
          quantity: 50,
          premium: 20,
          expiry: new Date(Date.now() + 86400000),
          entryPrice: 20,
        },
        netCredit: 20,
        maxProfit: 20,
        maxLoss: 180,
        currentPnL: 10,
        entryTime: new Date(Date.now() - 86400000), // 1 day ago
        expiryTime: new Date(Date.now() + 86400000),
      };

      exitContext = {
        candle: {
          timestamp: Date.now(),
          open: 22000,
          high: 22100,
          low: 21900,
          close: 22050,
          volume: 1000000,
        },
        indicators: {
          supertrend_direction: { value: 'bearish', timestamp: new Date() },
        },
        marketData: {
          entryDirection: 'bullish',
        },
        previousSignals: [],
        currentPositions: [position],
      };
    });

    it('should trigger exit signal on Supertrend flip', async () => {
      mockStrategyBlocks.evaluateCondition.mockResolvedValue(true);
      mockStrategyBlocks.generateSignal.mockResolvedValue({
        type: 'EXIT',
        strength: 90,
        confidence: 85,
        data: { exitReason: 'supertrend_flip' },
        timestamp: new Date(),
      });

      const result = await service.evaluateStrategy(strategy, exitContext);

      expect(result.signals).toHaveLength(1);
      expect(result.signals[0].type).toBe('EXIT');
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('EXIT_SPREAD');
    });

    it('should trigger exit signal on gamma risk day (Wednesday)', async () => {
      const wednesdayContext = {
        ...exitContext,
        marketData: {
          ...exitContext.marketData,
          day: 3, // Wednesday
        },
      };

      mockStrategyBlocks.evaluateCondition.mockImplementation((condition) => {
        if (condition.leftOperand === 'day' && condition.rightOperand === 3) {
          return Promise.resolve(true);
        }
        return Promise.resolve(false);
      });

      mockStrategyBlocks.generateSignal.mockResolvedValue({
        type: 'EXIT',
        strength: 95,
        confidence: 90,
        data: { exitReason: 'gamma_risk' },
        timestamp: new Date(),
      });

      const result = await service.evaluateStrategy(strategy, wednesdayContext);

      expect(result.signals).toHaveLength(1);
      expect(result.actions).toHaveLength(1);
    });

    it('should trigger exit signal near expiry (1 day remaining)', async () => {
      const expiryContext = {
        ...exitContext,
        marketData: {
          ...exitContext.marketData,
          days_to_expiry: 1,
        },
      };

      mockStrategyBlocks.evaluateCondition.mockImplementation((condition) => {
        if (
          condition.leftOperand === 'days_to_expiry' &&
          condition.rightOperand === 1
        ) {
          return Promise.resolve(true);
        }
        return Promise.resolve(false);
      });

      mockStrategyBlocks.generateSignal.mockResolvedValue({
        type: 'EXIT',
        strength: 100,
        confidence: 95,
        data: { exitReason: 'near_expiry' },
        timestamp: new Date(),
      });

      const result = await service.evaluateStrategy(strategy, expiryContext);

      expect(result.signals).toHaveLength(1);
      expect(result.actions).toHaveLength(1);
    });

    it('should trigger exit signal on stop loss', async () => {
      const stopLossPosition = {
        ...position,
        currentPnL: -35, // Below -30 (1.5 * 20 net credit)
      };

      const stopLossContext = {
        ...exitContext,
        currentPositions: [stopLossPosition],
      };

      mockStrategyBlocks.evaluateCondition.mockResolvedValue(false);
      mockStrategyBlocks.generateSignal.mockResolvedValue({
        type: 'EXIT',
        strength: 100,
        confidence: 100,
        data: { exitReason: 'stop_loss' },
        timestamp: new Date(),
      });

      const result = await service.evaluateStrategy(strategy, stopLossContext);

      expect(result.signals).toHaveLength(1);
      expect(result.actions).toHaveLength(1);
    });

    it('should trigger exit signal on partial profit target', async () => {
      const profitPosition = {
        ...position,
        currentPnL: 17, // Above 15 (0.75 * 20 max profit)
      };

      const profitContext = {
        ...exitContext,
        currentPositions: [profitPosition],
      };

      mockStrategyBlocks.evaluateCondition.mockResolvedValue(false);
      mockStrategyBlocks.generateSignal.mockResolvedValue({
        type: 'EXIT',
        strength: 80,
        confidence: 75,
        data: { exitReason: 'partial_profit' },
        timestamp: new Date(),
      });

      const result = await service.evaluateStrategy(strategy, profitContext);

      expect(result.signals).toHaveLength(1);
      expect(result.actions).toHaveLength(1);
    });
  });

  describe('Strike Selection and Order Generation', () => {
    let strategy: NiftyOptionStrategy;

    beforeEach(() => {
      strategy = service.createStrategy();
    });

    it('should select appropriate strikes for bull put spread', async () => {
      const spotPrice = 22050;
      const signalType = 'BULL_PUT_SPREAD';

      // Access private method through service
      const strikes = (service as any).selectStrikes(
        spotPrice,
        strategy,
        signalType,
      );

      expect(strikes.sellStrike).toBe(22050); // Rounded to nearest 50
      expect(strikes.buyStrike).toBe(21850); // 200 points OTM
      expect(strikes.optionType).toBe('PE');
    });

    it('should select appropriate strikes for bear call spread', async () => {
      const spotPrice = 22050;
      const signalType = 'BEAR_CALL_SPREAD';

      const strikes = (service as any).selectStrikes(
        spotPrice,
        strategy,
        signalType,
      );

      expect(strikes.sellStrike).toBe(22050);
      expect(strikes.buyStrike).toBe(22250); // 200 points OTM
      expect(strikes.optionType).toBe('CE');
    });

    it('should generate correct spread order structure', () => {
      const strikes = {
        sellStrike: 22000,
        buyStrike: 21800,
        optionType: 'PE',
      };
      const signalType = 'BULL_PUT_SPREAD';

      const order = (service as any).createSpreadOrder(
        strikes,
        signalType,
        strategy,
      );

      expect(order.symbol).toBe('NIFTY');
      expect(order.type).toBe('BULL_PUT_SPREAD');
      expect(order.sellLeg.strike).toBe(22000);
      expect(order.sellLeg.optionType).toBe('PE');
      expect(order.sellLeg.quantity).toBe(50);
      expect(order.buyLeg.strike).toBe(21800);
      expect(order.buyLeg.optionType).toBe('PE');
      expect(order.buyLeg.quantity).toBe(50);
    });

    it('should calculate weekly expiry date correctly', () => {
      // Test on Monday (should return next Thursday)
      const monday = new Date('2024-01-08'); // Monday
      jest.spyOn(global, 'Date').mockImplementation(() => monday as any);

      const expiry = (service as any).getWeeklyExpiry();
      expect(expiry.getDay()).toBe(4); // Thursday
      expect(expiry.getHours()).toBe(15);
      expect(expiry.getMinutes()).toBe(30);

      jest.restoreAllMocks();
    });

    it('should generate strike prices around spot', () => {
      const spotPrice = 22050;
      const strikes = (service as any).generateStrikePrices(spotPrice);

      expect(strikes).toContain(22050); // Base strike
      expect(strikes).toContain(22100); // +50
      expect(strikes).toContain(22000); // -50
      expect(strikes.length).toBe(21); // -10 to +10 strikes
    });
  });

  describe('Time-based Logic Testing', () => {
    let strategy: NiftyOptionStrategy;

    beforeEach(() => {
      strategy = service.createStrategy();
    });

    it('should calculate days to expiry correctly', () => {
      const futureExpiry = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days from now
      const days = service.calculateDaysToExpiry(futureExpiry);

      expect(days).toBe(5);
    });

    it('should handle expiry calculation edge cases', () => {
      const pastExpiry = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
      const days = service.calculateDaysToExpiry(pastExpiry);

      expect(days).toBe(-1);
    });

    it('should trigger gamma risk exit on correct day', async () => {
      const position = {
        id: 'test-position',
        strategyId: strategy.id,
        type: 'BULL_PUT_SPREAD',
        sellLeg: {} as any,
        buyLeg: {} as any,
        netCredit: 20,
        maxProfit: 20,
        maxLoss: 180,
        currentPnL: 5,
        entryTime: new Date(),
        expiryTime: new Date(Date.now() + 86400000),
      };

      const wednesdayContext = {
        candle: {
          timestamp: Date.now(),
          open: 22000,
          high: 22100,
          low: 21900,
          close: 22050,
          volume: 1000000,
        },
        indicators: {
          supertrend_direction: { value: 'bullish', timestamp: new Date() },
        },
        marketData: { day: 3 },
        previousSignals: [],
        currentPositions: [position],
      };

      mockStrategyBlocks.evaluateCondition.mockImplementation((condition) => {
        return Promise.resolve(
          condition.leftOperand === 'day' && condition.rightOperand === 3,
        );
      });

      mockStrategyBlocks.generateSignal.mockResolvedValue({
        type: 'EXIT',
        strength: 95,
        confidence: 90,
        data: { exitReason: 'gamma_risk' },
        timestamp: new Date(),
      });

      const result = await service.evaluateStrategy(strategy, wednesdayContext);

      expect(result.signals).toHaveLength(1);
      expect(result.signals[0].data.exitReason).toBe('gamma_risk');
    });
  });

  describe('Risk Management Testing', () => {
    let strategy: NiftyOptionStrategy;
    let position: SpreadPosition;

    beforeEach(() => {
      strategy = service.createStrategy();
      position = {
        id: 'test-position',
        strategyId: strategy.id,
        type: 'BULL_PUT_SPREAD',
        sellLeg: {} as any,
        buyLeg: {} as any,
        netCredit: 40,
        maxProfit: 40,
        maxLoss: 360,
        currentPnL: 0,
        entryTime: new Date(),
        expiryTime: new Date(Date.now() + 86400000),
      };
    });

    it('should trigger stop loss when loss exceeds threshold', () => {
      const stopLossPosition = { ...position, currentPnL: -65 }; // -65 < -60 (1.5 * 40)

      const result = (service as any).checkRiskManagementExit(
        strategy,
        stopLossPosition,
        {},
      );

      expect(result).toBe(true);
    });

    it('should not trigger stop loss when loss is within threshold', () => {
      const withinThresholdPosition = { ...position, currentPnL: -50 }; // -50 > -60

      const result = (service as any).checkRiskManagementExit(
        strategy,
        withinThresholdPosition,
        {},
      );

      expect(result).toBe(false);
    });

    it('should trigger partial profit when target is reached', () => {
      const profitPosition = { ...position, currentPnL: 32 }; // 32 > 30 (0.75 * 40)

      const result = (service as any).checkRiskManagementExit(
        strategy,
        profitPosition,
        {},
      );

      expect(result).toBe(true);
    });

    it('should not trigger partial profit when below target', () => {
      const belowTargetPosition = { ...position, currentPnL: 25 }; // 25 < 30

      const result = (service as any).checkRiskManagementExit(
        strategy,
        belowTargetPosition,
        {},
      );

      expect(result).toBe(false);
    });

    it('should calculate risk metrics correctly', () => {
      const metrics = service.calculateRiskMetrics({
        entryPrice: 100,
        stopLoss: 95,
        target: 110,
        quantity: 10,
        capital: 10000,
      });

      expect(metrics.positionSize).toBe(1000);
      expect(metrics.riskAmount).toBe(50);
      expect(metrics.rewardAmount).toBe(100);
      expect(metrics.riskRewardRatio).toBe(2);
      expect(metrics.positionSizePercent).toBe(10);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    let strategy: NiftyOptionStrategy;

    beforeEach(() => {
      strategy = service.createStrategy();
    });

    it('should handle market gaps and holidays', async () => {
      const gapContext = {
        candle: {
          timestamp: Date.now(),
          open: 22500, // Gap up from previous close
          high: 22600,
          low: 22400,
          close: 22550,
          volume: 2000000, // High volume
        },
        indicators: {
          supertrend_direction: { value: 'bullish', timestamp: new Date() },
          ema20: { value: 22200, timestamp: new Date() },
        },
        marketData: {},
        previousSignals: [],
        executionHistory: [],
        currentPositions: [],
      };

      mockStrategyBlocks.evaluateSequentialRule.mockResolvedValue({
        satisfied: true,
        progress: 100,
      });

      mockStrategyBlocks.generateSignal.mockResolvedValue({
        type: 'ENTRY',
        strength: 85, // Higher strength due to volume
        confidence: 80,
        data: { entryDirection: 'bullish' },
        timestamp: new Date(),
      });

      const result = await service.evaluateStrategy(strategy, gapContext);

      expect(result.signals).toHaveLength(1);
      expect(result.signals[0].strength).toBeGreaterThan(50);
    });

    it('should handle volatile market conditions', async () => {
      const volatileContext = {
        candle: {
          timestamp: Date.now(),
          open: 22000,
          high: 22300, // High volatility
          low: 21700,
          close: 22100,
          volume: 3000000, // Very high volume
        },
        indicators: {
          supertrend_direction: { value: 'bullish', timestamp: new Date() },
          ema20: { value: 21900, timestamp: new Date() },
        },
        marketData: {},
        previousSignals: [],
        executionHistory: [],
        currentPositions: [],
      };

      mockStrategyBlocks.evaluateSequentialRule.mockResolvedValue({
        satisfied: true,
        progress: 100,
      });

      mockStrategyBlocks.generateSignal.mockResolvedValue({
        type: 'ENTRY',
        strength: 90, // High strength due to volatility confirmation
        confidence: 85,
        data: { entryDirection: 'bullish' },
        timestamp: new Date(),
      });

      const result = await service.evaluateStrategy(strategy, volatileContext);

      expect(result.signals).toHaveLength(1);
      expect(result.signals[0].strength).toBeGreaterThan(80);
    });

    it('should handle option chain unavailability', async () => {
      const context = {
        candle: {
          timestamp: Date.now(),
          open: 22000,
          high: 22100,
          low: 21900,
          close: 22050,
          volume: 1000000,
        },
        indicators: {
          supertrend_direction: { value: 'bullish', timestamp: new Date() },
          ema20: { value: 21900, timestamp: new Date() },
        },
        marketData: {},
        previousSignals: [],
        executionHistory: [],
        currentPositions: [],
      };

      mockStrategyBlocks.evaluateSequentialRule.mockResolvedValue({
        satisfied: true,
        progress: 100,
      });

      mockStrategyBlocks.generateSignal.mockResolvedValue({
        type: 'ENTRY',
        strength: 80,
        confidence: 75,
        data: { entryDirection: 'bullish' },
        timestamp: new Date(),
      });

      // Mock option chain failure
      jest.spyOn(service as any, 'getOptionChain').mockResolvedValue(null);

      const result = await service.evaluateStrategy(strategy, context);

      expect(result.signals).toHaveLength(1);
      expect(result.actions).toHaveLength(0); // No action due to option chain failure
    });

    it('should handle multiple positions correctly', async () => {
      const positions = [
        {
          id: 'position-1',
          strategyId: strategy.id,
          type: 'BULL_PUT_SPREAD',
          sellLeg: {} as any,
          buyLeg: {} as any,
          netCredit: 20,
          maxProfit: 20,
          maxLoss: 180,
          currentPnL: -35, // Stop loss triggered
          entryTime: new Date(),
          expiryTime: new Date(Date.now() + 86400000),
        },
        {
          id: 'position-2',
          strategyId: strategy.id,
          type: 'BEAR_CALL_SPREAD',
          sellLeg: {} as any,
          buyLeg: {} as any,
          netCredit: 25,
          maxProfit: 25,
          maxLoss: 225,
          currentPnL: 5, // Still running
          entryTime: new Date(),
          expiryTime: new Date(Date.now() + 86400000),
        },
      ];

      const context = {
        candle: {
          timestamp: Date.now(),
          open: 22000,
          high: 22100,
          low: 21900,
          close: 22050,
          volume: 1000000,
        },
        indicators: {},
        marketData: {},
        previousSignals: [],
        currentPositions: positions,
      };

      mockStrategyBlocks.evaluateCondition.mockResolvedValue(false);
      mockStrategyBlocks.generateSignal.mockResolvedValue({
        type: 'EXIT',
        strength: 100,
        confidence: 100,
        data: { exitReason: 'stop_loss' },
        timestamp: new Date(),
      });

      const result = await service.evaluateStrategy(strategy, context);

      expect(result.signals).toHaveLength(1); // Only position-1 should exit
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].positionId).toBe('position-1');
    });

    it('should handle invalid market data gracefully', async () => {
      const invalidContext = {
        candle: null, // Invalid candle data
        indicators: {},
        marketData: {},
        previousSignals: [],
        executionHistory: [],
        currentPositions: [],
      };

      const result = await service.evaluateStrategy(strategy, invalidContext);

      expect(result.signals).toHaveLength(0);
      expect(result.actions).toHaveLength(0);
    });

    it('should handle network failures during option chain fetch', async () => {
      jest
        .spyOn(service as any, 'getOptionChain')
        .mockRejectedValue(new Error('Network failure'));

      const context = {
        candle: {
          timestamp: Date.now(),
          open: 22000,
          high: 22100,
          low: 21900,
          close: 22050,
          volume: 1000000,
        },
        indicators: {
          supertrend_direction: { value: 'bullish', timestamp: new Date() },
          ema20: { value: 21900, timestamp: new Date() },
        },
        marketData: {},
        previousSignals: [],
        executionHistory: [],
        currentPositions: [],
      };

      mockStrategyBlocks.evaluateSequentialRule.mockResolvedValue({
        satisfied: true,
        progress: 100,
      });

      mockStrategyBlocks.generateSignal.mockResolvedValue({
        type: 'ENTRY',
        strength: 80,
        confidence: 75,
        data: { entryDirection: 'bullish' },
        timestamp: new Date(),
      });

      const result = await service.evaluateStrategy(strategy, context);

      expect(result.signals).toHaveLength(1);
      expect(result.actions).toHaveLength(0); // No action due to network failure
    });
  });

  describe('Integration Scenarios', () => {
    let strategy: NiftyOptionStrategy;

    beforeEach(() => {
      strategy = service.createStrategy();
    });

    it('should handle complete entry to exit workflow', async () => {
      // 1. Initial entry
      const entryContext = {
        candle: {
          timestamp: Date.now(),
          open: 22000,
          high: 22100,
          low: 21900,
          close: 22050,
          volume: 1000000,
        },
        indicators: {
          supertrend_direction: { value: 'bullish', timestamp: new Date() },
          ema20: { value: 21900, timestamp: new Date() },
        },
        marketData: {},
        previousSignals: [],
        executionHistory: [],
        currentPositions: [],
      };

      mockStrategyBlocks.evaluateSequentialRule.mockResolvedValue({
        satisfied: true,
        progress: 100,
      });

      mockStrategyBlocks.generateSignal.mockResolvedValue({
        type: 'ENTRY',
        strength: 80,
        confidence: 75,
        data: { entryDirection: 'bullish' },
        timestamp: new Date(),
      });

      let result = await service.evaluateStrategy(strategy, entryContext);
      expect(result.signals).toHaveLength(1);
      expect(result.actions[0].type).toBe('ENTER_SPREAD');

      // 2. Position created - check for exit signals
      const position = {
        id: 'active-position',
        strategyId: strategy.id,
        type: 'BULL_PUT_SPREAD',
        sellLeg: {} as any,
        buyLeg: {} as any,
        netCredit: 40,
        maxProfit: 40,
        maxLoss: 360,
        currentPnL: 35, // Profit target reached
        entryTime: new Date(),
        expiryTime: new Date(Date.now() + 86400000),
      };

      const exitContext = {
        ...entryContext,
        currentPositions: [position],
      };

      mockStrategyBlocks.evaluateCondition.mockResolvedValue(false);
      mockStrategyBlocks.generateSignal.mockResolvedValue({
        type: 'EXIT',
        strength: 85,
        confidence: 80,
        data: { exitReason: 'partial_profit' },
        timestamp: new Date(),
      });

      result = await service.evaluateStrategy(strategy, exitContext);
      expect(result.signals).toHaveLength(1);
      expect(result.actions[0].type).toBe('EXIT_SPREAD');
      expect(result.actions[0].exitReason).toBe('partial_profit');
    });

    it('should handle gamma risk exit on Wednesday', async () => {
      const wednesdayPosition = {
        id: 'wednesday-position',
        strategyId: strategy.id,
        type: 'BEAR_CALL_SPREAD',
        sellLeg: {} as any,
        buyLeg: {} as any,
        netCredit: 30,
        maxProfit: 30,
        maxLoss: 270,
        currentPnL: 5,
        entryTime: new Date(),
        expiryTime: new Date(Date.now() + 2 * 86400000), // 2 days from now
      };

      const wednesdayContext = {
        candle: {
          timestamp: Date.now(),
          open: 22000,
          high: 22100,
          low: 21900,
          close: 22050,
          volume: 1000000,
        },
        indicators: {
          supertrend_direction: { value: 'bearish', timestamp: new Date() },
        },
        marketData: {
          day: 3, // Wednesday
          entryDirection: 'bearish',
        },
        previousSignals: [],
        currentPositions: [wednesdayPosition],
      };

      mockStrategyBlocks.evaluateCondition.mockImplementation((condition) => {
        return Promise.resolve(
          condition.leftOperand === 'day' && condition.rightOperand === 3,
        );
      });

      mockStrategyBlocks.generateSignal.mockResolvedValue({
        type: 'EXIT',
        strength: 95,
        confidence: 90,
        data: { exitReason: 'gamma_risk' },
        timestamp: new Date(),
      });

      const result = await service.evaluateStrategy(strategy, wednesdayContext);

      expect(result.signals).toHaveLength(1);
      expect(result.actions[0].exitReason).toBe('gamma_risk');
    });

    it('should handle expiry-based exit logic', async () => {
      const expiryPosition = {
        id: 'expiry-position',
        strategyId: strategy.id,
        type: 'BULL_PUT_SPREAD',
        sellLeg: {} as any,
        buyLeg: {} as any,
        netCredit: 25,
        maxProfit: 25,
        maxLoss: 225,
        currentPnL: -40, // Stop loss hit
        entryTime: new Date(),
        expiryTime: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
      };

      const expiryContext = {
        candle: {
          timestamp: Date.now(),
          open: 22000,
          high: 22100,
          low: 21900,
          close: 22050,
          volume: 1000000,
        },
        indicators: {},
        marketData: {
          days_to_expiry: 0.5, // Half day to expiry
        },
        previousSignals: [],
        currentPositions: [expiryPosition],
      };

      mockStrategyBlocks.evaluateCondition.mockImplementation((condition) => {
        return Promise.resolve(
          condition.leftOperand === 'days_to_expiry' &&
            condition.rightOperand === 1,
        );
      });

      mockStrategyBlocks.generateSignal.mockResolvedValue({
        type: 'EXIT',
        strength: 100,
        confidence: 95,
        data: { exitReason: 'near_expiry' },
        timestamp: new Date(),
      });

      const result = await service.evaluateStrategy(strategy, expiryContext);

      expect(result.signals).toHaveLength(1);
      expect(result.actions[0].exitReason).toBe('near_expiry');
    });
  });
});
