import { CandleQueryResult } from '../../trading/services/candle-query.service';

export interface TrailingStopConfig {
  enabled: boolean;
  type: 'ATR' | 'PERCENTAGE';
  atrMultiplier: number;           // ATR multiplier (e.g., 2.0 = 2x ATR)
  percentage: number;              // Percentage (e.g., 0.02 = 2%)
  activationProfit: number;        // Minimum profit % to activate (e.g., 0.01 = 1%)
  maxTrailDistance?: number;       // Maximum trailing distance (optional)
}

export interface ActiveTrade {
  id: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  entryTime: number;
  quantity: number;
  symbol: string;
  highestPrice?: number;           // For LONG positions
  lowestPrice?: number;            // For SHORT positions
  trailingStopPrice?: number;      // Current trailing stop price
  isTrailingActive?: boolean;      // Whether trailing stop is active
}

export interface TrailingStopResult {
  shouldExit: boolean;
  exitPrice: number;
  reason: string;
  diagnostics: {
    tradeId: string;
    entryPrice: number;
    currentPrice: number;
    profit: number;
    profitPercentage: number;
    trailingStopPrice: number;
    trailingStopDistance: number;
    isTrailingActive: boolean;
  };
}

export interface ITrailingStopComponent {
  /**
   * Check if trailing stop should be triggered for active trades
   * @param trades - Array of active trades
   * @param currentCandle - Current market candle
   * @param atr - Current ATR value
   * @param config - Trailing stop configuration
   * @returns Array of trailing stop results
   */
  checkTrailingStops(
    trades: ActiveTrade[],
    currentCandle: CandleQueryResult,
    atr: number,
    config: TrailingStopConfig
  ): TrailingStopResult[];

  /**
   * Update trailing stop prices for active trades
   * @param trades - Array of active trades
   * @param currentCandle - Current market candle
   * @param atr - Current ATR value
   * @param config - Trailing stop configuration
   * @returns Updated trades with new trailing stop prices
   */
  updateTrailingStops(
    trades: ActiveTrade[],
    currentCandle: CandleQueryResult,
    atr: number,
    config: TrailingStopConfig
  ): ActiveTrade[];
}


