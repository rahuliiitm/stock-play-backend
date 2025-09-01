import { Injectable, Logger } from '@nestjs/common'
import { StrategyBuildingBlocksService, CandleData, IndicatorValue, StrategyCondition, SequentialRule, StrategySignal } from './strategy-building-blocks.service'
import { StrategyExecutionLog } from '../entities/strategy-execution-log.entity'

export interface NiftyOptionStrategy {
  id: string
  name: string
  underlyingSymbol: 'NIFTY' | 'BANKNIFTY'
  timeframe: '1H'
  entryRules: {
    bullish: SequentialRule
    bearish: SequentialRule
  }
  exitRules: StrategyCondition[]
  riskManagement: {
    maxLossMultiplier: number // 1.5x net credit
    partialProfitTarget: number // 70-80% of max profit
    expiryExitDays: number // Days before expiry to exit
    gammaRiskDay: number // Day of week for gamma risk exit
  }
  strikeSelection: {
    expiryType: 'weekly'
    sellStrikeOffset: number // Points from spot for sell strike
    hedgeStrikeOffset: number // Points from sell strike for hedge
  }
}

export interface OptionPosition {
  id: string
  strategyId: string
  side: 'BUY' | 'SELL'
  optionType: 'CE' | 'PE'
  strike: number
  quantity: number
  premium: number
  expiry: Date
  entryPrice: number
  currentPrice?: number
  pnl?: number
}

export interface SpreadPosition {
  id: string
  strategyId: string
  type: 'BULL_PUT_SPREAD' | 'BEAR_CALL_SPREAD'
  sellLeg: OptionPosition
  buyLeg: OptionPosition
  netCredit: number
  maxProfit: number
  maxLoss: number
  currentPnL: number
  entryTime: Date
  expiryTime: Date
}

@Injectable()
export class NiftyOptionSellingService {
  private readonly logger = new Logger(NiftyOptionSellingService.name)

  constructor(
    private strategyBlocks: StrategyBuildingBlocksService
  ) {}

  /**
   * Create NIFTY Option Selling Strategy
   */
  createStrategy(): NiftyOptionStrategy {
    return {
      id: 'nifty-weekly-option-selling',
      name: 'NIFTY Weekly Option Selling',
      underlyingSymbol: 'NIFTY',
      timeframe: '1H',
      entryRules: {
        bullish: this.createBullishEntryRule(),
        bearish: this.createBearishEntryRule()
      },
      exitRules: this.createExitRules(),
      riskManagement: {
        maxLossMultiplier: 1.5, // 1.5x net credit
        partialProfitTarget: 0.75, // 75% of max profit
        expiryExitDays: 1, // Exit 1 day before expiry
        gammaRiskDay: 3 // Wednesday (0 = Sunday, 3 = Wednesday)
      },
      strikeSelection: {
        expiryType: 'weekly',
        sellStrikeOffset: 0, // ATM
        hedgeStrikeOffset: 200 // 200 points OTM for hedge
      }
    }
  }

  /**
   * Evaluate strategy for current market conditions
   */
  async evaluateStrategy(
    strategy: NiftyOptionStrategy,
    context: {
      candle: CandleData
      indicators: Record<string, IndicatorValue>
      marketData: Record<string, any>
      previousSignals: StrategySignal[]
      executionHistory: StrategyExecutionLog[]
      currentPositions: SpreadPosition[]
    }
  ): Promise<{
    signals: StrategySignal[]
    actions: any[]
  }> {
    const signals: StrategySignal[] = []
    const actions: any[] = []

    // Check for entry signals
    const entrySignal = await this.checkEntryConditions(strategy, context)
    if (entrySignal) {
      signals.push(entrySignal)

      // Generate entry action if no open positions
      if (context.currentPositions.length === 0) {
        const entryAction = await this.generateEntryAction(strategy, entrySignal, context)
        if (entryAction) {
          actions.push(entryAction)
        }
      }
    }

    // Check for exit signals on existing positions
    for (const position of context.currentPositions) {
      const exitSignal = await this.checkExitConditions(strategy, position, context)
      if (exitSignal) {
        signals.push(exitSignal)
        const exitAction = this.generateExitAction(position, exitSignal)
        actions.push(exitAction)
      }
    }

    return { signals, actions }
  }

  /**
   * Create bullish entry rule (Bull Put Spread)
   */
  private createBullishEntryRule(): SequentialRule {
    return {
      id: 'bullish-entry',
      name: 'Bullish Entry (Bull Put Spread)',
      conditions: [
        // Step 1: Supertrend bullish
        {
          type: 'INDICATOR_COMPARISON',
          operator: 'EQ',
          leftOperand: 'supertrend_direction',
          rightOperand: 'bullish'
        },
        // Step 2: Price above EMA20
        {
          type: 'INDICATOR_COMPARISON',
          operator: 'GT',
          leftOperand: 'close',
          rightOperand: 'ema20'
        }
      ],
      timeWindow: 60, // 1 hour for confirmation
      maxRetries: 3
    }
  }

