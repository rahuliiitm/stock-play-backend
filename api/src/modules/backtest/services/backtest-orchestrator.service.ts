import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CsvDataProvider } from '../../trading/providers/csv-data-provider';
import { MockOrderExecutionProvider } from '../../trading/providers/mock-order-execution';
import { StrategyFactory } from '../../strategy/factories/strategy-factory.service';
import { BacktestValidationService } from './backtest-validation.service';
import { BacktestSafetyService } from './backtest-safety.service';
import { TrailingStopService } from '../../strategy/components/trailing-stop.service';
import { TrailingStopConfig, ActiveTrade } from '../../strategy/components/trailing-stop.interface';
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
import { ExitStrategyFactory } from '../../strategy/strategies/exit-strategy-factory';
import { ExitStrategy } from '../../strategy/strategies/exit-strategy.interface';

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
    private readonly strategyFactory: StrategyFactory,
    private readonly validationService: BacktestValidationService,
    private readonly safetyService: BacktestSafetyService,
    private readonly dataService: BacktestDataService,
    private readonly metricsService: BacktestMetricsService,
    private readonly exitStrategyFactory: ExitStrategyFactory,
    private readonly trailingStopService: TrailingStopService,
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
   * Register a strategy with the orchestrator
   */
  registerStrategy(name: string, strategy: any): void {
    this.strategyFactory.register(name, strategy);
    this.logger.debug(`Registered strategy: ${name}`);
  }

  /**
   * Calculate warm-up period using generic indicator analysis
   * @param config - Strategy configuration
   * @returns Number of candles to skip for warm-up period
   */
  private calculateWarmupPeriod(config: any): number {
    this.logger.debug(`Calculating generic warm-up period for strategy: ${config.name || 'Unknown'}`);
    
    const indicatorPeriods: number[] = [];
    
    // Detect all indicator periods in the configuration
    this.detectIndicatorPeriods(config, indicatorPeriods);
    
    // Add buffer period for stability
    const bufferPeriod = 10;
    
    // Calculate maximum period needed
    const maxPeriod = Math.max(...indicatorPeriods, 0);
    const warmupPeriod = maxPeriod + bufferPeriod;
    
    this.logger.debug(`Detected indicator periods: ${indicatorPeriods.join(', ')}`);
    this.logger.debug(`Maximum period: ${maxPeriod}, Buffer: ${bufferPeriod}, Final warm-up: ${warmupPeriod}`);
    
    return warmupPeriod;
  }

  /**
   * Recursively detect all indicator periods in a configuration object
   * @param obj - Configuration object to analyze
   * @param periods - Array to collect detected periods
   */
  private detectIndicatorPeriods(obj: any, periods: number[]): void {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
      return;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      obj.forEach(item => this.detectIndicatorPeriods(item, periods));
      return;
    }

    // Handle objects
    for (const [key, value] of Object.entries(obj)) {
      // Skip non-numeric values
      if (typeof value !== 'number') {
        this.detectIndicatorPeriods(value, periods);
        continue;
      }

      // Detect indicator periods based on common naming patterns
      const period = this.extractIndicatorPeriod(key, value);
      if (period > 0) {
        periods.push(period);
        this.logger.debug(`Detected indicator: ${key} = ${value} (period: ${period})`);
      }
    }
  }

  /**
   * Extract indicator period from a configuration key-value pair
   * @param key - Configuration key
   * @param value - Configuration value
   * @returns Calculated period for the indicator
   */
  private extractIndicatorPeriod(key: string, value: number): number {
    const keyLower = key.toLowerCase();
    
    // EMA indicators
    if (keyLower.includes('ema') && (keyLower.includes('period') || keyLower.includes('fast') || keyLower.includes('slow'))) {
      return value;
    }
    
    // MACD indicators
    if (keyLower.includes('macd') && (keyLower.includes('period') || keyLower.includes('fast') || keyLower.includes('slow') || keyLower.includes('signal'))) {
      return value;
    }
    
    // RSI indicators
    if (keyLower.includes('rsi') && keyLower.includes('period')) {
      return value;
    }
    
    // ATR indicators
    if (keyLower.includes('atr') && keyLower.includes('period')) {
      return value;
    }
    
    // Supertrend indicators
    if (keyLower.includes('supertrend') && keyLower.includes('period')) {
      return value;
    }
    
    // Bollinger Bands
    if (keyLower.includes('bb') && keyLower.includes('period')) {
      return value;
    }
    
    // Stochastic indicators
    if (keyLower.includes('stoch') && keyLower.includes('period')) {
      return value;
    }
    
    // Williams %R
    if (keyLower.includes('williams') && keyLower.includes('period')) {
      return value;
    }
    
    // CCI (Commodity Channel Index)
    if (keyLower.includes('cci') && keyLower.includes('period')) {
      return value;
    }
    
    // ADX (Average Directional Index)
    if (keyLower.includes('adx') && keyLower.includes('period')) {
      return value;
    }
    
    // Parabolic SAR
    if (keyLower.includes('sar') && keyLower.includes('period')) {
      return value;
    }
    
    // Ichimoku Cloud components
    if (keyLower.includes('ichimoku') && keyLower.includes('period')) {
      return value;
    }
    
    // Generic period indicators
    if (keyLower.includes('period') && value > 0) {
      return value;
    }
    
    // Lookback periods
    if (keyLower.includes('lookback') && value > 0) {
      return value;
    }
    
    // Window periods
    if (keyLower.includes('window') && value > 0) {
      return value;
    }
    
    // Length parameters
    if (keyLower.includes('length') && value > 0) {
      return value;
    }
    
    return 0;
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
    let currentBalance = config.initialBalance || 100000;
    let peakBalance = config.initialBalance || 100000;
    let maxDrawdown = 0;
    let currentLots = 0; // Track current position size
    const entryPrice: number = 0; // Track entry price for pyramiding

    // Calculate minimum required candles for proper EMA calculation
    const demaPeriod = (config.strategyConfig as any).demaPeriod || 0;
    
    // For DEMA(52), we need at least 52 candles + buffer for proper calculation
    // Skip first year of data to ensure DEMA values are accurate
    const demaMinCandles = demaPeriod > 0 ? demaPeriod + 20 : 0; // Extra buffer for DEMA
    const minRequiredCandles = Math.max(
      config.strategyConfig.emaSlowPeriod || 21,
      config.strategyConfig.atrPeriod || 14,
      config.strategyConfig.rsiPeriod || 14,
      demaPeriod, // Include DEMA period
      (config.strategyConfig as any).supertrendPeriod || 0, // Include Supertrend period
      demaMinCandles // Ensure we have enough data for DEMA
    );
    
    this.logger.debug(`Backtest execution starting with ${candles.length} candles`);
    this.logger.debug(`Min required candles: ${minRequiredCandles}`);
    this.logger.debug(`Loop will run from index ${minRequiredCandles - 1} to ${candles.length - 1} (${candles.length - minRequiredCandles + 1} iterations)`);
    
    // Process each candle with safety monitoring
    for (let i = minRequiredCandles - 1; i < candles.length; i++) {
      try {
        // Always provide enough historical data for EMA calculations
        // For DEMA(52), we need the full historical data from the beginning
        const currentCandles = candles.slice(0, i + 1);

        // Run strategy evaluation
        this.logger.debug(`🔄 Processing candle ${i + 1}/${candles.length} at ${new Date(candles[i].timestamp).toISOString()}`);
        this.logger.debug(
          `Running strategy evaluation with config: ${JSON.stringify(config.strategyConfig)}`,
        );
        this.logger.debug(`Current candles length: ${currentCandles.length}`);
        this.logger.debug(`Latest candle: ${JSON.stringify(currentCandles[currentCandles.length - 1])}`);
        
        // Use StrategyFactory to get the appropriate strategy
        const strategyName = config.strategyName || 'ema-gap-atr';
        this.logger.debug(`Using StrategyFactory to get strategy: ${strategyName}`);
        
        const strategyConfig = {
          ...config.strategyConfig,
          symbol: config.symbol,
          name: config.strategyConfig.name || strategyName,
        };
        
        const strategy = this.strategyFactory.getStrategy(strategyName);
        
        // Calculate warm-up period using generic calculator
        const warmupPeriod = this.calculateWarmupPeriod(strategyConfig);
        this.logger.debug(`Strategy warm-up period: ${warmupPeriod} candles`);
        
        // Skip processing if we haven't reached the warm-up period
        if (i < warmupPeriod - 1) {
          this.logger.debug(`⏳ Skipping candle ${i + 1} (warm-up period: ${warmupPeriod})`);
          continue;
        }
        
        // Pass context with active trades to strategy
        const context = {
          activeTrades: activeTrades,
          currentBalance: currentBalance,
          currentLots: currentLots
        };
        
        this.logger.debug(`Passing context to strategy: ${JSON.stringify(context)}`);
        this.logger.debug(`Active trades count: ${activeTrades.length}`);
        
        const evaluation = await strategy.evaluate(strategyConfig, currentCandles, context);
        
        this.logger.debug(`Strategy evaluation result: ${JSON.stringify(evaluation, null, 2)}`);

        if (!evaluation || !Array.isArray(evaluation.signals)) {
          this.logger.error(
            `Strategy evaluation returned invalid payload: ${JSON.stringify(evaluation, null, 2)}`,
          );
          continue;
        }
        
        this.logger.debug(`Strategy evaluation returned ${evaluation.signals.length} signals`);

        // Process trailing stops for active trades (if enabled)
        if (config.strategyConfig.trailingStopEnabled && activeTrades.length > 0) {
          this.logger.debug(`Processing trailing stops for ${activeTrades.length} active trades`);
          try {
            // Get current ATR for trailing stop calculations
            const atr = currentCandles.length >= 14 ? 
              this.calculateATR(currentCandles.slice(-14)) : 1.0;
            
            // Process each active trade for trailing stops
            for (let j = activeTrades.length - 1; j >= 0; j--) {
              const trade = activeTrades[j];
              const currentPrice = candles[i].close;
              const currentHigh = candles[i].high;
              const currentLow = candles[i].low;
              
              // Calculate current P&L percentage
              const pnlPercentage = trade.direction === 'LONG'
                ? ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100
                : ((trade.entryPrice - currentPrice) / trade.entryPrice) * 100;
              
              // Update highest/lowest prices
              if (trade.direction === 'LONG') {
                trade.highestPrice = Math.max(trade.highestPrice || trade.entryPrice, currentHigh);
              } else {
                trade.lowestPrice = Math.min(trade.lowestPrice || trade.entryPrice, currentLow);
              }
              
              // Check if trailing stop should be activated
              const activationProfit = (config.strategyConfig.trailingStopActivationProfit || 0.01) * 100;
              this.logger.debug(`Trade P&L: ${pnlPercentage.toFixed(2)}%, Activation threshold: ${activationProfit}%, Trailing active: ${trade.isTrailingActive}`);
              if (pnlPercentage >= activationProfit) {
                trade.isTrailingActive = true;
                this.logger.debug(`Trailing stop activated for ${trade.direction} ${trade.symbol} at ${currentPrice}`);
                
                // Calculate trailing stop price
                let trailingStopPrice = 0;
                if (config.strategyConfig.trailingStopType === 'ATR') {
                  const atrMultiplier = config.strategyConfig.trailingStopATRMultiplier || 2.0;
                  if (trade.direction === 'LONG') {
                    trailingStopPrice = trade.highestPrice - (atr * atrMultiplier);
                  } else {
                    trailingStopPrice = trade.lowestPrice + (atr * atrMultiplier);
                  }
                } else {
                  const percentage = config.strategyConfig.trailingStopPercentage || 0.02;
                  if (trade.direction === 'LONG') {
                    trailingStopPrice = trade.highestPrice * (1 - percentage);
                  } else {
                    trailingStopPrice = trade.lowestPrice * (1 + percentage);
                  }
                }
                
                // Update trailing stop price (only move in favorable direction)
                if (trade.direction === 'LONG') {
                  trade.trailingStopPrice = Math.max(trade.trailingStopPrice || 0, trailingStopPrice);
                } else {
                  trade.trailingStopPrice = trade.trailingStopPrice === 0 ? trailingStopPrice : 
                    Math.min(trade.trailingStopPrice, trailingStopPrice);
                }
                
                // Check if trailing stop is triggered
                let shouldExit = false;
                if (trade.direction === 'LONG' && currentPrice <= trade.trailingStopPrice) {
                  shouldExit = true;
                } else if (trade.direction === 'SHORT' && currentPrice >= trade.trailingStopPrice) {
                  shouldExit = true;
                }
                
                if (shouldExit) {
                  this.logger.debug(`Trailing stop exit triggered for ${trade.direction} ${trade.symbol} at ${currentPrice}`);
                  
                  // Execute trailing stop exit
                  const orderResult = await this.orderExecution.placeSellOrder({
                    symbol: trade.symbol,
                    quantity: Math.abs(trade.quantity),
                    price: currentPrice,
                    orderType: 'MARKET',
                    product: 'MIS',
                    validity: 'DAY',
                  });

                  if (orderResult.success) {
                    this.logger.debug(
                      `Trailing stop exit executed: ${trade.direction} at ${currentPrice} (quantity: ${Math.abs(trade.quantity)})`
                    );

                    // Calculate P&L and add to trades array
                    const pnl = trade.direction === 'LONG' 
                      ? (currentPrice - trade.entryPrice) * trade.quantity
                      : (trade.entryPrice - currentPrice) * trade.quantity;
                    const duration = candles[i].timestamp - trade.entryTime;

                    const completedTrade = {
                      entryTime: new Date(trade.entryTime),
                      exitTime: new Date(candles[i].timestamp),
                      symbol: trade.symbol,
                      direction: trade.direction,
                      entryPrice: trade.entryPrice,
                      exitPrice: currentPrice,
                      quantity: Math.abs(trade.quantity),
                      pnl,
                      pnlPercentage,
                      duration,
                    };

                    trades.push(completedTrade);
                    currentBalance += pnl;

                    // Remove from active trades
                    activeTrades.splice(j, 1);
                    currentLots -= Math.abs(trade.quantity);

                    this.logger.debug(
                      `Trailing stop trade closed: ${trade.direction} ${trade.symbol} P&L: ${pnl.toFixed(2)} (${pnlPercentage.toFixed(2)}%)`
                    );
                  }
                }
              }
            }
          } catch (error) {
            this.logger.error(`Error processing trailing stops: ${error.message}`);
          }
        }

        // Note: Stop loss will be checked AFTER signals are processed to prioritize Supertrend flips

        // Process profit targets for active trades (if enabled)
        if ((config.strategyConfig as any).profitTargetEnabled && activeTrades.length > 0) {
          this.logger.debug(`Processing profit targets for ${activeTrades.length} active trades`);
          const profitTargetPercentage = (config.strategyConfig as any).profitTargetPercentage || 0.025;
          
          for (let j = activeTrades.length - 1; j >= 0; j--) {
            const trade = activeTrades[j];
            const currentPrice = candles[i].close;
            const profitPct = trade.direction === 'LONG' 
              ? (currentPrice - trade.entryPrice) / trade.entryPrice
              : (trade.entryPrice - currentPrice) / trade.entryPrice;
            
            if (profitPct >= profitTargetPercentage) {
              this.logger.debug(`Profit target hit: ${trade.direction} ${trade.symbol} at ${currentPrice} (${(profitPct * 100).toFixed(2)}%)`);
              
              // Execute profit target exit
              const orderResult = await this.orderExecution.placeSellOrder({
                symbol: trade.symbol,
                quantity: Math.abs(trade.quantity),
                price: currentPrice,
                orderType: 'MARKET',
                product: 'MIS',
                validity: 'DAY',
              });

              if (orderResult.success) {
                // Calculate P&L and add to trades array
                const pnl = trade.direction === 'LONG' 
                  ? (currentPrice - trade.entryPrice) * trade.quantity
                  : (trade.entryPrice - currentPrice) * trade.quantity;
                const duration = candles[i].timestamp - trade.entryTime;

                const completedTrade = {
                  entryTime: new Date(trade.entryTime),
                  exitTime: new Date(candles[i].timestamp),
                  symbol: trade.symbol,
                  direction: trade.direction,
                  entryPrice: trade.entryPrice,
                  exitPrice: currentPrice,
                  quantity: trade.quantity,
                  pnl: pnl,
                  duration: duration,
                  exitReason: 'PROFIT_TARGET'
                };

                trades.push(completedTrade);
                this.logger.log(`🎯 PROFIT TARGET EXIT: ${trade.direction} ${trade.symbol} @ ₹${currentPrice}`);
                this.logger.log(`   Entry: ₹${trade.entryPrice} at ${new Date(trade.entryTime).toISOString()}`);
                this.logger.log(`   P&L: ₹${pnl.toFixed(2)} (${(profitPct * 100).toFixed(2)}%)`);

                // Remove from active trades
                activeTrades.splice(j, 1);
                currentLots--;
                currentBalance += pnl;
              }
            }
          }
        }

        // Check for price action strategy exit conditions (price closes below/above entry Supertrend value)
        if (config.strategyName === 'price-action' && activeTrades.length > 0) {
          for (let j = activeTrades.length - 1; j >= 0; j--) {
            const trade = activeTrades[j];
            const currentPrice = candles[i].close;
            
            // Check if trade has entrySupertrend metadata
            if (trade.metadata && trade.metadata.entrySupertrend) {
              const entrySupertrend = trade.metadata.entrySupertrend;
              let shouldExit = false;
              let exitReason = '';
              
              if (trade.direction === 'LONG' && currentPrice < entrySupertrend) {
                shouldExit = true;
                exitReason = 'PRICE_BELOW_ENTRY_SUPERTREND';
              } else if (trade.direction === 'SHORT' && currentPrice > entrySupertrend) {
                shouldExit = true;
                exitReason = 'PRICE_ABOVE_ENTRY_SUPERTREND';
              }
              
              if (shouldExit) {
                this.logger.log(`📉 PRICE ACTION EXIT: ${trade.direction} ${trade.symbol} @ ₹${currentPrice}`);
                this.logger.log(`   Entry: ₹${trade.entryPrice} at ${new Date(trade.entryTime).toISOString()}`);
                this.logger.log(`   Entry Supertrend: ₹${entrySupertrend}`);
                this.logger.log(`   Exit Reason: ${exitReason}`);
                
                const orderResult = await this.orderExecution.placeSellOrder({
                  symbol: trade.symbol,
                  quantity: Math.abs(trade.quantity),
                  price: currentPrice,
                  orderType: 'MARKET',
                  product: 'MIS',
                  validity: 'DAY',
                });

                if (orderResult.success) {
                  // Calculate P&L
                  const pnl = trade.direction === 'LONG' 
                    ? (currentPrice - trade.entryPrice) * trade.quantity
                    : (trade.entryPrice - currentPrice) * trade.quantity;
                  const pnlPercentage = (pnl / (trade.entryPrice * Math.abs(trade.quantity))) * 100;
                  
                  const completedTrade = {
                    entryTime: new Date(trade.entryTime),
                    exitTime: new Date(candles[i].timestamp),
                    symbol: trade.symbol,
                    direction: trade.direction,
                    entryPrice: trade.entryPrice,
                    exitPrice: currentPrice,
                    quantity: Math.abs(trade.quantity),
                    pnl,
                    pnlPercentage,
                    duration: candles[i].timestamp - trade.entryTime,
                    exitReason: exitReason,
                  };
                  
                  trades.push(completedTrade);
                  currentBalance += pnl;
                  currentLots--;
                  
                  this.logger.log(`   P&L: ₹${pnl.toFixed(2)} (${pnlPercentage.toFixed(2)}%)`);
                  
                  // Remove from active trades
                  activeTrades.splice(j, 1);
                }
              }
            }
          }
        }

        // Execute signals with safety checks
        this.logger.debug(`Processing ${evaluation.signals.length} signals`);
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
          this.logger.debug(`Signal direction: ${signal.data.direction}`);
          this.logger.debug(`Signal price: ${signal.data.price}`);
          
          if (signal.type === 'ENTRY') {
            const direction = signal.data.direction;
            const entryPrice = signal.data.price;
            
            this.logger.debug(`ENTRY signal: direction=${direction}, price=${entryPrice}`);
            
            // CRITICAL FIX: For trend-following strategy, only allow one active position at a time
            if (activeTrades.length > 0) {
              this.logger.debug(`Skipping entry: ${activeTrades.length} active trades already exist`);
              continue;
            }
            
            // Dynamic position sizing based on available capital and current price
            const maxTradePercent = (config.strategyConfig as any).maxTradePercent || 0.9; // Default 90% of balance
            const availableCapital = currentBalance * maxTradePercent;
            
            // Calculate position size based on available capital and current price
            let quantity;
            this.logger.debug(`Dynamic position sizing check: ${(config.strategyConfig as any).dynamicPositionSizing} (type: ${typeof (config.strategyConfig as any).dynamicPositionSizing})`);
            if ((config.strategyConfig as any).dynamicPositionSizing === true) {
              // Dynamic sizing: use available capital to determine position size
              const basePositionSize = (config.strategyConfig as any).basePositionSize || 1;
              const maxPositionValue = availableCapital;
              quantity = Math.floor(maxPositionValue / entryPrice);
              
              // Ensure minimum position size
              quantity = Math.max(quantity, basePositionSize);
              
              this.logger.debug(`Dynamic position sizing: Available capital: ₹${availableCapital.toFixed(2)}, Price: ₹${entryPrice}, Calculated quantity: ${quantity}`);
            } else {
              // Fixed position sizing (original logic)
              quantity = config.strategyConfig.positionSize;
            }

            // Check if we can afford the trade
            const tradeCost = entryPrice * quantity;
            if (tradeCost > availableCapital) {
              this.logger.warn(
                `Trade rejected: cost ${tradeCost} exceeds ${(maxTradePercent * 100).toFixed(0)}% of balance (${availableCapital.toFixed(2)})`,
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
              // Log detailed trade entry
              const entryTime = new Date(candles[i].timestamp).toISOString();
              this.logger.log(`📈 TRADE ENTRY #${activeTrades.length + 1}: ${direction} ${signal.data.symbol} @ ₹${entryPrice} at ${entryTime}`);
              
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
                // ATR value for dynamic stop loss
                atrValue: currentCandles.length > 0 ? this.calculateATR(currentCandles.slice(-14)) : 0,
                // Trailing stop fields
                highestPrice: entryPrice,
                lowestPrice: entryPrice,
                trailingStopPrice: 0,
                isTrailingActive: false,
                // Store metadata for price action strategy
                metadata: signal.data.metadata || {}
              });

              currentLots += quantity;
              // Track the first entry price for pyramiding calculations
            }
          } else if (signal.type === 'EXIT') {
            // Use config-driven exit strategy (FIFO/LIFO)
            const exitMode = config.strategyConfig.exitMode;
            
            this.logger.debug(
              `Using ${exitMode} exit strategy for ${signal.data.direction} positions`
            );

            // Get trades to exit based on strategy
            let directionTrades;
            if (signal.data.direction === 'BOTH') {
              // Exit all active trades when Supertrend flips
              directionTrades = activeTrades;
              this.logger.debug(`Exiting all active trades (${activeTrades.length}) due to Supertrend flip`);
            } else {
              // Exit trades of specific direction
              directionTrades = activeTrades.filter(
                (trade) => trade.direction === signal.data.direction,
              );
            }

            if (directionTrades.length === 0) {
              this.logger.debug(`No ${signal.data.direction} trades to exit`);
              continue;
            }

            // Sort trades based on exit strategy
            let tradesToExit;
            if (exitMode === 'LIFO') {
              // LIFO: Exit newest trades first (sort by entry time descending)
              tradesToExit = directionTrades.sort((a, b) => b.entryTimestamp - a.entryTimestamp);
              this.logger.debug(`LIFO: Exiting ${tradesToExit.length} trades (newest first)`);
            } else {
              // FIFO: Exit oldest trades first (sort by entry time ascending)
              tradesToExit = directionTrades.sort((a, b) => a.entryTimestamp - b.entryTimestamp);
              this.logger.debug(`FIFO: Exiting ${tradesToExit.length} trades (oldest first)`);
            }

            // Exit positions one by one
            for (const trade of tradesToExit) {
              const orderResult = await this.orderExecution.placeSellOrder({
                symbol: trade.symbol,
                quantity: Math.abs(trade.quantity),
                price: candles[i].close, // Use current candle close price, not signal price
                orderType: 'MARKET',
                product: 'MIS',
                validity: 'DAY',
              });

              if (orderResult.success) {
                // Safely format entry timestamp
                let entryTimeStr = 'Invalid timestamp';
                try {
                  const entryDate = new Date(trade.entryTimestamp);
                  if (!isNaN(entryDate.getTime())) {
                    entryTimeStr = entryDate.toISOString();
                  }
                } catch (error) {
                  this.logger.warn(`Invalid entry timestamp: ${trade.entryTimestamp}`);
                }
                
                // Calculate P&L
                const exitPrice = candles[i].close;
                // For LONG: profit when exit > entry, for SHORT: profit when entry > exit
                const pnl = trade.direction === 'LONG' 
                  ? (exitPrice - trade.entryPrice) * trade.quantity
                  : (trade.entryPrice - exitPrice) * trade.quantity;
                const pnlPercentage = trade.direction === 'LONG'
                  ? ((exitPrice - trade.entryPrice) / trade.entryPrice) * 100
                  : ((trade.entryPrice - exitPrice) / trade.entryPrice) * 100;
                const exitTime = new Date(candles[i].timestamp).toISOString();
                
                // Log detailed trade exit
                this.logger.log(`📉 TRADE EXIT: ${trade.direction} ${trade.symbol} @ ₹${exitPrice} at ${exitTime}`);
                this.logger.log(`   Entry: ₹${trade.entryPrice} at ${entryTimeStr}`);
                this.logger.log(`   P&L: ₹${pnl.toFixed(2)} (${pnlPercentage.toFixed(2)}%)`);
                
                this.logger.debug(
                  `${exitMode} exit executed: ${trade.direction} at ${candles[i].close} (entry: ${trade.entryPrice}, entry time: ${entryTimeStr})`
                );
                
                // CRITICAL FIX: Calculate P&L and add to trades array
                const finalPnl = trade.direction === 'LONG' 
                  ? (candles[i].close - trade.entryPrice) * trade.quantity
                  : (trade.entryPrice - candles[i].close) * trade.quantity;
                const finalPnlPercentage = (finalPnl / (trade.entryPrice * Math.abs(trade.quantity))) * 100;
                const duration = candles[i].timestamp - trade.entryTime;
                
                const completedTrade = {
                  entryTime: new Date(trade.entryTime),
                  exitTime: new Date(candles[i].timestamp),
                  symbol: trade.symbol,
                  direction: trade.direction,
                  entryPrice: trade.entryPrice,
                  exitPrice: candles[i].close, // Use current candle close price
                  quantity: Math.abs(trade.quantity),
                  pnl,
                  pnlPercentage,
                  duration,
                };
                
                // Add completed trade to trades array
                trades.push(completedTrade);
                
                // Update balance with realized P&L
                currentBalance += pnl;
                
                this.logger.debug(
                  `Trade closed: ${trade.direction} ${trade.symbol} P&L: ${pnl.toFixed(2)} (${pnlPercentage.toFixed(2)}%)`
                );
                
                // Remove the exited trade from active trades
                const tradeIndex = activeTrades.findIndex(
                  activeTrade => activeTrade === trade
                );
                if (tradeIndex !== -1) {
                  activeTrades.splice(tradeIndex, 1);
                  currentLots -= Math.abs(trade.quantity);
                }
              }
            }
          }
        }

        // Check for stop loss exits AFTER signals are processed (only when Supertrend is still intact)
        if ((config.strategyConfig as any).stopLossEnabled && activeTrades.length > 0) {
          const currentPrice = candles[i].close;
          const stopLossType = (config.strategyConfig as any).stopLossType || 'percentage';
          
          // Only check stop loss on candle close for the given timeframe
          // This ensures we don't exit on intraday movements
          for (let j = activeTrades.length - 1; j >= 0; j--) {
            const trade = activeTrades[j];
            let shouldExit = false;
            let exitReason = '';
            
            if (stopLossType === 'ATR') {
              // ATR-based stop loss
              const stopLossATRMultiplier = (config.strategyConfig as any).stopLossATRMultiplier || 2.0;
              const atrValue = trade.atrValue || 0; // ATR value at entry
              const stopLossDistance = atrValue * stopLossATRMultiplier;
              
              if (trade.direction === 'LONG') {
                const stopLossPrice = trade.entryPrice - stopLossDistance;
                if (currentPrice <= stopLossPrice) {
                  shouldExit = true;
                  exitReason = `ATR Stop loss triggered: ${((trade.entryPrice - currentPrice) / trade.entryPrice * 100).toFixed(2)}% loss`;
                }
              } else if (trade.direction === 'SHORT') {
                const stopLossPrice = trade.entryPrice + stopLossDistance;
                if (currentPrice >= stopLossPrice) {
                  shouldExit = true;
                  exitReason = `ATR Stop loss triggered: ${((currentPrice - trade.entryPrice) / trade.entryPrice * 100).toFixed(2)}% loss`;
                }
              }
            } else {
              // Percentage-based stop loss (original logic)
              const stopLossPercentage = (config.strategyConfig as any).stopLossPercentage || 0.03;
              
              if (trade.direction === 'LONG') {
                const lossPercentage = (trade.entryPrice - currentPrice) / trade.entryPrice;
                if (lossPercentage >= stopLossPercentage) {
                  shouldExit = true;
                  exitReason = `Stop loss triggered: ${(lossPercentage * 100).toFixed(2)}% loss`;
                }
              } else if (trade.direction === 'SHORT') {
                const lossPercentage = (currentPrice - trade.entryPrice) / trade.entryPrice;
                if (lossPercentage >= stopLossPercentage) {
                  shouldExit = true;
                  exitReason = `Stop loss triggered: ${(lossPercentage * 100).toFixed(2)}% loss`;
                }
              }
            }
            
            if (shouldExit) {
              this.logger.warn(`🛑 ${exitReason} for ${trade.direction} ${trade.symbol} @ ₹${currentPrice}`);
              
              // Execute stop loss exit
              const orderResult = await this.orderExecution.placeSellOrder({
                symbol: trade.symbol,
                quantity: Math.abs(trade.quantity),
                price: currentPrice,
                orderType: 'MARKET',
                product: 'MIS',
                validity: 'DAY',
              });

              if (orderResult.success) {
                // Calculate P&L
                const pnl = trade.direction === 'LONG' 
                  ? (currentPrice - trade.entryPrice) * trade.quantity
                  : (trade.entryPrice - currentPrice) * trade.quantity;
                
                const completedTrade = {
                  entryTime: new Date(trade.entryTime),
                  exitTime: new Date(candles[i].timestamp),
                  symbol: trade.symbol,
                  direction: trade.direction,
                  entryPrice: trade.entryPrice,
                  exitPrice: currentPrice,
                  quantity: Math.abs(trade.quantity),
                  pnl,
                  pnlPercentage: (pnl / (trade.entryPrice * Math.abs(trade.quantity))) * 100,
                  duration: candles[i].timestamp - trade.entryTime,
                };

                trades.push(completedTrade);
                
                // Update balance with realized P&L
                currentBalance += pnl;
                
                this.logger.log(`📉 STOP LOSS EXIT: ${trade.direction} ${trade.symbol} @ ₹${currentPrice}`);
                this.logger.log(`   Entry: ₹${trade.entryPrice} at ${new Date(trade.entryTime).toISOString()}`);
                this.logger.log(`   P&L: ₹${pnl.toFixed(2)} (${((pnl / (trade.entryPrice * Math.abs(trade.quantity))) * 100).toFixed(2)}%)`);
              }
              
              // Remove the trade from active trades
              activeTrades.splice(j, 1);
              currentLots = Math.max(0, currentLots - Math.abs(trade.quantity));
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
            // For LONG: profit when exit > entry, for SHORT: profit when entry > exit
            const pnl = trade.direction === 'LONG' 
              ? (exitPrice - trade.entryPrice) * trade.quantity
              : (trade.entryPrice - exitPrice) * trade.quantity;
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
            
            // Update balance with realized P&L
            currentBalance += pnl;
            
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

        // Time-based exit check (only if misExitTime is configured)
        if (config.strategyConfig.misExitTime) {
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
              const pnl = trade.direction === 'LONG' 
                ? (candles[i].close - trade.entryPrice) * trade.quantity
                : (trade.entryPrice - candles[i].close) * trade.quantity;
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
              
              // Update balance with realized P&L
              currentBalance += pnl;
              
              this.logger.debug(
                `Time-based exit: ${trade.direction} ${trade.symbol} P&L: ${pnl.toFixed(2)} (${pnlPercentage.toFixed(2)}%)`,
              );
            }
          }

          activeTrades.length = 0; // Clear all active trades
          currentLots = 0;
          }
        }

        // Capital protection: Check if total P&L is below max loss threshold (configurable)
        const enableCapitalProtection = (config.strategyConfig as any).enableCapitalProtection !== false;
        if (enableCapitalProtection) {
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
                // For LONG: profit when exit > entry, for SHORT: profit when entry > exit
                const pnl = trade.direction === 'LONG' 
                  ? (candles[i].close - trade.entryPrice) * trade.quantity
                  : (trade.entryPrice - candles[i].close) * trade.quantity;
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
                
                // Update balance with realized P&L
                currentBalance += pnl;
              }
            }

            activeTrades.length = 0;
            currentLots = 0;
            break;
          }
        }

        // Circuit breaker: Stop if drawdown exceeds threshold (configurable)
        const enableCircuitBreaker = (config.strategyConfig as any).enableCircuitBreaker !== false;
        const maxDrawdownThreshold = (config.strategyConfig as any).maxDrawdown || 0.5;
        if (enableCircuitBreaker && drawdown > maxDrawdownThreshold) {
          this.logger.error(
            `Circuit breaker triggered: drawdown ${(drawdown * 100).toFixed(2)}% exceeds ${(maxDrawdownThreshold * 100).toFixed(2)}%`,
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

    // CRITICAL FIX: Close any remaining active trades
    if (activeTrades.length > 0) {
      this.logger.warn(`Closing ${activeTrades.length} remaining active trades at end of backtest`);
      const finalCandle = candles[candles.length - 1];
      
      for (const trade of activeTrades) {
        const exitPrice = finalCandle.close;
        // For LONG: profit when exit > entry, for SHORT: profit when entry > exit
        const pnl = trade.direction === 'LONG' 
          ? (exitPrice - trade.entryPrice) * trade.quantity
          : (trade.entryPrice - exitPrice) * trade.quantity;
        const pnlPercentage = (pnl / (trade.entryPrice * Math.abs(trade.quantity))) * 100;
        const duration = finalCandle.timestamp - trade.entryTime;
        
        // Log final trade closure
        const entryTime = new Date(trade.entryTime).toISOString();
        const exitTime = new Date(finalCandle.timestamp).toISOString();
        this.logger.log(`🏁 FINAL TRADE EXIT: ${trade.direction} ${trade.symbol} @ ₹${exitPrice} at ${exitTime}`);
        this.logger.log(`   Entry: ₹${trade.entryPrice} at ${entryTime}`);
        this.logger.log(`   P&L: ₹${pnl.toFixed(2)} (${pnlPercentage.toFixed(2)}%)`);
        
        const completedTrade = {
          entryTime: new Date(trade.entryTime),
          exitTime: new Date(finalCandle.timestamp),
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
        currentBalance += pnl;
        
        this.logger.debug(
          `Final trade closed: ${trade.direction} ${trade.symbol} P&L: ${pnl.toFixed(2)} (${pnlPercentage.toFixed(2)}%)`
        );
      }
    }
    
    // SAFEGUARD: Validate trade tracking consistency
    if (trades.length === 0 && activeTrades.length > 0) {
      this.logger.error('CRITICAL: Active trades exist but no completed trades! Trade tracking failed.');
    }
    
    // Calculate final results with safety validation
    // Use the tracked currentBalance instead of MockOrderExecutionProvider balance
    const totalReturn = currentBalance - config.initialBalance;
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
      initialCapital: config.initialBalance || 100000,
      finalCapital: (config.initialBalance || 100000) + totalReturn,
      maxWin: trades.length > 0 ? Math.max(...trades.map(t => t.pnl).filter(pnl => pnl > 0), 0) : 0,
      maxLoss: trades.length > 0 ? Math.min(...trades.map(t => t.pnl).filter(pnl => pnl < 0), 0) : 0,
    };

    return result;
  }

  /**
   * Calculate ATR (Average True Range) for trailing stop calculations
   */
  private calculateATR(candles: any[]): number {
    if (candles.length < 2) return 1.0;

    let trueRanges: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      const current = candles[i];
      const previous = candles[i - 1];
      
      const highLow = current.high - current.low;
      const highClose = Math.abs(current.high - previous.close);
      const lowClose = Math.abs(current.low - previous.close);
      
      const trueRange = Math.max(highLow, highClose, lowClose);
      trueRanges.push(trueRange);
    }

    if (trueRanges.length === 0) return 1.0;
    
    const atr = trueRanges.reduce((sum, tr) => sum + tr, 0) / trueRanges.length;
    return atr;
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
