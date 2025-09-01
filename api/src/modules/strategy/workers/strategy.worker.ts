import { parentPort, workerData } from 'worker_threads'
import { StrategyConfig, EntryCondition, ExitCondition, StrategyCondition } from '../interfaces/strategy-config.interface'
import { StrategyBuildingBlocksService, CandleData, IndicatorValue } from '../services/strategy-building-blocks.service'

interface WorkerMessage {
  type: string
  strategyId: string
  data: any
  timestamp: Date
}

interface StrategyState {
  strategyId: string
  config: StrategyConfig
  currentPosition?: any
  entrySignal?: any
  lastProcessedCandle?: CandleData
  indicators: Record<string, IndicatorValue>
  marketData: Record<string, any>
  isRunning: boolean
  heartbeatInterval?: NodeJS.Timeout
}

class StrategyWorker {
  private state: StrategyState
  private strategyBlocks: StrategyBuildingBlocksService

  constructor() {
    this.state = {
      strategyId: workerData.strategyId,
      config: workerData.config,
      indicators: {},
      marketData: {},
      isRunning: false
    }

    this.strategyBlocks = new StrategyBuildingBlocksService()

    this.setupMessageHandler()
    this.startHeartbeat()
  }

  /**
   * Set up message handler from main thread
   */
  private setupMessageHandler(): void {
    if (parentPort) {
      parentPort.on('message', (message: WorkerMessage) => {
        this.handleMessage(message)
      })
    }
  }

  /**
   * Handle incoming messages
   */
  private async handleMessage(message: WorkerMessage): Promise<void> {
    try {
      switch (message.type) {
        case 'INIT':
          await this.initialize()
          break
        case 'CANDLE_UPDATE':
          await this.processCandleUpdate(message.data)
          break
        case 'ORDER_EXECUTED':
          await this.handleOrderExecuted(message.data)
          break
        case 'EXIT_EXECUTED':
          await this.handleExitExecuted(message.data)
          break
        case 'STOP':
          await this.stop()
          break
        default:
          console.warn(`Unknown message type: ${message.type}`)
      }
    } catch (error) {
      console.error(`Error handling message ${message.type}:`, error)
      this.sendMessage('ERROR', { error: error.message })
    }
  }

  /**
   * Initialize the strategy worker
   */
  private async initialize(): Promise<void> {
    console.log(`Strategy ${this.state.strategyId} worker initialized`)
    this.state.isRunning = true

    // Send initialization confirmation
    this.sendMessage('INIT_COMPLETE', {
      strategyId: this.state.strategyId,
      config: this.state.config
    })
  }

  /**
   * Process candle update and check for signals
   */
  private async processCandleUpdate(data: any): Promise<void> {
    const { candle, indicators, currentPosition, entrySignal } = data

    // Update state
    this.state.lastProcessedCandle = candle
    this.state.indicators = { ...this.state.indicators, ...indicators }
    this.state.currentPosition = currentPosition
    this.state.entrySignal = entrySignal

    // Update market data
    this.updateMarketData(candle)

    // Check for entry signals if no position
    if (!this.state.currentPosition) {
      const entrySignal = await this.checkEntryConditions()
      if (entrySignal) {
        this.sendMessage('SIGNAL_GENERATED', entrySignal)
        return
      }
    }

    // Check for exit signals if position exists
    if (this.state.currentPosition) {
      const exitSignal = await this.checkExitConditions()
      if (exitSignal) {
        this.sendMessage('SIGNAL_GENERATED', exitSignal)
        return
      }
    }

    // Update position P&L if exists
    if (this.state.currentPosition) {
      await this.updatePositionPnL()
    }
  }

  /**
   * Check entry conditions
   */
  private async checkEntryConditions(): Promise<any | null> {
    const { config, indicators, marketData } = this.state

    for (const entryCondition of config.entryConditions) {
      const result = await this.evaluateEntryCondition(entryCondition)

      if (result.satisfied) {
        return {
          type: 'ENTRY',
          conditionId: entryCondition.id,
          signalType: this.getSignalType(entryCondition),
          strength: result.strength,
          confidence: result.confidence,
          spotPrice: marketData.spotPrice,
          indicators: indicators,
          timestamp: new Date()
        }
      }
    }

    return null
  }

  /**
   * Check exit conditions
   */
  private async checkExitConditions(): Promise<any | null> {
    const { config, currentPosition } = this.state

    // Sort exit conditions by priority
    const sortedConditions = [...config.exitConditions].sort((a, b) => a.priority - b.priority)

    for (const exitCondition of sortedConditions) {
      const result = await this.evaluateExitCondition(exitCondition)

      if (result.satisfied) {
        return {
          type: 'EXIT',
          conditionId: exitCondition.id,
          exitReason: this.getExitReason(exitCondition),
          strength: result.strength,
          confidence: result.confidence,
          position: currentPosition,
          timestamp: new Date()
        }
      }
    }

    return null
  }

