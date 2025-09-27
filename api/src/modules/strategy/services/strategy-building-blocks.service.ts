import { Injectable, Logger } from '@nestjs/common'
import { StrategyExecutionLog, ActionType } from '../entities/strategy-execution-log.entity'

export interface CandleData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface IndicatorValue {
  value: number
  timestamp: Date
  additionalData?: Record<string, any>
}

export interface StrategyCondition {
  type: 'INDICATOR_COMPARISON' | 'INDICATOR_THRESHOLD' | 'PRICE_CONDITION' | 'VOLUME_CONDITION' | 'TIME_CONDITION' | 'CUSTOM'
  operator: 'GT' | 'LT' | 'GTE' | 'LTE' | 'EQ' | 'NEQ'
  leftOperand: any
  rightOperand: any
  customLogic?: string
}

export interface SequentialRule {
  id: string
  name: string
  conditions: StrategyCondition[]
  timeWindow?: number // minutes
  maxRetries?: number
}

export interface StrategySignal {
  type: 'ENTRY' | 'EXIT' | 'ADJUSTMENT'
  strength: number // 0-100
  confidence: number // 0-100
  data: Record<string, any>
  timestamp: Date
}

@Injectable()
export class StrategyBuildingBlocksService {
  private readonly logger = new Logger(StrategyBuildingBlocksService.name)

  /**
   * Evaluate a single condition
   */
  async evaluateCondition(
    condition: StrategyCondition,
    context: {
      candle?: CandleData
      indicators?: Record<string, IndicatorValue>
      marketData?: Record<string, any>
      previousSignals?: StrategySignal[]
    }
  ): Promise<boolean> {
    try {
      switch (condition.type) {
        case 'INDICATOR_COMPARISON':
          return this.evaluateIndicatorComparison(condition, context.indicators || {})

        case 'INDICATOR_THRESHOLD':
          return this.evaluateIndicatorThreshold(condition, context.indicators || {})

        case 'PRICE_CONDITION':
          return this.evaluatePriceCondition(condition, context.candle)

        case 'VOLUME_CONDITION':
          return this.evaluateVolumeCondition(condition, context.candle)

        case 'TIME_CONDITION':
          return this.evaluateTimeCondition(condition, context.marketData)

        case 'CUSTOM':
          return this.evaluateCustomCondition(condition, context)

        default:
          this.logger.warn(`Unknown condition type: ${condition.type}`)
          return false
      }
    } catch (error) {
      this.logger.error(`Error evaluating condition:`, error)
      return false
    }
  }

  /**
   * Evaluate multiple conditions with AND logic
   */
  async evaluateConditions(
    conditions: StrategyCondition[],
    context: {
      candle?: CandleData
      indicators?: Record<string, IndicatorValue>
      marketData?: Record<string, any>
      previousSignals?: StrategySignal[]
    }
  ): Promise<boolean> {
    for (const condition of conditions) {
      const result = await this.evaluateCondition(condition, context)
      if (!result) {
        return false
      }
    }
    return true
  }

  /**
   * Evaluate sequential rule (conditions must be true in sequence)
   */
  async evaluateSequentialRule(
    rule: SequentialRule,
    context: {
      candle?: CandleData
      indicators?: Record<string, IndicatorValue>
      marketData?: Record<string, any>
      previousSignals?: StrategySignal[]
      executionHistory?: StrategyExecutionLog[]
    }
  ): Promise<{ satisfied: boolean; progress: number; nextExpectedTime?: Date }> {
    const { conditions, timeWindow = 60 } = rule // 60 minutes default

    // Check if we have execution history for this rule
    const ruleExecutions = context.executionHistory?.filter(
      log => log.details?.ruleId === rule.id
    ) || []

    const completedConditions = ruleExecutions.length

    // If all conditions are already satisfied
    if (completedConditions >= conditions.length) {
      return { satisfied: true, progress: 100 }
    }

    // Get the next condition to evaluate
    const nextConditionIndex = completedConditions
    const nextCondition = conditions[nextConditionIndex]

    if (!nextCondition) {
      return { satisfied: false, progress: 0 }
    }

    // Evaluate the next condition
    const conditionMet = await this.evaluateCondition(nextCondition, context)

    if (conditionMet) {
      // Condition satisfied, update progress
      const progress = ((nextConditionIndex + 1) / conditions.length) * 100
      return {
        satisfied: nextConditionIndex + 1 >= conditions.length,
        progress,
        nextExpectedTime: nextConditionIndex + 1 < conditions.length
          ? new Date(Date.now() + timeWindow * 60 * 1000)
          : undefined
      }
    }

    // Condition not met
    return {
      satisfied: false,
      progress: (nextConditionIndex / conditions.length) * 100,
      nextExpectedTime: new Date(Date.now() + timeWindow * 60 * 1000)
    }
  }

