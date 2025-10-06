/**
 * Multi-Symbol Strategy Configuration Interface
 * 
 * This interface defines the configuration for running the same strategy
 * across multiple symbols with different parameters and risk management.
 */

export interface MultiSymbolStrategyConfig {
  strategyName: string;  // 'advanced-atr', 'ema-crossover', etc.
  symbols: SymbolConfig[];
  globalConfig: GlobalStrategyConfig;
  backtestConfig?: MultiSymbolBacktestConfig;
}

export interface SymbolConfig {
  symbol: string;  // 'NIFTY', 'BANKNIFTY', etc.
  timeframe: string;
  strategyConfig: Record<string, any>;  // Symbol-specific parameters
  riskManagement: SymbolRiskManagement;
  dataProvider?: string;  // Optional: different data providers per symbol
  orderExecution?: string;  // Optional: different order execution per symbol
}

export interface SymbolRiskManagement {
  maxLots: number;
  maxLossPct: number;
  positionSizingMode: 'CONSERVATIVE' | 'AGGRESSIVE' | 'CUSTOM';
  stopLossPct?: number;
  takeProfitPct?: number;
  maxDrawdownPct?: number;
  trailingStopEnabled?: boolean;
  trailingStopType?: 'ATR' | 'PERCENTAGE';
  trailingStopATRMultiplier?: number;
  trailingStopPercentage?: number;
  trailingStopActivationProfit?: number;
}

export interface GlobalStrategyConfig {
  maxConcurrentPositions: number;
  maxTotalRisk: number;
  correlationLimit?: number;
  maxDrawdownPct?: number;
  portfolioRebalancing?: boolean;
  rebalancingFrequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
}

export interface MultiSymbolBacktestConfig {
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  commission?: number;
  slippage?: number;
  enableCrossSymbolAnalysis?: boolean;
  enableCorrelationAnalysis?: boolean;
  enablePortfolioMetrics?: boolean;
}

export interface MultiSymbolStrategyResults {
  symbolResults: Map<string, SymbolStrategyResult>;
  globalMetrics: GlobalStrategyMetrics;
  crossSymbolAnalysis: CrossSymbolAnalysis;
  portfolioMetrics: PortfolioMetrics;
  executionTime: number;
  totalTrades: number;
  totalReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
}

export interface SymbolStrategyResult {
  symbol: string;
  trades: Trade[];
  totalReturn: number;
  totalReturnPercentage: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  maxDrawdownPercentage: number;
  sharpeRatio: number;
  avgWin: number;
  avgLoss: number;
  maxWin: number;
  maxLoss: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  executionTime: number;
  error?: string;
}

export interface Trade {
  symbol: string;
  entryTime: Date;
  exitTime?: Date;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  direction: 'LONG' | 'SHORT';
  pnl?: number;
  pnlPercentage?: number;
  duration?: number;
  exitReason?: string;
}

export interface GlobalStrategyMetrics {
  totalReturn: number;
  totalReturnPercentage: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  maxDrawdownPercentage: number;
  sharpeRatio: number;
  avgWin: number;
  avgLoss: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  executionTime: number;
}

export interface CrossSymbolAnalysis {
  correlationMatrix: Record<string, Record<string, number>>;
  diversificationRatio: number;
  portfolioVolatility: number;
  portfolioReturn: number;
  riskAdjustedReturn: number;
  concentrationRisk: number;
  maxCorrelation: number;
  minCorrelation: number;
}

export interface PortfolioMetrics {
  totalValue: number;
  totalReturn: number;
  totalReturnPercentage: number;
  dailyReturns: number[];
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  maxDrawdownDuration: number;
  var95: number;
  var99: number;
  cvar95: number;
  cvar99: number;
}


