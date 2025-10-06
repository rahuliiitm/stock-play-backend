import { Logger } from '@nestjs/common';
import { IStrategy, StrategyConfig, StrategyContext, StrategyEvaluation } from '../interfaces/strategy.interface';
import { SymbolRiskManagement, GlobalStrategyConfig } from '../interfaces/multi-symbol-strategy.interface';
import { MarketDataProvider } from '../../trading/interfaces/data-provider.interface';
import { OrderExecutionProvider, OrderRequest, OrderResult } from '../../trading/interfaces/order-execution.interface';

/**
 * Multi-Symbol Strategy Instance
 * 
 * Represents a strategy instance for a specific symbol with
 * symbol-specific configuration and risk management.
 */
export class MultiSymbolStrategyInstance {
  private readonly logger: Logger;
  
  constructor(
    private readonly symbol: string,
    private readonly strategy: IStrategy,
    private readonly config: Record<string, any>,
    private readonly riskManagement: SymbolRiskManagement,
    private readonly globalConfig: GlobalStrategyConfig,
    private readonly dataProvider?: string,
    private readonly orderExecution?: string,
  ) {
    this.logger = new Logger(`MultiSymbolStrategyInstance-${this.symbol}`);
  }
  
  /**
   * Get the symbol for this instance
   */
  getSymbol(): string {
    return this.symbol;
  }
  
  /**
   * Get the strategy name
   */
  getStrategyName(): string {
    return this.strategy.name;
  }
  
  /**
   * Get the strategy version
   */
  getStrategyVersion(): string {
    return this.strategy.version;
  }
  
  /**
   * Get the strategy description
   */
  getStrategyDescription(): string {
    return this.strategy.description;
  }
  
  /**
   * Evaluate strategy for this specific symbol
   * @param candles - Market candle data
   * @param context - Optional strategy context
   * @returns Strategy evaluation result
   */
  async evaluate(candles: any[], context?: StrategyContext): Promise<StrategyEvaluation> {
    // Apply symbol-specific configuration
    const symbolConfig: StrategyConfig = {
      id: `${this.symbol}-${this.strategy.name}`,
      name: `${this.strategy.name} for ${this.symbol}`,
      symbol: this.symbol,
      timeframe: this.config.timeframe || '15m',
      ...this.config,
    };
    
    // Add global configuration to context
    const enhancedContext: StrategyContext = {
      ...context,
      globalConfig: this.globalConfig,
    };
    
    this.logger.debug(`Evaluating strategy for ${this.symbol} with ${candles.length} candles`);
    
    try {
      // Evaluate strategy with symbol-specific config
      const evaluation = await this.strategy.evaluate(symbolConfig, candles, enhancedContext);
      
      this.logger.debug(`Strategy evaluation for ${this.symbol}: ${evaluation.signals.length} signals`);
      return evaluation;
    } catch (error) {
      this.logger.error(`Strategy evaluation failed for ${this.symbol}:`, error);
      throw new Error(`Strategy evaluation failed for ${this.symbol}: ${error.message}`);
    }
  }
  
  /**
   * Validate strategy configuration for this symbol
   * @returns Validation result
   */
  validateConfig(): { isValid: boolean; errors: string[]; warnings: string[] } {
    const symbolConfig: StrategyConfig = {
      id: `${this.symbol}-${this.strategy.name}`,
      name: `${this.strategy.name} for ${this.symbol}`,
      symbol: this.symbol,
      timeframe: this.config.timeframe || '15m',
      ...this.config,
    };
    
    return this.strategy.validateConfig(symbolConfig);
  }
  
  /**
   * Get default configuration for this symbol
   * @returns Default configuration
   */
  getDefaultConfig(): StrategyConfig {
    const defaultConfig = this.strategy.getDefaultConfig();
    return {
      ...defaultConfig,
      symbol: this.symbol,
    };
  }
  
  /**
   * Apply risk management to an order
   * @param order - Order request
   * @returns Risk-adjusted order
   */
  applyRiskManagement(order: OrderRequest): OrderRequest {
    // Calculate maximum quantity based on risk management
    const maxQuantity = this.calculateMaxQuantity(order.price || 0);
    const adjustedQuantity = Math.min(order.quantity, maxQuantity);
    
    // Apply position sizing mode
    const finalQuantity = this.applyPositionSizing(adjustedQuantity, order.price || 0);
    
    return {
      ...order,
      quantity: finalQuantity,
    };
  }
  
  /**
   * Calculate maximum quantity based on risk management
   * @param price - Order price
   * @returns Maximum allowed quantity
   */
  private calculateMaxQuantity(price: number): number {
    if (price <= 0) return 0;
    
    // Calculate maximum risk amount
    const maxRiskAmount = this.riskManagement.maxLossPct * 100000; // Assuming 100k capital
    
    // Calculate maximum quantity based on risk
    const maxQuantityByRisk = Math.floor(maxRiskAmount / price);
    
    // Apply max lots limit
    const maxQuantityByLots = this.riskManagement.maxLots;
    
    // Return the minimum of both limits
    return Math.min(maxQuantityByRisk, maxQuantityByLots);
  }
  
  /**
   * Apply position sizing mode
   * @param quantity - Base quantity
   * @param price - Order price
   * @returns Adjusted quantity
   */
  private applyPositionSizing(quantity: number, price: number): number {
    switch (this.riskManagement.positionSizingMode) {
      case 'CONSERVATIVE':
        return Math.floor(quantity * 0.5); // 50% of calculated quantity
      case 'AGGRESSIVE':
        return Math.floor(quantity * 1.5); // 150% of calculated quantity
      case 'CUSTOM':
        return quantity; // Use as-is
      default:
        return quantity;
    }
  }
  
  /**
   * Check if order is within risk limits
   * @param order - Order request
   * @returns True if within limits
   */
  isWithinRiskLimits(order: OrderRequest): boolean {
    const maxQuantity = this.calculateMaxQuantity(order.price || 0);
    return order.quantity <= maxQuantity;
  }
  
  /**
   * Get risk management configuration
   * @returns Risk management configuration
   */
  getRiskManagement(): SymbolRiskManagement {
    return { ...this.riskManagement };
  }
  
  /**
   * Get symbol-specific configuration
   * @returns Symbol configuration
   */
  getConfig(): Record<string, any> {
    return { ...this.config };
  }
  
  /**
   * Get global configuration
   * @returns Global configuration
   */
  getGlobalConfig(): GlobalStrategyConfig {
    return { ...this.globalConfig };
  }
  
  /**
   * Get data provider type for this symbol
   * @returns Data provider type
   */
  getDataProviderType(): string {
    return this.dataProvider || 'CSV';
  }
  
  /**
   * Get order execution type for this symbol
   * @returns Order execution type
   */
  getOrderExecutionType(): string {
    return this.orderExecution || 'MOCK';
  }
  
  /**
   * Create a summary of this strategy instance
   * @returns Strategy instance summary
   */
  getSummary(): {
    symbol: string;
    strategyName: string;
    strategyVersion: string;
    config: Record<string, any>;
    riskManagement: SymbolRiskManagement;
    dataProvider: string;
    orderExecution: string;
  } {
    return {
      symbol: this.symbol,
      strategyName: this.strategy.name,
      strategyVersion: this.strategy.version,
      config: this.getConfig(),
      riskManagement: this.getRiskManagement(),
      dataProvider: this.getDataProviderType(),
      orderExecution: this.getOrderExecutionType(),
    };
  }
}