  /**
   * Generate signal based on conditions
   */
  async generateSignal(
    signalType: 'ENTRY' | 'EXIT' | 'ADJUSTMENT',
    conditions: StrategyCondition[],
    context: {
      candle?: CandleData
      indicators?: Record<string, IndicatorValue>
      marketData?: Record<string, any>
      previousSignals?: StrategySignal[]
    }
  ): Promise<StrategySignal | null> {
    const conditionsMet = await this.evaluateConditions(conditions, context)

    if (!conditionsMet) {
      return null
    }

    // Calculate signal strength and confidence
    const strength = this.calculateSignalStrength(conditions, context)
    const confidence = this.calculateSignalConfidence(conditions, context)

    return {
      type: signalType,
      strength,
      confidence,
      data: {
        conditionsMet: conditions.length,
        candle: context.candle,
        indicators: context.indicators,
        marketData: context.marketData
      },
      timestamp: new Date()
    }
  }

  /**
   * Calculate signal strength (0-100)
   */
  private calculateSignalStrength(
    conditions: StrategyCondition[],
    context: any
  ): number {
    // Simple implementation - can be enhanced
    let strength = 50 // Base strength

    // Increase strength based on indicator alignment
    if (context.indicators) {
      const indicatorCount = Object.keys(context.indicators).length
      strength += Math.min(indicatorCount * 10, 30)
    }

    // Increase strength based on volume
    if (context.candle?.volume && context.marketData?.avgVolume) {
      const volumeRatio = context.candle.volume / context.marketData.avgVolume
      if (volumeRatio > 1.5) strength += 10
    }

    return Math.min(strength, 100)
  }

  /**
   * Calculate signal confidence (0-100)
   */
  private calculateSignalConfidence(
    conditions: StrategyCondition[],
    context: any
  ): number {
    // Simple implementation - can be enhanced
    let confidence = 60 // Base confidence

    // Increase confidence with more conditions
    confidence += Math.min(conditions.length * 5, 25)

    // Increase confidence with recent data
    if (context.candle) {
      const dataAge = Date.now() - context.candle.timestamp
      if (dataAge < 5 * 60 * 1000) { // Less than 5 minutes
        confidence += 10
      }
    }

    return Math.min(confidence, 100)
  }

  /**
   * Evaluate indicator comparison condition
   */
  private async evaluateIndicatorComparison(
    condition: StrategyCondition,
    indicators: Record<string, IndicatorValue>
  ): Promise<boolean> {
    const { leftOperand, operator, rightOperand } = condition

    const leftValue = this.getIndicatorOrFieldValue(leftOperand, indicators)
    const rightValue = this.getIndicatorOrFieldValue(rightOperand, indicators)

    if (leftValue === null || rightValue === null) {
      return false
    }

    return this.compareValues(leftValue, rightValue, operator)
  }

  private async evaluateIndicatorThreshold(
    condition: StrategyCondition,
    indicators: Record<string, IndicatorValue>
  ): Promise<boolean> {
    const { leftOperand, operator, rightOperand } = condition

    const leftValue = this.getIndicatorOrFieldValue(leftOperand, indicators)
    const rightValue = typeof rightOperand === 'number'
      ? rightOperand
      : this.getIndicatorOrFieldValue(rightOperand, indicators)

    if (leftValue === null || rightValue === null) {
      return false
    }

    return this.compareValues(leftValue, rightValue, operator)
  }

