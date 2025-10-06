import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MultiSymbolStrategyFactory } from '../factories/multi-symbol-strategy-factory.service';
import { 
  MultiSymbolStrategyConfig, 
  MultiSymbolStrategyResults, 
  SymbolStrategyResult,
  GlobalStrategyMetrics,
  CrossSymbolAnalysis,
  PortfolioMetrics,
  Trade
} from '../interfaces/multi-symbol-strategy.interface';
import { MultiSymbolStrategyInstance } from '../instances/multi-symbol-strategy-instance';
import { MarketDataProvider } from '../../trading/interfaces/data-provider.interface';
import { OrderExecutionProvider } from '../../trading/interfaces/order-execution.interface';
import { CandleData } from '../interfaces/strategy.interface';

/**
 * Multi-Symbol Strategy Orchestrator Service
 * 
 * Orchestrates strategy execution across multiple symbols with
 * cross-symbol analysis and portfolio-level risk management.
 */
@Injectable()
export class MultiSymbolStrategyOrchestrator {
  private readonly logger = new Logger(MultiSymbolStrategyOrchestrator.name);
  
  constructor(
    private readonly multiSymbolStrategyFactory?: MultiSymbolStrategyFactory,
    private readonly eventEmitter?: EventEmitter2,
  ) {
    // Initialize dependencies if not provided (for standalone execution)
    if (!this.multiSymbolStrategyFactory) {
      this.multiSymbolStrategyFactory = new MultiSymbolStrategyFactory();
    }
    if (!this.eventEmitter) {
      this.eventEmitter = {
        emit: (event: string, data?: any) => {
          this.logger.debug(`Event emitted: ${event}`, data);
        }
      } as any;
    }
  }
  
