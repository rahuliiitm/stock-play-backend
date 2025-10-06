import { Injectable, Logger } from '@nestjs/common';
import { MultiSymbolStrategyOrchestrator } from '../../strategy/orchestrators/multi-symbol-strategy-orchestrator.service';
import { 
  MultiSymbolStrategyConfig, 
  MultiSymbolStrategyResults 
} from '../../strategy/interfaces/multi-symbol-strategy.interface';
import { MarketDataProvider } from '../../trading/interfaces/data-provider.interface';
import { OrderExecutionProvider } from '../../trading/interfaces/order-execution.interface';

/**
 * Multi-Symbol Backtest Orchestrator Service
 * 
 * Integrates multi-symbol strategy framework with the existing backtesting system.
 * Provides a unified interface for running multi-symbol backtests.
 */
@Injectable()
export class MultiSymbolBacktestOrchestrator {
  private readonly logger = new Logger(MultiSymbolBacktestOrchestrator.name);
  
  constructor(
    private readonly multiSymbolStrategyOrchestrator?: MultiSymbolStrategyOrchestrator,
  ) {
    // Initialize orchestrator if not provided (for standalone execution)
    if (!this.multiSymbolStrategyOrchestrator) {
      this.multiSymbolStrategyOrchestrator = new MultiSymbolStrategyOrchestrator();
    }
  }
  
  /**
   * Run multi-symbol backtest
   * @param config - Multi-symbol strategy configuration
   * @param dataProvider - Market data provider
   * @param orderExecution - Order execution provider
   * @param startDate - Backtest start date
   * @param endDate - Backtest end date
   * @returns Multi-symbol backtest results
   */
  async runMultiSymbolBacktest(
    config: MultiSymbolStrategyConfig,
    dataProvider: MarketDataProvider,
    orderExecution: OrderExecutionProvider,
    startDate: Date,
    endDate: Date
  ): Promise<MultiSymbolStrategyResults> {
    this.logger.log(`Starting multi-symbol backtest: ${config.strategyName}`);
    this.logger.log(`Symbols: ${config.symbols.map(s => s.symbol).join(', ')}`);
    this.logger.log(`Period: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    try {
      // Set backtest configuration
      config.backtestConfig = {
        startDate,
        endDate,
        initialCapital: 100000,
        commission: 0.001, // 0.1% commission
        slippage: 0.0005, // 0.05% slippage
        enableCrossSymbolAnalysis: true,
        enableCorrelationAnalysis: true,
        enablePortfolioMetrics: true,
      };
      
      // Run multi-symbol strategy
      const results = await this.multiSymbolStrategyOrchestrator?.runMultiSymbolStrategy(
        config,
        dataProvider,
        orderExecution,
        startDate,
        endDate
      );
      
      if (!results) {
        throw new Error('Multi-symbol strategy execution failed');
      }
      
      this.logger.log(`Multi-symbol backtest completed`);
      this.logger.log(`Total trades: ${results.totalTrades}`);
      this.logger.log(`Total return: ${results.totalReturn.toFixed(2)}%`);
      this.logger.log(`Max drawdown: ${results.maxDrawdown.toFixed(2)}%`);
      this.logger.log(`Sharpe ratio: ${results.sharpeRatio.toFixed(2)}`);
      
      return results;
      
    } catch (error) {
      this.logger.error('Multi-symbol backtest failed:', error);
      throw error;
    }
  }
  
  /**
   * Run multi-symbol backtest with CSV data
   * @param config - Multi-symbol strategy configuration
   * @param startDate - Backtest start date
   * @param endDate - Backtest end date
   * @returns Multi-symbol backtest results
   */
  async runMultiSymbolBacktestWithCSV(
    config: MultiSymbolStrategyConfig,
    startDate: Date,
    endDate: Date
  ): Promise<MultiSymbolStrategyResults> {
    this.logger.log(`Starting multi-symbol CSV backtest: ${config.strategyName}`);
    
    try {
      // Import CSV data provider and mock order execution
      const { CsvDataProvider } = await import('../../trading/providers/csv-data-provider.js');
      const { MockOrderExecutionProvider } = await import('../../trading/providers/mock-order-execution.js');
      
      const dataProvider = new CsvDataProvider();
      const orderExecution = new MockOrderExecutionProvider();
      
      // Run backtest
      return await this.runMultiSymbolBacktest(
        config,
        dataProvider,
        orderExecution,
        startDate,
        endDate
      );
      
    } catch (error) {
      this.logger.error('Multi-symbol CSV backtest failed:', error);
      throw error;
    }
  }
  
  /**
   * Get available strategies
   * @returns Array of available strategy names
   */
  getAvailableStrategies(): string[] {
    try {
      return this.multiSymbolStrategyOrchestrator?.['multiSymbolStrategyFactory']?.getAvailableStrategies() || 
             ['advanced-atr', 'ema-gap-atr', 'nifty-options'];
    } catch (error) {
      this.logger.warn('Could not get available strategies:', error.message);
      return ['advanced-atr', 'ema-gap-atr', 'nifty-options']; // Fallback
    }
  }
  
  /**
   * Get strategy information
   * @param strategyName - Strategy name
   * @returns Strategy information
   */
  getStrategyInfo(strategyName: string): { name: string; version: string; description: string } {
    try {
      return this.multiSymbolStrategyOrchestrator?.['multiSymbolStrategyFactory']?.getStrategyInfo(strategyName) || {
        name: strategyName,
        version: '1.0.0',
        description: `${strategyName} strategy`,
      };
    } catch (error) {
      this.logger.warn(`Could not get strategy info for ${strategyName}:`, error.message);
      return {
        name: strategyName,
        version: '1.0.0',
        description: `${strategyName} strategy`,
      };
    }
  }
  
  /**
   * Validate multi-symbol configuration
   * @param config - Configuration to validate
   * @returns Validation result
   */
  validateConfig(config: MultiSymbolStrategyConfig): { isValid: boolean; errors: string[]; warnings: string[] } {
    try {
      return this.multiSymbolStrategyOrchestrator?.['multiSymbolStrategyFactory']?.validateMultiSymbolConfig(config) || {
        isValid: true,
        errors: [],
        warnings: ['Configuration validation not available'],
      };
    } catch (error) {
      this.logger.warn('Could not validate configuration:', error.message);
      return {
        isValid: true,
        errors: [],
        warnings: ['Configuration validation not available'],
      };
    }
  }
}