  /**
   * Evaluate entry condition
   */
  private async evaluateEntryCondition(condition: EntryCondition): Promise<any> {
    const { indicators, marketData } = this.state

    if (condition.type === 'SEQUENTIAL') {
      // Check primary conditions
      for (const strategyCondition of condition.conditions) {
        const satisfied = await this.evaluateStrategyCondition(strategyCondition)
        if (!satisfied) {
          return { satisfied: false }
        }
      }

      // Check confirmation if exists
      if (condition.confirmation) {
        // Wait for confirmation candle
        const confirmed = await this.checkConfirmation(condition.confirmation)
        if (!confirmed) {
          return { satisfied: false }
        }
      }

      return {
        satisfied: true,
        strength: 80,
        confidence: 75
      }
    }

    return { satisfied: false }
  }

  /**
   * Evaluate exit condition
   */
  private async evaluateExitCondition(condition: ExitCondition): Promise<any> {
    const satisfied = await this.evaluateStrategyCondition(condition.condition)

    if (satisfied) {
      return {
        satisfied: true,
        strength: 90,
        confidence: 85
      }
    }

    return { satisfied: false }
  }

  /**
   * Evaluate individual strategy condition
   */
  private async evaluateStrategyCondition(condition: StrategyCondition): Promise<boolean> {
    const { indicators, marketData } = this.state

    switch (condition.type) {
      case 'INDICATOR_COMPARISON':
        return this.evaluateIndicatorComparison(condition, indicators)

      case 'PRICE_CONDITION':
        return this.evaluatePriceCondition(condition, marketData)

      case 'VOLUME_CONDITION':
        return this.evaluateVolumeCondition(condition, marketData)

      case 'TIME_CONDITION':
        return this.evaluateTimeCondition(condition, marketData)

      case 'CUSTOM_LOGIC':
        return this.evaluateCustomLogic(condition, indicators, marketData)

      default:
        return false
    }
  }

  /**
   * Evaluate indicator comparison
   */
  private evaluateIndicatorComparison(condition: StrategyCondition, indicators: Record<string, IndicatorValue>): boolean {
    const { leftOperand, operator, rightOperand } = condition
    const indicatorValue = indicators[leftOperand]?.value

    if (indicatorValue === undefined) return false

    switch (operator) {
      case 'EQ': return indicatorValue === rightOperand
      case 'NEQ': return indicatorValue !== rightOperand
      case 'GT': return indicatorValue > rightOperand
      case 'LT': return indicatorValue < rightOperand
      case 'GTE': return indicatorValue >= rightOperand
      case 'LTE': return indicatorValue <= rightOperand
      default: return false
    }
  }

  /**
   * Evaluate price condition
   */
  private evaluatePriceCondition(condition: StrategyCondition, marketData: Record<string, any>): boolean {
    const { leftOperand, operator, rightOperand } = condition

    let leftValue: number
    switch (leftOperand) {
      case 'close': leftValue = marketData.close; break
      case 'open': leftValue = marketData.open; break
      case 'high': leftValue = marketData.high; break
      case 'low': leftValue = marketData.low; break
      case 'entry_candle_high': leftValue = this.state.entrySignal?.candle?.high; break
      case 'entry_candle_low': leftValue = this.state.entrySignal?.candle?.low; break
      default: return false
    }

    if (leftValue === undefined) return false

    const rightValue = typeof rightOperand === 'string' && rightOperand.includes('.')
      ? this.getNestedValue(marketData, rightOperand)
      : rightOperand

    switch (operator) {
      case 'GT': return leftValue > rightValue
      case 'LT': return leftValue < rightValue
      case 'EQ': return leftValue === rightValue
      case 'GTE': return leftValue >= rightValue
      case 'LTE': return leftValue <= rightValue
      default: return false
    }
  }

  /**
   * Evaluate volume condition
   */
  private evaluateVolumeCondition(condition: StrategyCondition, marketData: Record<string, any>): boolean {
    const { operator, rightOperand } = condition
    const volume = marketData.volume

    if (volume === undefined) return false

    switch (operator) {
      case 'GT': return volume > rightOperand
      case 'LT': return volume < rightOperand
      case 'GTE': return volume >= rightOperand
      case 'LTE': return volume <= rightOperand
      default: return false
    }
  }

  /**
   * Evaluate time condition
   */
  private evaluateTimeCondition(condition: StrategyCondition, marketData: Record<string, any>): boolean {
    const { leftOperand, operator, rightOperand } = condition

    let leftValue: number
    switch (leftOperand) {
      case 'day_of_week': leftValue = marketData.dayOfWeek; break
      case 'hour': leftValue = marketData.hour; break
      case 'days_to_expiry': leftValue = marketData.daysToExpiry; break
      default: return false
    }

    if (leftValue === undefined) return false

    switch (operator) {
      case 'EQ': return leftValue === rightOperand
      case 'NEQ': return leftValue !== rightOperand
      case 'GT': return leftValue > rightOperand
      case 'LT': return leftValue < rightOperand
      case 'GTE': return leftValue >= rightOperand
      case 'LTE': return leftValue <= rightOperand
      default: return false
    }
  }