  /**
   * Create bearish entry rule (Bear Call Spread)
   */
  private createBearishEntryRule(): SequentialRule {
    return {
      id: 'bearish-entry',
      name: 'Bearish Entry (Bear Call Spread)',
      conditions: [
        // Step 1: Supertrend bearish
        {
          type: 'INDICATOR_COMPARISON',
          operator: 'EQ',
          leftOperand: 'supertrend_direction',
          rightOperand: 'bearish'
        },
        // Step 2: Price below EMA20
        {
          type: 'INDICATOR_COMPARISON',
          operator: 'LT',
          leftOperand: 'close',
          rightOperand: 'ema20'
        }
      ],
      timeWindow: 60, // 1 hour for confirmation
      maxRetries: 3
    }
  }

  /**
   * Create exit rules
   */
  private createExitRules(): StrategyCondition[] {
    return [
      // Exit on Supertrend flip
      {
        type: 'INDICATOR_COMPARISON',
        operator: 'NEQ',
        leftOperand: 'supertrend_direction',
        rightOperand: 'entry_direction'
      },
      // Exit on gamma risk day
      {
        type: 'TIME_CONDITION',
        operator: 'EQ',
        leftOperand: 'day',
        rightOperand: 3 // Wednesday
      },
      // Exit near expiry
      {
        type: 'TIME_CONDITION',
        operator: 'LTE',
        leftOperand: 'days_to_expiry',
        rightOperand: 1
      }
    ]
  }

  /**
   * Check entry conditions
   */
  private async checkEntryConditions(
    strategy: NiftyOptionStrategy,
    context: any
  ): Promise<StrategySignal | null> {
    // Determine market direction from Supertrend
    const supertrendDirection = context.indicators.supertrend_direction?.value

    if (!supertrendDirection) return null

    let entryRule: SequentialRule
    let signalType: 'ENTRY_BULLISH' | 'ENTRY_BEARISH'

    if (supertrendDirection === 'bullish') {
      entryRule = strategy.entryRules.bullish
      signalType = 'ENTRY_BULLISH'
    } else if (supertrendDirection === 'bearish') {
      entryRule = strategy.entryRules.bearish
      signalType = 'ENTRY_BEARISH'
    } else {
      return null
    }

    // Check sequential rule
    const ruleResult = await this.strategyBlocks.evaluateSequentialRule(entryRule, {
      candle: context.candle,
      indicators: context.indicators,
      marketData: context.marketData,
      previousSignals: context.previousSignals,
      executionHistory: context.executionHistory
    })

    if (ruleResult.satisfied) {
      return await this.strategyBlocks.generateSignal(
        'ENTRY',
        entryRule.conditions,
        {
          candle: context.candle,
          indicators: context.indicators,
          marketData: { ...context.marketData, entryDirection: supertrendDirection }
        }
      )
    }

    return null
  }

  /**
   * Check exit conditions for a position
   */
  private async checkExitConditions(
    strategy: NiftyOptionStrategy,
    position: SpreadPosition,
    context: any
  ): Promise<StrategySignal | null> {
    // Check each exit condition
    for (const exitRule of strategy.exitRules) {
      const conditionMet = await this.strategyBlocks.evaluateCondition(exitRule, {
        candle: context.candle,
        indicators: context.indicators,
        marketData: context.marketData,
        previousSignals: context.previousSignals
      })

      if (conditionMet) {
        return await this.strategyBlocks.generateSignal(
          'EXIT',
          [exitRule],
          {
            candle: context.candle,
            indicators: context.indicators,
            marketData: context.marketData
          }
        )
      }
    }

    // Check risk management conditions
    const riskExit = this.checkRiskManagementExit(strategy, position, context)
    if (riskExit) {
      return await this.strategyBlocks.generateSignal(
        'EXIT',
        [], // Risk management doesn't need conditions
        {
          candle: context.candle,
          indicators: context.indicators,
          marketData: context.marketData
        }
      )
    }

    return null
  }

  /**
   * Check risk management exit conditions
   */
  private checkRiskManagementExit(
    strategy: NiftyOptionStrategy,
    position: SpreadPosition,
    context: any
  ): boolean {
    const { riskManagement } = strategy

    // Stop loss check
    const stopLossThreshold = position.netCredit * riskManagement.maxLossMultiplier
    if (position.currentPnL <= -stopLossThreshold) {
      return true
    }

    // Partial profit booking
    const profitTarget = position.maxProfit * riskManagement.partialProfitTarget
    if (position.currentPnL >= profitTarget) {
      return true
    }

    return false
  }

