import { Injectable, Logger } from '@nestjs/common'
import { Inject } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import type { MarketDataProvider } from '../../trading/interfaces/data-provider.interface'
import type { OrderExecutionProvider } from '../../trading/interfaces/order-execution.interface'
import { EmaGapAtrStrategyService } from '../../strategy/services/ema-gap-atr-strategy.service'
import { BacktestValidationService } from './backtest-validation.service'
import { BacktestSafetyService } from './backtest-safety.service'
// import { BacktestDataService } from './backtest-data.service'
// import { BacktestMetricsService } from './backtest-metrics.service'
import { BacktestRun } from '../entities/backtest-run.entity'
import { BacktestResult } from '../entities/backtest-result.entity'
import { BacktestTrade } from '../entities/backtest-trade.entity'
import { BacktestConfig, BacktestResult as BacktestResultInterface } from '../interfaces/backtest-config.interface'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { BacktestDataService } from './backtest-data.service'
import { BacktestMetricsService } from './backtest-metrics.service'

/**
 * Backtest Orchestrator Service
 * 
 * This service coordinates backtesting with comprehensive safety checks,
 * validation, and financial protection mechanisms. It ensures that
 * backtests are safe and reliable before execution.
 */
@Injectable()
export class BacktestOrchestratorService {
  private readonly logger = new Logger(BacktestOrchestratorService.name)

