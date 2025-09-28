import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CsvDataProvider } from '../../trading/providers/csv-data-provider';
import { MockOrderExecutionProvider } from '../../trading/providers/mock-order-execution';
import { EmaGapAtrStrategyService } from '../../strategy/services/ema-gap-atr-strategy.service';
import { AdvancedATRStrategyService } from '../../strategy/services/advanced-atr-strategy.service';
import { BacktestValidationService } from './backtest-validation.service';
import { BacktestSafetyService } from './backtest-safety.service';
// import { BacktestDataService } from './backtest-data.service'
// import { BacktestMetricsService } from './backtest-metrics.service'
import { BacktestRun } from '../entities/backtest-run.entity';
import { BacktestResult } from '../entities/backtest-result.entity';
import { BacktestTrade } from '../entities/backtest-trade.entity';
import {
  BacktestConfig,
  BacktestResult as BacktestResultInterface,
} from '../interfaces/backtest-config.interface';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BacktestDataService } from './backtest-data.service';
import { BacktestMetricsService } from './backtest-metrics.service';
import { EmaGapAtrConfig } from '../../strategy/services/ema-gap-atr-strategy.service';

/**
 * Backtest Orchestrator Service
 *
 * This service coordinates backtesting with comprehensive safety checks,
 * validation, and financial protection mechanisms. It ensures that
 * backtests are safe and reliable before execution.
 */
@Injectable()
export class BacktestOrchestratorService {
  private readonly logger = new Logger(BacktestOrchestratorService.name);

  constructor(
    private readonly dataProvider: CsvDataProvider,
    private readonly orderExecution: MockOrderExecutionProvider,
    private readonly strategyService: EmaGapAtrStrategyService,
    private readonly advancedATRStrategyService: AdvancedATRStrategyService,
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
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.debug(`BacktestOrchestratorService initialized`);
    this.logger.debug(`Data provider type: ${typeof this.dataProvider}`);
    this.logger.debug(`Data provider constructor: ${this.dataProvider?.constructor?.name}`);
    this.logger.debug(`Order execution type: ${typeof this.orderExecution}`);
    this.logger.debug(`Order execution constructor: ${this.orderExecution?.constructor?.name}`);
  }

  /**
   * Run a complete backtest with safety checks
   */
  async runBacktest(config: BacktestConfig): Promise<BacktestResultInterface> {
    // Convert string dates to Date objects if needed
    const startDate =
      typeof config.startDate === 'string'
        ? new Date(config.startDate)
        : config.startDate;
    const endDate =
      typeof config.endDate === 'string'
        ? new Date(config.endDate)
        : config.endDate;

    this.logger.log(
      `Starting backtest for ${config.symbol} from ${startDate} to ${endDate}`,
    );

    try {
      // Step 1: Validate configuration
      const validation = this.validationService.validateBacktestConfig(config);
      if (!validation.isValid) {
        throw new Error(
          `Configuration validation failed: ${validation.errors.join(', ')}`,
        );
      }

      if (validation.warnings.length > 0) {
        this.logger.warn(
          `Configuration warnings: ${validation.warnings.join(', ')}`,
        );
      }

      // Step 2: Perform safety checks
      const safetyReport = await this.safetyService.performSafetyChecks(config);
      if (!this.safetyService.canProceedSafely(safetyReport)) {
        throw new Error(
          `Safety checks failed: ${safetyReport.checks
            .filter((c) => c.severity === 'CRITICAL')
            .map((c) => c.message)
            .join(', ')}`,
        );
      }

      this.logger.log(
        `Safety checks passed: ${this.safetyService.getSafetySummary(safetyReport)}`,
      );

      // Step 3: Check data availability
      const dataValidation =
        await this.validationService.validateDataAvailability(
          config.symbol,
          config.timeframe,
          startDate,
          endDate,
        );

      if (!dataValidation.isValid) {
        throw new Error(
          `Data validation failed: ${dataValidation.errors.join(', ')}`,
        );
      }

      // Step 4: Load historical data
      this.logger.debug(`Data provider type: ${typeof this.dataProvider}`);
      this.logger.debug(`Data provider constructor: ${this.dataProvider?.constructor?.name}`);
      
      const candles = await this.dataProvider.getHistoricalCandles(
        config.symbol,
        config.timeframe,
        startDate,
        endDate,
      );

      if (candles.length === 0) {
        throw new Error('No historical data available for backtesting');
      }

      this.logger.log(`Loaded ${candles.length} candles for backtesting`);

      // Step 5: Run backtest with safety monitoring
      const result = await this.executeBacktest(config, candles);

      this.logger.log(
        `Backtest completed. Total return: ${result.totalReturnPercentage.toFixed(2)}%`,
      );
      return result;
    } catch (error) {
      this.logger.error('Backtest failed:', error);
      throw error;
    }
  }