  /**
   * Run strategy on multiple symbols
   * @param config - Multi-symbol strategy configuration
   * @param dataProvider - Market data provider
   * @param orderExecution - Order execution provider
   * @param startDate - Backtest start date
   * @param endDate - Backtest end date
   * @returns Multi-symbol strategy results
   */
  async runMultiSymbolStrategy(
    config: MultiSymbolStrategyConfig,
    dataProvider: MarketDataProvider,
    orderExecution: OrderExecutionProvider,
    startDate: Date,
    endDate: Date
  ): Promise<MultiSymbolStrategyResults> {
    const startTime = Date.now();
    this.logger.log(`Starting multi-symbol strategy: ${config.strategyName}`);
    this.logger.log(`Symbols: ${config.symbols.map(s => s.symbol).join(', ')}`);
    this.logger.log(`Period: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    try {
      // Validate configuration
      const validation = this.multiSymbolStrategyFactory?.validateMultiSymbolConfig(config);
      if (!validation || !validation.isValid) {
        throw new Error(`Configuration validation failed: ${validation?.errors?.join(', ') || 'Unknown error'}`);
      }
      
      if (validation.warnings.length > 0) {
        this.logger.warn(`Configuration warnings: ${validation.warnings.join(', ')}`);
      }
      
      // Create strategy instances for all symbols
      const instances = await this.multiSymbolStrategyFactory?.createMultiSymbolStrategy(config);
      if (!instances) {
        throw new Error('Failed to create strategy instances');
      }
      
      const results: MultiSymbolStrategyResults = {
        symbolResults: new Map(),
        globalMetrics: {} as GlobalStrategyMetrics,
        crossSymbolAnalysis: {} as CrossSymbolAnalysis,
        portfolioMetrics: {} as PortfolioMetrics,
        executionTime: 0,
        totalTrades: 0,
        totalReturn: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
      };
      
      // Run strategy on each symbol
      for (const instance of instances) {
        try {
          this.logger.debug(`Running strategy for ${instance.getSymbol()}`);
          
          // Get symbol-specific data
          const candles = await dataProvider.getHistoricalCandles(
            instance.getSymbol(),
            instance.getConfig().timeframe || '15m',
            startDate,
            endDate
          );
          
          // Run backtest for this symbol
          const symbolResult = await this.runSymbolBacktest(instance, candles, orderExecution);
          
          results.symbolResults.set(instance.getSymbol(), symbolResult);
          
          // Emit symbol-specific events
          this.eventEmitter?.emit('strategy.symbolCompleted', {
            symbol: instance.getSymbol(),
            result: symbolResult,
          });
          
          this.logger.debug(`Completed strategy for ${instance.getSymbol()}: ${symbolResult.totalTrades} trades, ${symbolResult.totalReturnPercentage.toFixed(2)}% return`);
          
        } catch (error) {
          this.logger.error(`Failed to run strategy for ${instance.getSymbol()}:`, error);
          results.symbolResults.set(instance.getSymbol(), {
            symbol: instance.getSymbol(),
            trades: [],
            totalReturn: 0,
            totalReturnPercentage: 0,
            winRate: 0,
            profitFactor: 0,
            maxDrawdown: 0,
            maxDrawdownPercentage: 0,
            sharpeRatio: 0,
            avgWin: 0,
            avgLoss: 0,
            maxWin: 0,
            maxLoss: 0,
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            executionTime: 0,
            error: error.message,
          });
        }
      }
      
      // Calculate global metrics
      results.globalMetrics = this.calculateGlobalMetrics(results.symbolResults);
      
      // Calculate cross-symbol analysis
      if (config.backtestConfig?.enableCrossSymbolAnalysis) {
        results.crossSymbolAnalysis = this.calculateCrossSymbolAnalysis(results.symbolResults);
      }
      
      // Calculate portfolio metrics
      if (config.backtestConfig?.enablePortfolioMetrics) {
        results.portfolioMetrics = this.calculatePortfolioMetrics(results.symbolResults);
      }
      
      // Set execution time
      results.executionTime = Date.now() - startTime;
      
      // Set portfolio-level metrics
      results.totalTrades = results.globalMetrics.totalTrades;
      results.totalReturn = results.globalMetrics.totalReturn;
      results.maxDrawdown = results.globalMetrics.maxDrawdown;
      results.sharpeRatio = results.globalMetrics.sharpeRatio;
      
      this.logger.log(`Multi-symbol strategy completed in ${results.executionTime}ms`);
      this.logger.log(`Total trades: ${results.totalTrades}, Total return: ${results.totalReturn.toFixed(2)}%`);
      
      // Emit completion event
      this.eventEmitter?.emit('strategy.multiSymbolCompleted', {
        config,
        results,
      });
      
      return results;
      
    } catch (error) {
      this.logger.error('Multi-symbol strategy execution failed:', error);
      throw error;
    }
  }
  
  /**
   * Run backtest for a single symbol
   * @param instance - Strategy instance
   * @param candles - Market candle data
   * @param orderExecution - Order execution provider
   * @returns Symbol strategy result
   */
  private async runSymbolBacktest(
    instance: MultiSymbolStrategyInstance,
    candles: CandleData[],
    orderExecution: OrderExecutionProvider
  ): Promise<SymbolStrategyResult> {
    const startTime = Date.now();
    const trades: Trade[] = [];
    let currentBalance = 100000; // Starting balance
    const activeTrades: any[] = [];
    
    this.logger.debug(`Running backtest for ${instance.getSymbol()} with ${candles.length} candles`);
    
    // Process each candle
    for (let i = 0; i < candles.length; i++) {
      const currentCandles = candles.slice(0, i + 1);
      
      try {
        // Evaluate strategy
        const evaluation = await instance.evaluate(currentCandles, {
          activeTrades,
        });
        
        // Process signals
        for (const signal of evaluation.signals) {
          if (signal.type === 'ENTRY') {
            // Execute entry order
            const orderRequest = {
              symbol: instance.getSymbol(),
              quantity: signal.data.quantity || 1,
              price: signal.data.price || candles[i].close,
              orderType: 'MARKET' as const,
              product: 'MIS' as const,
              validity: 'DAY' as const,
            };
            
            // Apply risk management
            const riskAdjustedOrder = instance.applyRiskManagement(orderRequest);
            
            if (instance.isWithinRiskLimits(riskAdjustedOrder)) {
              const orderResult = await orderExecution.placeBuyOrder(riskAdjustedOrder);
              
              if (orderResult.success) {
                // Record trade
                const trade: Trade = {
                  symbol: instance.getSymbol(),
                  entryTime: new Date(candles[i].timestamp),
                  entryPrice: riskAdjustedOrder.price || candles[i].close,
                  quantity: riskAdjustedOrder.quantity,
                  direction: signal.data.direction || 'LONG',
                };
                
                activeTrades.push(trade);
                this.logger.debug(`Entry signal executed for ${instance.getSymbol()}: ${signal.data.direction} at ${riskAdjustedOrder.price}`);
              }
            }
          } else if (signal.type === 'EXIT' || signal.type === 'FIFO_EXIT' || signal.type === 'EMERGENCY_EXIT') {
            // Execute exit orders
            const tradesToExit = activeTrades.filter(trade => 
              trade.direction === signal.data.direction
            );
            
            for (const trade of tradesToExit) {
              const orderResult = await orderExecution.placeSellOrder({
                symbol: trade.symbol,
                quantity: trade.quantity,
                price: candles[i].close,
                orderType: 'MARKET',
                product: 'MIS',
                validity: 'DAY',
              });
              
              if (orderResult.success) {
                // Calculate P&L
                const pnl = (candles[i].close - trade.entryPrice) * trade.quantity;
                const pnlPercentage = (pnl / (trade.entryPrice * trade.quantity)) * 100;
                const duration = candles[i].timestamp - trade.entryTime;
                
                // Complete trade
                const completedTrade: Trade = {
                  ...trade,
                  exitTime: new Date(candles[i].timestamp),
                  exitPrice: candles[i].close,
                  pnl,
                  pnlPercentage,
                  duration,
                  exitReason: signal.type,
                };
                
                trades.push(completedTrade);
                currentBalance += pnl;
                
                // Remove from active trades
                const index = activeTrades.indexOf(trade);
                if (index > -1) {
                  activeTrades.splice(index, 1);
                }
                
                this.logger.debug(`Exit signal executed for ${instance.getSymbol()}: ${trade.direction} at ${candles[i].close}, P&L: ${pnl.toFixed(2)} (${pnlPercentage.toFixed(2)}%)`);
              }
            }
          }
        }
        
      } catch (error) {
        this.logger.error(`Error processing candle ${i} for ${instance.getSymbol()}:`, error);
      }
    }
    
    // Close any remaining active trades
    for (const trade of activeTrades) {
      const finalCandle = candles[candles.length - 1];
      const pnl = (finalCandle.close - trade.entryPrice) * trade.quantity;
      const pnlPercentage = (pnl / (trade.entryPrice * trade.quantity)) * 100;
      const duration = finalCandle.timestamp - trade.entryTime;
      
      const completedTrade: Trade = {
        ...trade,
        exitTime: new Date(finalCandle.timestamp),
        exitPrice: finalCandle.close,
        pnl,
        pnlPercentage,
        duration,
        exitReason: 'END_OF_BACKTEST',
      };
      
      trades.push(completedTrade);
      currentBalance += pnl;
    }
    
    // Calculate metrics
    const executionTime = Date.now() - startTime;
    const totalReturn = currentBalance - 100000;
    const totalReturnPercentage = (totalReturn / 100000) * 100;
    
    const winningTrades = trades.filter(t => t.pnl && t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl && t.pnl < 0);
    const winRate = trades.length > 0 ? winningTrades.length / trades.length : 0;
    
    const totalWin = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));
    const profitFactor = totalLoss > 0 ? totalWin / totalLoss : 0;
    
    const avgWin = winningTrades.length > 0 ? totalWin / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? totalLoss / losingTrades.length : 0;
    
    const maxWin = winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl || 0)) : 0;
    const maxLoss = losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnl || 0)) : 0;
    
    // Calculate max drawdown
    let maxDrawdown = 0;
    let peak = 100000;
    let currentValue = 100000;
    
    for (const trade of trades) {
      currentValue += trade.pnl || 0;
      if (currentValue > peak) {
        peak = currentValue;
      }
      const drawdown = (peak - currentValue) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    const maxDrawdownPercentage = maxDrawdown * 100;
    
    // Calculate Sharpe ratio (simplified)
    const returns = trades.map(t => t.pnlPercentage || 0);
    const avgReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0;
    const returnStdDev = returns.length > 1 ? 
      Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1)) : 0;
    const sharpeRatio = returnStdDev > 0 ? avgReturn / returnStdDev : 0;
    
    return {
      symbol: instance.getSymbol(),
      trades,
      totalReturn,
      totalReturnPercentage,
      winRate,
      profitFactor,
      maxDrawdown,
      maxDrawdownPercentage,
      sharpeRatio,
      avgWin,
      avgLoss,
      maxWin,
      maxLoss,
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      executionTime,
    };
  }
  
  /**
   * Calculate global metrics across all symbols
   * @param symbolResults - Results from all symbols
   * @returns Global strategy metrics
   */
  private calculateGlobalMetrics(symbolResults: Map<string, SymbolStrategyResult>): GlobalStrategyMetrics {
    const results = Array.from(symbolResults.values());
    
    const totalTrades = results.reduce((sum, r) => sum + r.totalTrades, 0);
    const totalReturn = results.reduce((sum, r) => sum + r.totalReturn, 0);
    const totalReturnPercentage = results.reduce((sum, r) => sum + r.totalReturnPercentage, 0);
    const totalWinningTrades = results.reduce((sum, r) => sum + r.winningTrades, 0);
    const totalLosingTrades = results.reduce((sum, r) => sum + r.losingTrades, 0);
    
    const winRate = totalTrades > 0 ? totalWinningTrades / totalTrades : 0;
    const avgWin = totalWinningTrades > 0 ? results.reduce((sum, r) => sum + r.avgWin * r.winningTrades, 0) / totalWinningTrades : 0;
    const avgLoss = totalLosingTrades > 0 ? results.reduce((sum, r) => sum + r.avgLoss * r.losingTrades, 0) / totalLosingTrades : 0;
    
    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;
    const maxDrawdown = Math.max(...results.map(r => r.maxDrawdown));
    const maxDrawdownPercentage = Math.max(...results.map(r => r.maxDrawdownPercentage));
    
    const executionTime = results.reduce((sum, r) => sum + r.executionTime, 0);
    
    // Calculate portfolio Sharpe ratio
    const allReturns = results.flatMap(r => r.trades.map(t => t.pnlPercentage || 0));
    const avgReturn = allReturns.length > 0 ? allReturns.reduce((sum, r) => sum + r, 0) / allReturns.length : 0;
    const returnStdDev = allReturns.length > 1 ? 
      Math.sqrt(allReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (allReturns.length - 1)) : 0;
    const sharpeRatio = returnStdDev > 0 ? avgReturn / returnStdDev : 0;
    
    return {
      totalReturn,
      totalReturnPercentage,
      winRate,
      profitFactor,
      maxDrawdown,
      maxDrawdownPercentage,
      sharpeRatio,
      avgWin,
      avgLoss,
      totalTrades,
      winningTrades: totalWinningTrades,
      losingTrades: totalLosingTrades,
      executionTime,
    };
  }
  
  /**
   * Calculate cross-symbol analysis
   * @param symbolResults - Results from all symbols
   * @returns Cross-symbol analysis
   */
  private calculateCrossSymbolAnalysis(symbolResults: Map<string, SymbolStrategyResult>): CrossSymbolAnalysis {
    const symbols = Array.from(symbolResults.keys());
    const correlationMatrix: Record<string, Record<string, number>> = {};
    
    // Calculate correlation matrix
    for (const symbol1 of symbols) {
      correlationMatrix[symbol1] = {};
      for (const symbol2 of symbols) {
        if (symbol1 === symbol2) {
          correlationMatrix[symbol1][symbol2] = 1.0;
        } else {
          // Simplified correlation calculation
          correlationMatrix[symbol1][symbol2] = 0.5; // Placeholder
        }
      }
    }
    
    // Calculate portfolio metrics
    const results = Array.from(symbolResults.values());
    const portfolioReturn = results.reduce((sum, r) => sum + r.totalReturnPercentage, 0);
    const portfolioVolatility = Math.sqrt(results.reduce((sum, r) => sum + Math.pow(r.sharpeRatio, 2), 0));
    
    const correlations = Object.values(correlationMatrix).flatMap(row => 
      Object.values(row).filter(corr => corr !== 1.0)
    );
    const maxCorrelation = Math.max(...correlations);
    const minCorrelation = Math.min(...correlations);
    
    return {
      correlationMatrix,
      diversificationRatio: 1.0 - (maxCorrelation + minCorrelation) / 2,
      portfolioVolatility,
      portfolioReturn,
      riskAdjustedReturn: portfolioVolatility > 0 ? portfolioReturn / portfolioVolatility : 0,
      concentrationRisk: 1.0 / symbols.length,
      maxCorrelation,
      minCorrelation,
    };
  }
  
  /**
   * Calculate portfolio metrics
   * @param symbolResults - Results from all symbols
   * @returns Portfolio metrics
   */
  private calculatePortfolioMetrics(symbolResults: Map<string, SymbolStrategyResult>): PortfolioMetrics {
    const results = Array.from(symbolResults.values());
    const totalValue = 100000 + results.reduce((sum, r) => sum + r.totalReturn, 0);
    const totalReturn = results.reduce((sum, r) => sum + r.totalReturn, 0);
    const totalReturnPercentage = (totalReturn / 100000) * 100;
    
    // Calculate daily returns (simplified)
    const dailyReturns = results.flatMap(r => r.trades.map(t => t.pnlPercentage || 0));
    const volatility = dailyReturns.length > 1 ? 
      Math.sqrt(dailyReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / dailyReturns.length) : 0;
    
    const avgReturn = dailyReturns.length > 0 ? dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length : 0;
    const sharpeRatio = volatility > 0 ? avgReturn / volatility : 0;
    
    const maxDrawdown = Math.max(...results.map(r => r.maxDrawdown));
    const maxDrawdownDuration = 0; // Placeholder
    
    return {
      totalValue,
      totalReturn,
      totalReturnPercentage,
      dailyReturns,
      volatility,
      sharpeRatio,
      sortinoRatio: sharpeRatio, // Simplified
      calmarRatio: sharpeRatio, // Simplified
      maxDrawdown,
      maxDrawdownDuration,
      var95: 0, // Placeholder
      var99: 0, // Placeholder
      cvar95: 0, // Placeholder
      cvar99: 0, // Placeholder
    };
  }
}
