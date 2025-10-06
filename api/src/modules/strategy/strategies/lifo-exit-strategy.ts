import { Injectable } from '@nestjs/common';
import { ExitStrategy, ActiveTrade } from './exit-strategy.interface';

/**
 * LIFO (Last In, First Out) Exit Strategy
 * 
 * Exits the newest trade first - cuts losses quickly, lets winners run
 * This is better for pyramiding as it preserves profitable early entries
 */
@Injectable()
export class LifoExitStrategy implements ExitStrategy {
  
  getNextTradeToExit(
    activeTrades: ActiveTrade[],
    direction: 'LONG' | 'SHORT'
  ): ActiveTrade | null {
    // Filter trades by direction
    const directionTrades = activeTrades.filter(trade => trade.direction === direction);
    
    if (directionTrades.length === 0) {
      return null;
    }

    // Sort by entry time (newest first) and return the first one
    const sortedTrades = directionTrades.sort((a, b) => b.entryTimestamp - a.entryTimestamp);
    return sortedTrades[0];
  }

  getStrategyName(): string {
    return 'LIFO';
  }
}