  /**
   * Execute the actual backtest with monitoring
   */
  private async executeBacktest(
    config: BacktestConfig,
    candles: any[],
  ): Promise<BacktestResultInterface> {
    const trades: any[] = [];
    const equityCurve: any[] = [];
    const activeTrades: any[] = []; // Track active trades
    const currentBalance = config.initialBalance;
    let peakBalance = config.initialBalance;
    let maxDrawdown = 0;
    let currentLots = 0; // Track current position size
    const entryPrice: number = 0; // Track entry price for pyramiding

    // Process each candle with safety monitoring
    for (let i = 0; i < candles.length; i++) {
      try {
        const currentCandles = candles.slice(0, i + 1);

        // Run strategy evaluation
        this.logger.debug(
          `Running strategy evaluation with config: ${JSON.stringify(config.strategyConfig)}`,
        );
        this.logger.debug(`Current candles length: ${currentCandles.length}`);
        this.logger.debug(`Latest candle: ${JSON.stringify(currentCandles[currentCandles.length - 1])}`);
        
        const strategyConfig = {
          ...config.strategyConfig,
          symbol: config.symbol,
        };
        
        // Choose strategy service based on config
        let evaluation;
        if (strategyConfig.atrDeclineThreshold !== undefined || strategyConfig.atrExpansionThreshold !== undefined) {
          // Use advanced ATR strategy for ATR-based configurations
          this.logger.debug('Using Advanced ATR Strategy Service');
          
          // Convert to AdvancedATRConfig format
          const advancedConfig = {
            ...strategyConfig,
            atrDeclineThreshold: strategyConfig.atrDeclineThreshold || 0.1,
            atrExpansionThreshold: strategyConfig.atrExpansionThreshold || 0.1,
          };
          
          evaluation = this.advancedATRStrategyService.evaluate(
            advancedConfig,
            currentCandles,
          );
        } else {
          // Use standard EMA-Gap-ATR strategy
          this.logger.debug('Using Standard EMA-Gap-ATR Strategy Service');
          evaluation = this.strategyService.evaluate(
            strategyConfig,
            currentCandles,
          );
        }
        
        this.logger.debug(`Strategy evaluation result: ${JSON.stringify(evaluation, null, 2)}`);

        if (!evaluation || !Array.isArray(evaluation.signals)) {
          this.logger.error(
            `Strategy evaluation returned invalid payload: ${JSON.stringify(evaluation, null, 2)}`,
          );
          continue;
        }
        
        this.logger.debug(`Strategy evaluation returned ${evaluation.signals.length} signals`);

        // Execute signals with safety checks
        for (const signal of evaluation.signals) {
          if (!signal || !signal.data) {
            this.logger.error(
              `Skipping malformed signal: ${JSON.stringify(signal)}`,
            );
            continue;
          }

          this.logger.debug(`Processing signal: ${JSON.stringify(signal)}`);
          
          // Debug signal structure
          this.logger.debug(`Signal type: ${signal.type}`);
          this.logger.debug(`Signal data: ${JSON.stringify(signal.data)}`);
          
          if (signal.type === 'ENTRY') {
            const direction = signal.data.direction;
            const entryPrice = signal.data.price;
            const quantity = config.strategyConfig.positionSize; // Use configured position size

            // Check if we can afford the trade
            const tradeCost = entryPrice * quantity;
            if (tradeCost > currentBalance * 0.5) {
              // Max 50% of balance per trade (more reasonable for options trading)
              this.logger.warn(
                `Trade rejected: cost ${tradeCost} exceeds 50% of balance`,
              );
              continue;
            }

            // Check pyramiding limits
            if (
              config.strategyConfig.pyramidingEnabled &&
              currentLots >= config.strategyConfig.maxLots
            ) {
              this.logger.warn(
                `Pyramiding limit reached: ${currentLots}/${config.strategyConfig.maxLots}`,
              );
              continue;
            }

            const orderResult = await this.orderExecution.placeBuyOrder({
              symbol: signal.data.symbol,
              quantity: quantity,
              price: entryPrice,
              orderType: 'MARKET',
              product: 'MIS',
              validity: 'DAY',
            });

            if (orderResult.success) {
              this.logger.debug(
                `Entry signal executed: ${direction} at ${entryPrice} (quantity: ${quantity})`,
              );

              // Track active trade
              activeTrades.push({
                symbol: signal.data.symbol,
                direction: direction,
                entryPrice: entryPrice,
                quantity: quantity,
                entryTime: candles[i].timestamp,
              });

              currentLots += quantity;
              // Track the first entry price for pyramiding calculations
            }
          } else if (signal.type === 'EXIT') {
            // Exit all positions of this direction
            const tradesToClose = activeTrades.filter(
              (trade) => trade.direction === signal.data.direction,
            );

            for (const trade of tradesToClose) {
              const orderResult = await this.orderExecution.placeSellOrder({
                symbol: trade.symbol,
                quantity: Math.abs(trade.quantity),
                price: signal.data.price,
                orderType: 'MARKET',
                product: 'MIS',
                validity: 'DAY',
              });

              if (orderResult.success) {
                this.logger.debug(
                  `Exit signal executed: ${trade.direction} at ${signal.data.price}`,
                );
                currentLots -= Math.abs(trade.quantity);
              }
            }
          }
        }

        // Update balance and equity with safety checks
        const positions = await this.orderExecution.getPositions();
        const currentEquity = this.calculateEquity(
          currentBalance,
          positions,
          candles[i],
        );

        // Check for position changes (trades closing) - this handles cases where positions are closed outside of exit signals
        for (let j = activeTrades.length - 1; j >= 0; j--) {
          const trade = activeTrades[j];
          const position = positions.find((p) => p.symbol === trade.symbol);

          // If position is closed or quantity changed significantly, close the trade
          if (
            !position ||
            position.quantity === 0 ||
            Math.abs(position.quantity) < Math.abs(trade.quantity) * 0.9
          ) {
            const exitPrice = candles[i].close;
            const pnl = (exitPrice - trade.entryPrice) * trade.quantity;
            const pnlPercentage =
              (pnl / (trade.entryPrice * Math.abs(trade.quantity))) * 100;
            const duration = candles[i].timestamp - trade.entryTime;

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
              duration,
            };

            trades.push(completedTrade);
            activeTrades.splice(j, 1);
            this.logger.debug(
              `Trade closed: ${trade.direction} ${trade.symbol} P&L: ${pnl.toFixed(2)} (${pnlPercentage.toFixed(2)}%)`,
            );
          }
        }

        // Check for excessive drawdown
        if (currentEquity > peakBalance) {
          peakBalance = currentEquity;
        }
        const drawdown = (peakBalance - currentEquity) / peakBalance;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }

        // Time-based exit check
        const currentTime = new Date(candles[i].timestamp);
        const exitTime = new Date(currentTime);
        const [hours, minutes] = config.strategyConfig.misExitTime
          .split(':')
          .map(Number);
        exitTime.setHours(hours, minutes, 0, 0);

        if (currentTime >= exitTime && activeTrades.length > 0) {
          this.logger.log(
            `Time-based exit triggered at ${config.strategyConfig.misExitTime}`,
          );

          // Exit all active positions
          for (const trade of activeTrades) {
            const orderResult = await this.orderExecution.placeSellOrder({
              symbol: trade.symbol,
              quantity: Math.abs(trade.quantity),
              price: candles[i].close,
              orderType: 'MARKET',
              product: 'MIS',
              validity: 'DAY',
            });

            if (orderResult.success) {
              const pnl =
                (candles[i].close - trade.entryPrice) * trade.quantity;
              const pnlPercentage =
                (pnl / (trade.entryPrice * Math.abs(trade.quantity))) * 100;

              const completedTrade = {
                entryTime: new Date(trade.entryTime),
                exitTime: new Date(candles[i].timestamp),
                symbol: trade.symbol,
                direction: trade.direction,
                entryPrice: trade.entryPrice,
                exitPrice: candles[i].close,
                quantity: Math.abs(trade.quantity),
                pnl,
                pnlPercentage,
                duration: candles[i].timestamp - trade.entryTime,
              };

              trades.push(completedTrade);
              this.logger.debug(
                `Time-based exit: ${trade.direction} ${trade.symbol} P&L: ${pnl.toFixed(2)} (${pnlPercentage.toFixed(2)}%)`,
              );
            }
          }

          activeTrades.length = 0; // Clear all active trades
          currentLots = 0;
        }

        // Capital protection: Check if total P&L is below max loss threshold
        const totalPnL = currentEquity - config.initialBalance;
        const maxAllowedLoss =
          -config.initialBalance * config.strategyConfig.maxLossPct;

        if (totalPnL <= maxAllowedLoss) {
          this.logger.error(
            `Capital protection triggered: P&L ${totalPnL.toFixed(2)} below max loss ${maxAllowedLoss.toFixed(2)}`,
          );

          // Force exit all positions
          for (const trade of activeTrades) {
            const orderResult = await this.orderExecution.placeSellOrder({
              symbol: trade.symbol,
              quantity: Math.abs(trade.quantity),
              price: candles[i].close,
              orderType: 'MARKET',
              product: 'MIS',
              validity: 'DAY',
            });

            if (orderResult.success) {
              const pnl =
                (candles[i].close - trade.entryPrice) * trade.quantity;
              const completedTrade = {
                entryTime: new Date(trade.entryTime),
                exitTime: new Date(candles[i].timestamp),
                symbol: trade.symbol,
                direction: trade.direction,
                entryPrice: trade.entryPrice,
                exitPrice: candles[i].close,
                quantity: Math.abs(trade.quantity),
                pnl,
                pnlPercentage:
                  (pnl / (trade.entryPrice * Math.abs(trade.quantity))) * 100,
                duration: candles[i].timestamp - trade.entryTime,
              };

              trades.push(completedTrade);
            }
          }

          activeTrades.length = 0;
          currentLots = 0;
          break;
        }

        // Circuit breaker: Stop if drawdown exceeds 50%
        if (drawdown > 0.5) {
          this.logger.error(
            `Circuit breaker triggered: drawdown ${(drawdown * 100).toFixed(2)}% exceeds 50%`,
          );
          break;
        }

        equityCurve.push({
          timestamp: new Date(candles[i].timestamp),
          balance: currentBalance,
          equity: currentEquity,
          drawdown: drawdown,
        });

        // Log progress every 100 candles
        if (i % 100 === 0) {
          this.logger.debug(`Processed ${i}/${candles.length} candles`);
        }
      } catch (error) {
        this.logger.error(`Error processing candle ${i}:`, error);
        // Continue with next candle instead of failing entire backtest
        continue;
      }
    }

    // Calculate final results with safety validation
    const finalBalance = await this.orderExecution.getBalance();
    const totalReturn = finalBalance.totalBalance - config.initialBalance;
    const totalReturnPercentage = (totalReturn / config.initialBalance) * 100;

    // Validate results for sanity
    if (Math.abs(totalReturnPercentage) > 1000) {
      // 1000% return
      this.logger.warn(
        `Extreme return detected: ${totalReturnPercentage.toFixed(2)}% - results may be unreliable`,
      );
    }

    const result: BacktestResultInterface = {
      totalReturn,
      totalReturnPercentage,
      maxDrawdown,
      winRate: this.calculateWinRate(trades),
      totalTrades: trades.length,
      winningTrades: trades.filter((t) => t.pnl > 0).length,
      losingTrades: trades.filter((t) => t.pnl < 0).length,
      averageWin: this.calculateAverageWin(trades),
      averageLoss: this.calculateAverageLoss(trades),
      profitFactor: this.calculateProfitFactor(trades),
      sharpeRatio: this.calculateSharpeRatio(equityCurve),
      trades: trades,
      equityCurve,
    };

    return result;
  }

  /**
   * Calculate current equity including positions
   */
  private calculateEquity(
    balance: number,
    positions: any[],
    currentCandle: any,
  ): number {
    let equity = balance;

    for (const position of positions) {
      const unrealizedPnl =
        (currentCandle.close - position.averagePrice) * position.quantity;
      equity += unrealizedPnl;
    }

    return equity;
  }

  /**
   * Calculate win rate
   */
  private calculateWinRate(trades: any[]): number {
    if (trades.length === 0) return 0;
    const winningTrades = trades.filter((t) => t.pnl > 0).length;
    return winningTrades / trades.length;
  }

  /**
   * Calculate average win
   */
  private calculateAverageWin(trades: any[]): number {
    const winningTrades = trades.filter((t) => t.pnl > 0);
    if (winningTrades.length === 0) return 0;
    return (
      winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length
    );
  }

  /**
   * Calculate average loss
   */
  private calculateAverageLoss(trades: any[]): number {
    const losingTrades = trades.filter((t) => t.pnl < 0);
    if (losingTrades.length === 0) return 0;
    return (
      losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length
    );
  }

  /**
   * Calculate profit factor
   */
  private calculateProfitFactor(trades: any[]): number {
    const totalWin = trades
      .filter((t) => t.pnl > 0)
      .reduce((sum, t) => sum + t.pnl, 0);
    const totalLoss = Math.abs(
      trades.filter((t) => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0),
    );
    return totalLoss === 0 ? 0 : totalWin / totalLoss;
  }

  /**
   * Calculate Sharpe ratio
   */
  private calculateSharpeRatio(equityCurve: any[]): number {
    if (equityCurve.length < 2) return 0;

    const returns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const returnRate =
        (equityCurve[i].equity - equityCurve[i - 1].equity) /
        equityCurve[i - 1].equity;
      returns.push(returnRate);
    }

    const averageReturn =
      returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - averageReturn, 2), 0) /
      returns.length;
    const standardDeviation = Math.sqrt(variance);

    return standardDeviation === 0 ? 0 : averageReturn / standardDeviation;
  }

  /**
   * Run NIFTY backtest with historical data
   */
  async runNIFTYBacktest(
    config?: Partial<BacktestConfig>,
  ): Promise<BacktestResultInterface> {
    try {
      this.logger.log('Starting NIFTY backtest...');

      // Default configuration for NIFTY backtest (v2 strategy)
      const defaultStrategyConfig: EmaGapAtrConfig = {
        id: 'ema-gap-atr-nifty-backtest-v2',
        name: 'EMA Gap ATR Strategy v2 - NIFTY Backtest',
        symbol: 'NIFTY',
        timeframe: '15m',

        // EMA Parameters
        emaFastPeriod: 9,
        emaSlowPeriod: 21,

        // ATR Parameters
        atrPeriod: 14,
        atrMultiplierEntry: 1.5,
        atrMultiplierUnwind: 0.75,

        // Strong Candle Filter
        strongCandleThreshold: 0.6,

        // Gap Handling
        gapUpDownThreshold: 0.5,

        // RSI Parameters
        rsiPeriod: 14,
        rsiEntryLong: 50,
        rsiEntryShort: 50,
        rsiExitLong: 50,
        rsiExitShort: 50,

        // Slope calculation
        slopeLookback: 3,

        // Capital and Risk Management
        capital: 100000,
        maxLossPct: 0.01,
        positionSize: 1,
        maxLots: 5,

        // Pyramiding
        pyramidingEnabled: true,

        // Exit Mode
        exitMode: 'FIFO',

        // Time-based Exits
        misExitTime: '15:15',
        cncExitTime: '15:15',
      };

      const defaultConfig: BacktestConfig = {
        symbol: 'NIFTY',
        timeframe: '15m',
        startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
        endDate: new Date(),
        initialBalance: 100000,
        strategyConfig: defaultStrategyConfig,
      };

      // Merge provided config with defaults
      const finalStrategyConfig = {
        ...defaultStrategyConfig,
        ...(config?.strategyConfig || {}),
      };
      const finalConfig: BacktestConfig = {
        ...defaultConfig,
        ...config,
        strategyConfig: finalStrategyConfig,
      };

      this.logger.debug(`Final config: ${JSON.stringify(finalConfig)}`);
      this.logger.debug(
        `Strategy config: ${JSON.stringify(finalConfig.strategyConfig)}`,
      );

      return await this.runBacktest(finalConfig);
    } catch (error) {
      this.logger.error('Failed to run NIFTY backtest:', error);
      throw error;
    }
  }
}
