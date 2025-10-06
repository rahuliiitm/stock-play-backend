/**
 * Unified Strategy Interface
 * 
 * This interface defines the contract for all strategy implementations,
 * enabling configuration-driven strategy selection and maximum reusability.
 */

export interface IStrategy {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  
  /**
   * Evaluate strategy for given configuration and market data
   * @param config - Strategy configuration
   * @param candles - Market candle data
   * @param context - Optional strategy context (active trades, market data, etc.)
   * @returns Strategy evaluation result with signals and diagnostics
   */
  evaluate(
    config: StrategyConfig,
    candles: CandleData[],
    context?: StrategyContext
  ): Promise<StrategyEvaluation>;
  
  /**
   * Validate strategy configuration
   * @param config - Configuration to validate
   * @returns Validation result with errors and warnings
   */
  validateConfig(config: any): ValidationResult;
  
  /**
   * Get default configuration for this strategy
   * @returns Default strategy configuration
   */
  getDefaultConfig(): StrategyConfig;
  
  /**
   * Calculate the minimum number of candles needed for reliable indicator values
   * @param config - Strategy configuration
   * @returns Number of candles to skip for warm-up period
   * @deprecated Use WarmupCalculatorService.calculateWarmupPeriod() for generic calculation
   */
  getWarmupPeriod(config: StrategyConfig): number;
}

export interface StrategyConfig {
  id: string;
  name: string;
  symbol: string;
  timeframe: string;
  [key: string]: any; // Allow strategy-specific configuration
}

export interface StrategyContext {
  activeTrades?: ActiveTrade[];
  marketData?: Record<string, any>;
  previousSignals?: StrategySignal[];
  indicators?: Record<string, IndicatorValue>;
  globalConfig?: GlobalStrategyConfig;
}

export interface StrategyEvaluation {
  signals: StrategySignal[];
  diagnostics: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface StrategySignal {
  type: 'ENTRY' | 'EXIT' | 'ADJUSTMENT' | 'PYRAMIDING' | 'FIFO_EXIT' | 'EMERGENCY_EXIT';
  strength: number; // 0-100
  confidence: number; // 0-100
  data: Record<string, any>;
  timestamp: Date;
}

export interface ActiveTrade {
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  quantity: number;
  entryTime: number;
  highestPrice?: number;
  lowestPrice?: number;
  trailingStopPrice?: number;
  isTrailingActive?: boolean;
  metadata?: Record<string, any>;
}

export interface IndicatorValue {
  value: number;
  timestamp: Date;
  additionalData?: Record<string, any>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface GlobalStrategyConfig {
  maxConcurrentPositions: number;
  maxTotalRisk: number;
  correlationLimit?: number;
  maxDrawdownPct?: number;
}

export interface CandleData {
  symbol: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timeframe: string;
}

