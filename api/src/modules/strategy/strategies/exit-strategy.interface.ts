/**
 * Exit Strategy Interface
 * 
 * Defines the contract for different exit strategies (FIFO, LIFO, etc.)
 * Following SOLID principles for maintainable and extensible code
 */
export interface ExitStrategy {
  /**
   * Get the next trade to exit from the active trades list
   * @param activeTrades - Array of active trades
   * @param direction - Direction of trades to exit ('LONG' | 'SHORT')
   * @returns The trade to exit or null if no trades to exit
   */
  getNextTradeToExit(
    activeTrades: ActiveTrade[],
    direction: 'LONG' | 'SHORT'
  ): ActiveTrade | null;

  /**
   * Get the strategy name for logging and debugging
   */
  getStrategyName(): string;
}

/**
 * Active Trade Interface
 */
export interface ActiveTrade {
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  quantity: number;
  entryTime: Date;
  entryTimestamp: number;
}