  /**
   * Generate entry action
   */
  private async generateEntryAction(
    strategy: NiftyOptionStrategy,
    signal: StrategySignal,
    context: any
  ): Promise<any> {
    const spotPrice = context.candle.close
    const signalType = signal.data.entryDirection === 'bullish' ? 'BULL_PUT_SPREAD' : 'BEAR_CALL_SPREAD'

    // Get option chain data
    const optionChain = await this.getOptionChain(spotPrice, strategy)

    if (!optionChain) {
      this.logger.warn('Could not retrieve option chain data')
      return null
    }

    // Select strikes
    const strikes = this.selectStrikes(spotPrice, strategy, signalType)

    // Create spread order
    const spreadOrder = this.createSpreadOrder(strikes, signalType, strategy)

    return {
      type: 'ENTER_SPREAD',
      signalType,
      spreadOrder,
      timestamp: new Date(),
      spotPrice,
      expiry: this.getWeeklyExpiry()
    }
  }

  /**
   * Generate exit action
   */
  private generateExitAction(position: SpreadPosition, signal: StrategySignal): any {
    return {
      type: 'EXIT_SPREAD',
      positionId: position.id,
      spreadType: position.type,
      exitReason: signal.data.exitReason || 'strategy_signal',
      timestamp: new Date(),
      pnl: position.currentPnL
    }
  }

  /**
   * Get option chain for current spot price
   */
  private async getOptionChain(spotPrice: number, strategy: NiftyOptionStrategy): Promise<any> {
    // This would integrate with broker API to get real option chain
    // For now, return mock data
    const expiry = this.getWeeklyExpiry()
    const strikes = this.generateStrikePrices(spotPrice)

    return {
      expiry,
      spotPrice,
      strikes: strikes.map(strike => ({
        strike,
        ce: { bid: Math.max(0, spotPrice - strike) * 0.1, ask: Math.max(0, spotPrice - strike) * 0.12 },
        pe: { bid: Math.max(0, strike - spotPrice) * 0.1, ask: Math.max(0, strike - spotPrice) * 0.12 }
      }))
    }
  }

  /**
   * Select appropriate strikes for the spread
   */
  private selectStrikes(spotPrice: number, strategy: NiftyOptionStrategy, signalType: string): any {
    const baseStrike = Math.round(spotPrice / 50) * 50 // Round to nearest 50

    if (signalType === 'BULL_PUT_SPREAD') {
      return {
        sellStrike: baseStrike,
        buyStrike: baseStrike - strategy.strikeSelection.hedgeStrikeOffset,
        optionType: 'PE'
      }
    } else {
      return {
        sellStrike: baseStrike,
        buyStrike: baseStrike + strategy.strikeSelection.hedgeStrikeOffset,
        optionType: 'CE'
      }
    }
  }

  /**
   * Create spread order
   */
  private createSpreadOrder(strikes: any, signalType: string, strategy: NiftyOptionStrategy): any {
    return {
      symbol: strategy.underlyingSymbol,
      type: signalType,
      sellLeg: {
        strike: strikes.sellStrike,
        optionType: strikes.optionType,
        quantity: 50, // Standard lot size for NIFTY
        side: 'SELL'
      },
      buyLeg: {
        strike: strikes.buyStrike,
        optionType: strikes.optionType,
        quantity: 50,
        side: 'BUY'
      },
      expiry: this.getWeeklyExpiry()
    }
  }

  /**
   * Get weekly expiry date
   */
  private getWeeklyExpiry(): Date {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const daysUntilThursday = (4 - dayOfWeek + 7) % 7 || 7
    const expiryDate = new Date(now)
    expiryDate.setDate(now.getDate() + daysUntilThursday)
    expiryDate.setHours(15, 30, 0, 0) // 3:30 PM IST
    return expiryDate
  }

  /**
   * Generate strike prices around spot
   */
  private generateStrikePrices(spotPrice: number): number[] {
    const baseStrike = Math.round(spotPrice / 50) * 50
    const strikes: number[] = []

    for (let i = -10; i <= 10; i++) {
      strikes.push(baseStrike + (i * 50))
    }

    return strikes
  }

  /**
   * Calculate days to expiry
   */
  calculateDaysToExpiry(expiry: Date): number {
    const now = new Date()
    const diffTime = expiry.getTime() - now.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  /**
   * Validate strategy configuration
   */
  validateStrategy(strategy: NiftyOptionStrategy): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!strategy.underlyingSymbol) {
      errors.push('Underlying symbol is required')
    }

    if (!strategy.entryRules.bullish || !strategy.entryRules.bearish) {
      errors.push('Both bullish and bearish entry rules are required')
    }

    if (!strategy.exitRules || strategy.exitRules.length === 0) {
      errors.push('Exit rules are required')
    }

    if (!strategy.riskManagement) {
      errors.push('Risk management configuration is required')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}