  constructor(
    @Inject('DATA_PROVIDER') private readonly dataProvider: MarketDataProvider,
    @Inject('ORDER_EXECUTION') private readonly orderExecution: OrderExecutionProvider,
    private readonly strategyService: EmaGapAtrStrategyService,
    private readonly validationService: BacktestValidationService,
    private readonly safetyService: BacktestSafetyService,
    private readonly dataService: BacktestDataService,
    private readonly metricsService: BacktestMetricsService,
    @InjectRepository(BacktestRun)
    private readonly backtestRunRepository: Repository<BacktestRun>,
    @InjectRepository(BacktestResult)
    private readonly backtestResultRepository: Repository<BacktestResult>,
    @InjectRepository(BacktestTrade)
    private readonly backtestTradeRepository: Repository<BacktestTrade>,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Run a complete backtest with safety checks
   */
  async runBacktest(config: BacktestConfig): Promise<BacktestResultInterface> {
    // Convert string dates to Date objects if needed
    const startDate = typeof config.startDate === 'string' ? new Date(config.startDate) : config.startDate
    const endDate = typeof config.endDate === 'string' ? new Date(config.endDate) : config.endDate
    
    this.logger.log(`Starting backtest for ${config.symbol} from ${startDate} to ${endDate}`)

    try {
      // Step 1: Validate configuration
      const validation = this.validationService.validateBacktestConfig(config)
      if (!validation.isValid) {
        throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`)
      }

      if (validation.warnings.length > 0) {
        this.logger.warn(`Configuration warnings: ${validation.warnings.join(', ')}`)
      }

      // Step 2: Perform safety checks
      const safetyReport = await this.safetyService.performSafetyChecks(config)
      if (!this.safetyService.canProceedSafely(safetyReport)) {
        throw new Error(`Safety checks failed: ${safetyReport.checks.filter(c => c.severity === 'CRITICAL').map(c => c.message).join(', ')}`)
      }

      this.logger.log(`Safety checks passed: ${this.safetyService.getSafetySummary(safetyReport)}`)

      // Step 3: Check data availability
      const dataValidation = await this.validationService.validateDataAvailability(
        config.symbol,
        config.timeframe,
        startDate,
        endDate
      )

      if (!dataValidation.isValid) {
        throw new Error(`Data validation failed: ${dataValidation.errors.join(', ')}`)
      }

      // Step 4: Load historical data
      const candles = await this.dataProvider.getHistoricalCandles(
        config.symbol,
        config.timeframe,
        startDate,
        endDate
      )

      if (candles.length === 0) {
        throw new Error('No historical data available for backtesting')
      }

      this.logger.log(`Loaded ${candles.length} candles for backtesting`)

      // Step 5: Run backtest with safety monitoring
      const result = await this.executeBacktest(config, candles)

      this.logger.log(`Backtest completed. Total return: ${result.totalReturnPercentage.toFixed(2)}%`)
      return result

    } catch (error) {
      this.logger.error('Backtest failed:', error)
      throw error
    }
  }

  /**
   * Execute the actual backtest with monitoring
   */
  private async executeBacktest(config: BacktestConfig, candles: any[]): Promise<BacktestResultInterface> {
    const trades: any[] = []
    const equityCurve: any[] = []
    const activeTrades: any[] = [] // Track active trades
    let currentBalance = config.initialBalance
    let peakBalance = config.initialBalance
    let maxDrawdown = 0

    // Process each candle with safety monitoring
    for (let i = 0; i < candles.length; i++) {
      try {
        const currentCandles = candles.slice(0, i + 1)
        
        // Run strategy evaluation
        const evaluation = this.strategyService.evaluate(config.strategyConfig, currentCandles)
        
        // Execute signals with safety checks
        for (const signal of evaluation.signals) {
          if (signal.type === 'ENTRY') {
            // Check if we can afford the trade
            const tradeCost = signal.data.price * (signal.data.quantity || 1)
            if (tradeCost > currentBalance * 0.1) { // Max 10% of balance per trade
              this.logger.warn(`Trade rejected: cost ${tradeCost} exceeds 10% of balance`)
              continue
            }

            const orderResult = await this.orderExecution.placeBuyOrder({
              symbol: signal.data.symbol,
              quantity: signal.data.quantity || 1,
              price: signal.data.price,
              orderType: 'MARKET',
              product: 'MIS',
              validity: 'DAY'
            })

            if (orderResult.success) {
              this.logger.debug(`Entry signal executed at ${signal.data.price}`)

              // Track active trade
              activeTrades.push({
                symbol: signal.data.symbol,
                direction: signal.data.direction,
                entryPrice: signal.data.price,
                quantity: signal.data.quantity || 1,
                entryTime: candles[i].timestamp
              })
            }
          } else if (signal.type === 'EXIT') {
            // Find matching active trade and close it
            const matchingTradeIndex = activeTrades.findIndex(
              trade => trade.symbol === signal.data.symbol && trade.direction === signal.data.direction
            )

            if (matchingTradeIndex !== -1) {
              const trade = activeTrades[matchingTradeIndex]

              const orderResult = await this.orderExecution.placeSellOrder({
                symbol: signal.data.symbol,
                quantity: trade.quantity,
                price: signal.data.price,
                orderType: 'MARKET',
                product: 'MIS',
                validity: 'DAY'
              })

              if (orderResult.success) {
                this.logger.debug(`Exit signal executed at ${signal.data.price}`)
                // Trade will be closed by the position tracking logic below
              }
            }
          }
        }

        // Update balance and equity with safety checks
        const positions = await this.orderExecution.getPositions()
        const currentEquity = this.calculateEquity(currentBalance, positions, candles[i])

        // Check for position changes (trades closing)
        for (let j = activeTrades.length - 1; j >= 0; j--) {
          const trade = activeTrades[j]
          const position = positions.find(p => p.symbol === trade.symbol)

          // If position is closed or quantity reduced, close the trade
          if (!position || position.quantity === 0) {
            const exitPrice = candles[i].close
            const pnl = (exitPrice - trade.entryPrice) * trade.quantity
            const pnlPercentage = (pnl / (trade.entryPrice * Math.abs(trade.quantity))) * 100
            const duration = candles[i].timestamp - trade.entryTime

            const completedTrade = {
              entryTime: new Date(trade.entryTime),
              exitTime: new Date(candles[i].timestamp),
              symbol: trade.symbol,
              direction: trade.direction,
              entryPrice: trade.entryPrice,
              exitPrice,
              quantity: Math.abs(trade.quantity),
              pnl,
              pnlPercentage,
              duration
            }

            trades.push(completedTrade)
            activeTrades.splice(j, 1)
            this.logger.debug(`Trade closed: ${trade.direction} ${trade.symbol} P&L: ${pnl.toFixed(2)} (${pnlPercentage.toFixed(2)}%)`)
          } else if (Math.abs(position.quantity) < Math.abs(trade.quantity)) {
            // Partial position closure
            const exitPrice = candles[i].close
            const exitQuantity = Math.abs(trade.quantity) - Math.abs(position.quantity)
            const pnl = (exitPrice - trade.entryPrice) * exitQuantity
            const pnlPercentage = (pnl / (trade.entryPrice * exitQuantity)) * 100
            const duration = candles[i].timestamp - trade.entryTime

            const completedTrade = {
              entryTime: new Date(trade.entryTime),
              exitTime: new Date(candles[i].timestamp),
              symbol: trade.symbol,
              direction: trade.direction,
              entryPrice: trade.entryPrice,
              exitPrice,
              quantity: exitQuantity,
              pnl,
              pnlPercentage,
              duration
            }

            trades.push(completedTrade)
            // Update trade quantity to reflect remaining position
            trade.quantity = position.quantity
            this.logger.debug(`Partial trade closed: ${trade.direction} ${trade.symbol} P&L: ${pnl.toFixed(2)} (${pnlPercentage.toFixed(2)}%)`)
          }
        }

        // Check for excessive drawdown
        if (currentEquity > peakBalance) {
          peakBalance = currentEquity
        }
        const drawdown = (peakBalance - currentEquity) / peakBalance
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown
        }

        // Circuit breaker: Stop if drawdown exceeds 50%
        if (drawdown > 0.5) {
          this.logger.error(`Circuit breaker triggered: drawdown ${(drawdown * 100).toFixed(2)}% exceeds 50%`)
          break
        }

        equityCurve.push({
          timestamp: new Date(candles[i].timestamp),
          balance: currentBalance,
          equity: currentEquity,
          drawdown: drawdown
        })

        // Log progress every 100 candles
        if (i % 100 === 0) {
          this.logger.debug(`Processed ${i}/${candles.length} candles`)
        }

      } catch (error) {
        this.logger.error(`Error processing candle ${i}:`, error)
        // Continue with next candle instead of failing entire backtest
        continue
      }
    }

    // Calculate final results with safety validation
    const finalBalance = await this.orderExecution.getBalance()
    const totalReturn = finalBalance.totalBalance - config.initialBalance
    const totalReturnPercentage = (totalReturn / config.initialBalance) * 100

    // Validate results for sanity
    if (Math.abs(totalReturnPercentage) > 1000) { // 1000% return
      this.logger.warn(`Extreme return detected: ${totalReturnPercentage.toFixed(2)}% - results may be unreliable`)
    }

    const result: BacktestResultInterface = {
      totalReturn,
      totalReturnPercentage,
      maxDrawdown,
      winRate: this.calculateWinRate(trades),
      totalTrades: trades.length,
      winningTrades: trades.filter(t => t.pnl > 0).length,
      losingTrades: trades.filter(t => t.pnl < 0).length,
      averageWin: this.calculateAverageWin(trades),
      averageLoss: this.calculateAverageLoss(trades),
      profitFactor: this.calculateProfitFactor(trades),
      sharpeRatio: this.calculateSharpeRatio(equityCurve),
      trades: trades,
      equityCurve
    }

    return result
  }

  /**
   * Calculate current equity including positions
   */
  private calculateEquity(balance: number, positions: any[], currentCandle: any): number {
    let equity = balance
    
    for (const position of positions) {
      const unrealizedPnl = (currentCandle.close - position.averagePrice) * position.quantity
      equity += unrealizedPnl
    }
    
    return equity
  }

  /**
   * Calculate win rate
   */
  private calculateWinRate(trades: any[]): number {
    if (trades.length === 0) return 0
    const winningTrades = trades.filter(t => t.pnl > 0).length
    return winningTrades / trades.length
  }

  /**
   * Calculate average win
   */
  private calculateAverageWin(trades: any[]): number {
    const winningTrades = trades.filter(t => t.pnl > 0)
    if (winningTrades.length === 0) return 0
    return winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length
  }

  /**
   * Calculate average loss
   */
  private calculateAverageLoss(trades: any[]): number {
    const losingTrades = trades.filter(t => t.pnl < 0)
    if (losingTrades.length === 0) return 0
    return losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length
  }

  /**
   * Calculate profit factor
   */
  private calculateProfitFactor(trades: any[]): number {
    const totalWin = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0)
    const totalLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0))
    return totalLoss === 0 ? 0 : totalWin / totalLoss
  }

  /**
   * Calculate Sharpe ratio
   */
  private calculateSharpeRatio(equityCurve: any[]): number {
    if (equityCurve.length < 2) return 0

    const returns: number[] = []
    for (let i = 1; i < equityCurve.length; i++) {
      const returnRate = (equityCurve[i].equity - equityCurve[i-1].equity) / equityCurve[i-1].equity
      returns.push(returnRate)
    }

    const averageReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - averageReturn, 2), 0) / returns.length
    const standardDeviation = Math.sqrt(variance)

    return standardDeviation === 0 ? 0 : averageReturn / standardDeviation
  }

  /**
   * Run NIFTY backtest with historical data
   */
  async runNIFTYBacktest(config?: Partial<BacktestConfig>): Promise<BacktestResultInterface> {
    try {
      this.logger.log('Starting NIFTY backtest...')

      // Default configuration for NIFTY backtest
      const defaultConfig: BacktestConfig = {
        symbol: 'NIFTY',
        timeframe: '15m',
        startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
        endDate: new Date(),
        initialBalance: 1000000,
        strategyConfig: {
          id: 'ema-gap-atr-nifty-backtest',
          name: 'EMA Gap ATR Strategy - NIFTY Backtest',
          symbol: 'NIFTY',
          timeframe: '15m',
          emaFastPeriod: 9,
          emaSlowPeriod: 20,
          atrPeriod: 14,
          minGapThreshold: 0,
          minGapMultiplier: 0.3,
          slopeLookback: 3,
          slopeMin: 0,
          rsiPeriod: 14,
          rsiThreshold: 50,
          adxPeriod: 14,
          adxThreshold: 25,
          pyramiding: {
            multiplier: 0.6,
            maxLots: 3
          },
          risk: {
            maxLossPerLot: 10000,
            trailingAtrMultiplier: 1
          },
          options: {
            enabled: true,
            strikeSelection: {
              callStrikes: ['ATM', 'ATM+1'],
              putStrikes: ['ATM', 'ATM-1'],
              expiryDays: 7
            },
            lotSize: 50,
            strikeIncrement: 50
          }
        }
      }

      const finalConfig = { ...defaultConfig, ...config }

      return await this.runBacktest(finalConfig)
    } catch (error) {
      this.logger.error('Failed to run NIFTY backtest:', error)
      throw error
    }
  }
}