  /**
   * Evaluate price condition
   */
  private async evaluatePriceCondition(
    condition: StrategyCondition,
    candle?: CandleData
  ): Promise<boolean> {
    if (!candle) return false

    const { leftOperand, operator, rightOperand } = condition

    let leftValue: number
    switch (leftOperand) {
      case 'close':
        leftValue = candle.close
        break
      case 'open':
        leftValue = candle.open
        break
      case 'high':
        leftValue = candle.high
        break
      case 'low':
        leftValue = candle.low
        break
      default:
        return false
    }

    const rightValue = typeof rightOperand === 'number' ? rightOperand : parseFloat(rightOperand)
    return this.compareValues(leftValue, rightValue, operator)
  }

  /**
   * Evaluate volume condition
   */
  private async evaluateVolumeCondition(
    condition: StrategyCondition,
    candle?: CandleData
  ): Promise<boolean> {
    if (!candle) return false

    const { operator, rightOperand } = condition
    const volume = candle.volume
    const rightValue = typeof rightOperand === 'number' ? rightOperand : parseFloat(rightOperand)

    return this.compareValues(volume, rightValue, operator)
  }

  /**
   * Evaluate time condition
   */
  private async evaluateTimeCondition(
    condition: StrategyCondition,
    marketData?: Record<string, any>
  ): Promise<boolean> {
    const { leftOperand, operator, rightOperand } = condition

    const now = new Date()
    let timeValue: number

    switch (leftOperand) {
      case 'hour':
        timeValue = now.getHours()
        break
      case 'minute':
        timeValue = now.getMinutes()
        break
      case 'day':
        timeValue = now.getDay()
        break
      default:
        return false
    }

    const rightValue = typeof rightOperand === 'number' ? rightOperand : parseFloat(rightOperand)
    return this.compareValues(timeValue, rightValue, operator)
  }

  /**
   * Evaluate custom condition (with safe evaluation)
   */
  private async evaluateCustomCondition(
    condition: StrategyCondition,
    context: any
  ): Promise<boolean> {
    const { customLogic } = condition

    if (!customLogic) return false

    try {
      // Create a safe evaluation context
      const safeContext = {
        candle: context.candle,
        indicators: context.indicators,
        marketData: context.marketData,
        signals: context.previousSignals,
        Math,
        Date
      }

      // Use Function constructor for safe evaluation
      const evaluateFunction = new Function(
        'context',
        `with(context) { return ${customLogic}; }`
      )

      const result = evaluateFunction(safeContext)
      return Boolean(result)

    } catch (error) {
      this.logger.error(`Error evaluating custom condition:`, error)
      return false
    }
  }

  /**
   * Helper method to get indicator value
   */
  private getIndicatorOrFieldValue(
    operand: any,
    indicators: Record<string, IndicatorValue>
  ): number | null {
    if (typeof operand === 'number') {
      return operand
    }

    if (typeof operand === 'string') {
      const [indicatorKey, ...fieldParts] = operand.split('.')
      const indicator = indicators[indicatorKey]

      if (!indicator) {
        return null
      }

      if (fieldParts.length === 0) {
        return indicator.value
      }

      let current: any = indicator
      for (const part of fieldParts) {
        if (current && part in current) {
          current = current[part]
        } else if (current?.additionalData && part in current.additionalData) {
          current = current.additionalData[part]
        } else {
          return null
        }
      }

      return typeof current === 'number' ? current : null
    }

    return null
  }

  /**
   * Compare two values with operator
   */
  private compareValues(left: number, right: number, operator: string): boolean {
    switch (operator) {
      case 'GT':
        return left > right
      case 'LT':
        return left < right
      case 'GTE':
        return left >= right
      case 'LTE':
        return left <= right
      case 'EQ':
        return left === right
      case 'NEQ':
        return left !== right
      default:
        return false
    }
  }

