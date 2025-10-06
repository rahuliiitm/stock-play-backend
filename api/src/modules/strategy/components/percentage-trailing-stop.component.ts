import { Injectable, Logger } from '@nestjs/common';
import { ITrailingStopComponent, TrailingStopConfig, ActiveTrade, TrailingStopResult } from './trailing-stop.interface';
import { CandleQueryResult } from '../../trading/services/candle-query.service';

@Injectable()
export class PercentageTrailingStopComponent implements ITrailingStopComponent {
  private readonly logger = new Logger(PercentageTrailingStopComponent.name);

  checkTrailingStops(
    trades: ActiveTrade[],
    currentCandle: CandleQueryResult,
    atr: number,
    config: TrailingStopConfig
  ): TrailingStopResult[] {
    if (!config.enabled || trades.length === 0) {
      return [];
    }

    const results: TrailingStopResult[] = [];

    for (const trade of trades) {
      const result = this.checkTradeTrailingStop(trade, currentCandle, atr, config);
      if (result.shouldExit) {
        results.push(result);
      }
    }

    return results;
  }

  updateTrailingStops(
    trades: ActiveTrade[],
    currentCandle: CandleQueryResult,
    atr: number,
    config: TrailingStopConfig
  ): ActiveTrade[] {
    if (!config.enabled) {
      return trades;
    }

    return trades.map(trade => this.updateTradeTrailingStop(trade, currentCandle, atr, config));
  }

  private checkTradeTrailingStop(
    trade: ActiveTrade,
    currentCandle: CandleQueryResult,
    atr: number,
    config: TrailingStopConfig
  ): TrailingStopResult {
    const currentPrice = currentCandle.close;
    const profit = trade.direction === 'LONG' 
      ? currentPrice - trade.entryPrice 
      : trade.entryPrice - currentPrice;
    const profitPercentage = profit / trade.entryPrice;

    // Check if minimum profit threshold is met
    if (profitPercentage < config.activationProfit) {
      return {
        shouldExit: false,
        exitPrice: currentPrice,
        reason: 'INSUFFICIENT_PROFIT',
        diagnostics: {
          tradeId: trade.id,
          entryPrice: trade.entryPrice,
          currentPrice,
          profit,
          profitPercentage,
          trailingStopPrice: trade.trailingStopPrice || 0,
          trailingStopDistance: 0,
          isTrailingActive: false
        }
      };
    }

    let trailingStopPrice: number;
    let shouldExit = false;

    if (trade.direction === 'LONG') {
      // For LONG positions, trail stop below highest price by percentage
      const highestPrice = Math.max(trade.highestPrice || trade.entryPrice, currentCandle.high);
      trailingStopPrice = highestPrice * (1 - config.percentage);
      
      // Check if current price has hit trailing stop
      shouldExit = currentPrice <= trailingStopPrice;
    } else {
      // For SHORT positions, trail stop above lowest price by percentage
      const lowestPrice = Math.min(trade.lowestPrice || trade.entryPrice, currentCandle.low);
      trailingStopPrice = lowestPrice * (1 + config.percentage);
      
      // Check if current price has hit trailing stop
      shouldExit = currentPrice >= trailingStopPrice;
    }

    return {
      shouldExit,
      exitPrice: shouldExit ? trailingStopPrice : currentPrice,
      reason: shouldExit ? 'TRAILING_STOP_HIT' : 'TRAILING_STOP_ACTIVE',
      diagnostics: {
        tradeId: trade.id,
        entryPrice: trade.entryPrice,
        currentPrice,
        profit,
        profitPercentage,
        trailingStopPrice,
        trailingStopDistance: Math.abs(currentPrice - trailingStopPrice),
        isTrailingActive: true
      }
    };
  }

  private updateTradeTrailingStop(
    trade: ActiveTrade,
    currentCandle: CandleQueryResult,
    atr: number,
    config: TrailingStopConfig
  ): ActiveTrade {
    const currentPrice = currentCandle.close;
    const profit = trade.direction === 'LONG' 
      ? currentPrice - trade.entryPrice 
      : trade.entryPrice - currentPrice;
    const profitPercentage = profit / trade.entryPrice;

    // Only update if minimum profit threshold is met
    if (profitPercentage < config.activationProfit) {
      return trade;
    }

    const updatedTrade = { ...trade };

    if (trade.direction === 'LONG') {
      // Update highest price for LONG positions
      const newHighestPrice = Math.max(
        trade.highestPrice || trade.entryPrice, 
        currentCandle.high
      );
      updatedTrade.highestPrice = newHighestPrice;
      updatedTrade.trailingStopPrice = newHighestPrice * (1 - config.percentage);
    } else {
      // Update lowest price for SHORT positions
      const newLowestPrice = Math.min(
        trade.lowestPrice || trade.entryPrice, 
        currentCandle.low
      );
      updatedTrade.lowestPrice = newLowestPrice;
      updatedTrade.trailingStopPrice = newLowestPrice * (1 + config.percentage);
    }

    updatedTrade.isTrailingActive = true;

    this.logger.debug(
      `Updated percentage trailing stop for ${trade.direction} trade ${trade.id}: ` +
      `Entry: ${trade.entryPrice}, Current: ${currentPrice}, ` +
      `Trailing Stop: ${updatedTrade.trailingStopPrice}, Profit: ${(profitPercentage * 100).toFixed(2)}%`
    );

    return updatedTrade;
  }
}


