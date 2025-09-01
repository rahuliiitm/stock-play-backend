import { Test, TestingModule } from '@nestjs/testing'
import { StrategyBuildingBlocksService } from '../src/modules/strategy/services/strategy-building-blocks.service'

describe('StrategyBuildingBlocksService', () => {
  let service: StrategyBuildingBlocksService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StrategyBuildingBlocksService],
    }).compile()

    service = module.get<StrategyBuildingBlocksService>(StrategyBuildingBlocksService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('Condition Evaluation', () => {
    it('should evaluate indicator comparison condition', async () => {
      const condition = {
        type: 'INDICATOR_COMPARISON' as const,
        operator: 'GT' as const,
        leftOperand: 'RSI',
        rightOperand: 70
      }

      const context = {
        indicators: { RSI: { value: 75, timestamp: new Date() } }
      }

      const result = await service.evaluateCondition(condition, context)
      expect(result).toBe(true)
    })

    it('should evaluate price condition', async () => {
      const condition = {
        type: 'PRICE_CONDITION' as const,
        operator: 'GT' as const,
        leftOperand: 'close',
        rightOperand: 100
      }

      const context = {
        candle: { timestamp: 1, open: 95, high: 105, low: 90, close: 102, volume: 1000 }
      }

      const result = await service.evaluateCondition(condition, context)
      expect(result).toBe(true)
    })

    it('should evaluate volume condition', async () => {
      const condition = {
        type: 'VOLUME_CONDITION' as const,
        operator: 'GT' as const,
        leftOperand: 'volume',
        rightOperand: 500
      }

      const context = {
        candle: { timestamp: 1, open: 95, high: 105, low: 90, close: 102, volume: 1000 }
      }

      const result = await service.evaluateCondition(condition, context)
      expect(result).toBe(true)
    })

    it('should evaluate time condition', async () => {
      const condition = {
        type: 'TIME_CONDITION' as const,
        operator: 'GTE' as const,
        leftOperand: 'hour',
        rightOperand: 9
      }

      const context = {
        marketData: { currentTime: new Date('2024-01-01T10:00:00Z') }
      }

      const result = await service.evaluateCondition(condition, context)
      expect(result).toBe(true)
    })
  })

  describe('Sequential Rules', () => {
    it('should evaluate sequential rule', async () => {
      const rule = {
        id: 'test-rule',
        name: 'Test Sequential Rule',
        conditions: [
          {
            type: 'PRICE_CONDITION' as const,
            operator: 'GT' as const,
            leftOperand: 'close',
            rightOperand: 100
          },
          {
            type: 'VOLUME_CONDITION' as const,
            operator: 'GT' as const,
            leftOperand: 'volume',
            rightOperand: 500
          }
        ],
        timeWindow: 60
      }

      const context = {
        candle: { timestamp: 1, open: 95, high: 105, low: 90, close: 102, volume: 1000 },
        executionHistory: []
      }

      const result = await service.evaluateSequentialRule(rule, context)
      expect(result.satisfied).toBe(true)
      expect(result.progress).toBe(100)
    })
  })

  describe('Signal Generation', () => {
    it('should generate signal when conditions are met', async () => {
      const conditions = [
        {
          type: 'PRICE_CONDITION' as const,
          operator: 'GT' as const,
          leftOperand: 'close',
          rightOperand: 100
        }
      ]

      const context = {
        candle: { timestamp: 1, open: 95, high: 105, low: 90, close: 102, volume: 1000 },
        indicators: { RSI: { value: 65, timestamp: new Date() } }
      }

      const signal = await service.generateSignal('ENTRY', conditions, context)
      expect(signal).toBeDefined()
      expect(signal?.type).toBe('ENTRY')
      expect(signal?.strength).toBeGreaterThan(0)
      expect(signal?.confidence).toBeGreaterThan(0)
    })

    it('should not generate signal when conditions are not met', async () => {
      const conditions = [
        {
          type: 'PRICE_CONDITION' as const,
          operator: 'LT' as const,
          leftOperand: 'close',
          rightOperand: 100
        }
      ]

      const context = {
        candle: { timestamp: 1, open: 95, high: 105, low: 90, close: 102, volume: 1000 }
      }

      const signal = await service.generateSignal('ENTRY', conditions, context)
      expect(signal).toBeNull()
    })
  })

  describe('Risk Metrics', () => {
    it('should calculate risk metrics', () => {
      const params = {
        entryPrice: 100,
        stopLoss: 95,
        target: 110,
        quantity: 10,
        capital: 10000
      }

      const metrics = service.calculateRiskMetrics(params)
      expect(metrics.positionSize).toBe(1000)
      expect(metrics.riskAmount).toBe(50)
      expect(metrics.rewardAmount).toBe(100)
      expect(metrics.riskRewardRatio).toBe(2)
      expect(metrics.positionSizePercent).toBe(10)
    })
  })

  describe('Performance Metrics', () => {
    it('should calculate performance metrics', () => {
      const trades = [
        { pnl: 100 },
        { pnl: -50 },
        { pnl: 200 },
        { pnl: -25 },
        { pnl: 150 }
      ]

      const metrics = service.calculatePerformanceMetrics(trades)
      expect(metrics.totalTrades).toBe(5)
      expect(metrics.winningTrades).toBe(3)
      expect(metrics.losingTrades).toBe(2)
      expect(metrics.winRate).toBe(60)
      expect(metrics.totalPnL).toBe(375)
      expect(metrics.profitFactor).toBeGreaterThan(1)
    })

    it('should handle empty trades array', () => {
      const metrics = service.calculatePerformanceMetrics([])
      expect(metrics.totalTrades).toBe(0)
      expect(metrics.winRate).toBe(0)
      expect(metrics.totalPnL).toBe(0)
    })
  })

  describe('Strategy Validation', () => {
    it('should validate valid strategy config', () => {
      const config = {
        name: 'Test Strategy',
        underlyingSymbol: 'RELIANCE',
        timeframe: '15m',
        conditions: [
          {
            type: 'PRICE_CONDITION',
            operator: 'GT',
            leftOperand: 'close',
            rightOperand: 100
          }
        ]
      }

      const result = service.validateStrategyConfig(config)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate invalid strategy config', () => {
      const config = {
        // Missing required fields
        conditions: []
      }

      const result = service.validateStrategyConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })
})