  /**
   * Validate strategy configuration
   */
  validateStrategyConfig(config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Basic validation
    if (!config.name) errors.push('Strategy name is required')
    if (!config.underlyingSymbol) errors.push('Underlying symbol is required')
    if (!config.timeframe) errors.push('Timeframe is required')

    // Validate conditions
    if (config.conditions) {
      config.conditions.forEach((condition: StrategyCondition, index: number) => {
        if (!condition.type) {
          errors.push(`Condition ${index + 1}: type is required`)
        }
        if (!condition.operator) {
          errors.push(`Condition ${index + 1}: operator is required`)
        }
      })
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Calculate risk metrics for a potential position
   */
  calculateRiskMetrics(params: {
    entryPrice: number
    stopLoss?: number
    target?: number
    quantity: number
    capital: number
  }): {
    positionSize: number
    riskAmount: number
    rewardAmount: number
    riskRewardRatio: number
    positionSizePercent: number
  } {
    const { entryPrice, stopLoss, target, quantity, capital } = params

    const positionSize = entryPrice * quantity
    const positionSizePercent = (positionSize / capital) * 100

    let riskAmount = 0
    let rewardAmount = 0
    let riskRewardRatio = 0

    if (stopLoss) {
      riskAmount = Math.abs(entryPrice - stopLoss) * quantity
    }

    if (target) {
      rewardAmount = Math.abs(target - entryPrice) * quantity
    }

    if (riskAmount > 0) {
      riskRewardRatio = rewardAmount / riskAmount
    }

    return {
      positionSize,
      riskAmount,
      rewardAmount,
      riskRewardRatio,
      positionSizePercent
    }
  }

  /**
   * Get strategy performance metrics
   */
  calculatePerformanceMetrics(trades: any[]): {
    totalTrades: number
    winningTrades: number
    losingTrades: number
    winRate: number
    totalPnL: number
    avgProfit: number
    avgLoss: number
    profitFactor: number
    maxDrawdown: number
  } {
    if (!trades || trades.length === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalPnL: 0,
        avgProfit: 0,
        avgLoss: 0,
        profitFactor: 0,
        maxDrawdown: 0
      }
    }

    const winningTrades = trades.filter(t => t.pnl > 0)
    const losingTrades = trades.filter(t => t.pnl < 0)

    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0)
    const totalProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0)
    const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0))

    return {
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
      totalPnL,
      avgProfit: winningTrades.length > 0 ? totalProfit / winningTrades.length : 0,
      avgLoss: losingTrades.length > 0 ? totalLoss / losingTrades.length : 0,
      profitFactor: totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0,
      maxDrawdown: this.calculateMaxDrawdown(trades)
    }
  }

  /**
   * Calculate maximum drawdown
   */
  private calculateMaxDrawdown(trades: any[]): number {
    if (!trades || trades.length === 0) return 0

    let peak = 0
    let maxDrawdown = 0
    let runningPnL = 0

    for (const trade of trades) {
      runningPnL += trade.pnl
      if (runningPnL > peak) {
        peak = runningPnL
      }
      const drawdown = peak - runningPnL
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown
      }
    }

    return maxDrawdown
  }

  /**
   * Log execution event
   */
  async logExecutionEvent(eventData: {
    strategyId: string
    phase: string
    action: ActionType
    details: any
    success: boolean
    timestamp?: Date
  }): Promise<void> {
    try {
      const log = new StrategyExecutionLog()
      log.strategyId = eventData.strategyId
      log.phase = eventData.phase
      log.action = eventData.action
      log.details = eventData.details
      log.success = eventData.success
      log.timestamp = eventData.timestamp || new Date()

      // In a real implementation, this would save to database
      this.logger.log(`Strategy ${eventData.strategyId}: ${eventData.action} - ${eventData.success ? 'SUCCESS' : 'FAILED'}`)
    } catch (error) {
      this.logger.error('Failed to log execution event:', error)
    }
  }
}
