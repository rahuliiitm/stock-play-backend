import { Injectable } from '@nestjs/common';
import { ExitStrategy, ActiveTrade } from './exit-strategy.interface';

/**
 * FIFO (First In, First Out) Exit Strategy
 * 
 * Exits the oldest trade first - takes profits from early entries
 * This can be problematic with pyramiding as it leaves losses in later positions
 */
@Injectable()
export class FifoExitStrategy implements ExitStrategy {
  
  getNextTradeToExit(
    activeTrades: ActiveTrade[],
    direction: 'LONG' | 'SHORT'
  ): ActiveTrade | null {
    // Filter trades by direction
    const directionTrades = activeTrades.filter(trade => trade.direction === direction);
    
    if (directionTrades.length === 0) {
      return null;
    }

    // Sort by entry time (oldest first) and return the first one
    const sortedTrades = directionTrades.sort((a, b) => a.entryTimestamp - b.entryTimestamp);
    return sortedTrades[0];
  }

  getStrategyName(): string {
    return 'FIFO';
  }
}