  /**
   * Evaluate custom logic
   */
  private evaluateCustomLogic(condition: StrategyCondition, indicators: Record<string, IndicatorValue>, marketData: Record<string, any>): boolean {
    const { leftOperand, operator, rightOperand } = condition

    // Parse custom logic expressions
    try {
      const expression = leftOperand
      const variables = { ...indicators, ...marketData, ...this.state }

      // Simple expression evaluator
      return this.evaluateExpression(expression, variables, operator, rightOperand)
    } catch (error) {
      console.error('Error evaluating custom logic:', error)
      return false
    }
  }

  /**
   * Check confirmation condition
   */
  private async checkConfirmation(confirmation: any): Promise<boolean> {
    // This would wait for the next candle and check the confirmation condition
    // For now, return true as this is complex to implement in worker
    return true
  }

  /**
   * Update market data from candle
   */
  private updateMarketData(candle: CandleData): void {
    this.state.marketData = {
      ...this.state.marketData,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
      timestamp: candle.timestamp,
      spotPrice: candle.close,
      dayOfWeek: new Date(candle.timestamp).getDay(),
      hour: new Date(candle.timestamp).getHours(),
      daysToExpiry: this.calculateDaysToExpiry()
    }
  }

  /**
   * Update position P&L
   */
  private async updatePositionPnL(): Promise<void> {
    if (!this.state.currentPosition) return

    // This would calculate current P&L based on market data
    // For now, just send an update
    this.sendMessage('POSITION_UPDATE', {
      positionId: this.state.currentPosition.id,
      currentPnL: this.calculateCurrentPnL(),
      timestamp: new Date()
    })
  }

  /**
   * Calculate current P&L
   */
  private calculateCurrentPnL(): number {
    // Mock P&L calculation
    return Math.random() * 1000 - 500
  }

  /**
   * Calculate days to expiry
   */
  private calculateDaysToExpiry(): number {
    // Mock calculation
    return Math.floor(Math.random() * 7) + 1
  }

  /**
   * Handle order execution
   */
  private async handleOrderExecuted(data: any): Promise<void> {
    const { orderResult, position } = data
    this.state.currentPosition = position

    console.log(`Order executed for strategy ${this.state.strategyId}:`, orderResult)
  }

  /**
   * Handle exit execution
   */
  private async handleExitExecuted(data: any): Promise<void> {
    const { exitResults, position } = data
    this.state.currentPosition = undefined
    this.state.entrySignal = undefined

    console.log(`Exit executed for strategy ${this.state.strategyId}:`, exitResults)
  }

  /**
   * Get signal type from entry condition
   */
  private getSignalType(condition: EntryCondition): string {
    if (condition.id.includes('bullish')) {
      return 'BULL_PUT_SPREAD'
    } else if (condition.id.includes('bearish')) {
      return 'BEAR_CALL_SPREAD'
    }
    return 'UNKNOWN'
  }

  /**
   * Get exit reason from exit condition
   */
  private getExitReason(condition: ExitCondition): string {
    return condition.name.toLowerCase().replace(/\s+/g, '_')
  }

  /**
   * Evaluate custom expression
   */
  private evaluateExpression(expression: string, variables: any, operator: string, rightOperand: any): boolean {
    // Simple expression evaluator for custom logic
    try {
      // Replace variable names with values
      let processedExpression = expression
      for (const [key, value] of Object.entries(variables)) {
        if (typeof value === 'number' || typeof value === 'boolean') {
          processedExpression = processedExpression.replace(new RegExp(`\\b${key}\\b`, 'g'), value.toString())
        }
      }

      // Evaluate the expression
      const result = eval(processedExpression)

      // Apply operator
      switch (operator) {
        case 'GT': return result > rightOperand
        case 'LT': return result < rightOperand
        case 'EQ': return result === rightOperand
        case 'GTE': return result >= rightOperand
        case 'LTE': return result <= rightOperand
        default: return false
      }
    } catch (error) {
      console.error('Expression evaluation error:', error)
      return false
    }
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  /**
   * Send message to main thread
   */
  private sendMessage(type: string, data: any): void {
    if (parentPort) {
      parentPort.postMessage({
        type,
        strategyId: this.state.strategyId,
        data,
        timestamp: new Date()
      })
    }
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    this.state.heartbeatInterval = setInterval(() => {
      this.sendMessage('HEARTBEAT', {
        timestamp: new Date(),
        isRunning: this.state.isRunning,
        hasPosition: !!this.state.currentPosition
      })
    }, 30000) // 30 seconds
  }

  /**
   * Stop the worker
   */
  private async stop(): Promise<void> {
    console.log(`Stopping strategy ${this.state.strategyId} worker`)

    this.state.isRunning = false

    if (this.state.heartbeatInterval) {
      clearInterval(this.state.heartbeatInterval)
    }

    // Send stop confirmation
    this.sendMessage('STOPPED', {
      strategyId: this.state.strategyId,
      timestamp: new Date()
    })

    // Exit the worker
    process.exit(0)
  }
}

// Start the worker
new StrategyWorker()
