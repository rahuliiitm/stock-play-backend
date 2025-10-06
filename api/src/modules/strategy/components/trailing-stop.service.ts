import { Injectable, Logger } from '@nestjs/common';
import { ITrailingStopComponent, TrailingStopConfig, ActiveTrade, TrailingStopResult } from './trailing-stop.interface';
import { TrailingStopFactory } from './trailing-stop.factory';
import { CandleQueryResult } from '../../trading/services/candle-query.service';

@Injectable()
export class TrailingStopService {
  private readonly logger = new Logger(TrailingStopService.name);

  constructor(private readonly trailingStopFactory: TrailingStopFactory) {}

  /**
   * Process trailing stops for all active trades
   * @param trades - Array of active trades
   * @param currentCandle - Current market candle
   * @param atr - Current ATR value
   * @param config - Trailing stop configuration
   * @returns Object containing exit signals and updated trades
   */
  processTrailingStops(
    trades: ActiveTrade[],
    currentCandle: CandleQueryResult,
    atr: number,
    config: TrailingStopConfig
  ): {
    exitSignals: TrailingStopResult[];
    updatedTrades: ActiveTrade[];
  } {
    if (!config.enabled || trades.length === 0) {
      return {
        exitSignals: [],
        updatedTrades: trades
      };
    }

    this.logger.debug(
      `Processing trailing stops for ${trades.length} active trades with config: ${JSON.stringify(config)}`
    );

    // Get the appropriate trailing stop component
    const trailingStopComponent = this.trailingStopFactory.createTrailingStopComponent(config);

    // Update trailing stop prices for all trades
    const updatedTrades = trailingStopComponent.updateTrailingStops(
      trades,
      currentCandle,
      atr,
      config
    );

    // Check for trailing stop exits
    const exitSignals = trailingStopComponent.checkTrailingStops(
      updatedTrades,
      currentCandle,
      atr,
      config
    );

    // Log results
    if (exitSignals.length > 0) {
      this.logger.debug(
        `Trailing stop exits triggered: ${exitSignals.length} trades`
      );
      exitSignals.forEach(signal => {
        this.logger.debug(
          `Trade ${signal.diagnostics.tradeId} trailing stop hit: ` +
          `Entry: ${signal.diagnostics.entryPrice}, ` +
          `Exit: ${signal.exitPrice}, ` +
          `Profit: ${(signal.diagnostics.profitPercentage * 100).toFixed(2)}%`
        );
      });
    }

    return {
      exitSignals,
      updatedTrades
    };
  }

  /**
   * Initialize a new trade with trailing stop tracking
   * @param trade - New trade to initialize
   * @param currentCandle - Current market candle
   * @returns Trade with trailing stop tracking initialized
   */
  initializeTradeTrailingStop(
    trade: ActiveTrade,
    currentCandle: CandleQueryResult
  ): ActiveTrade {
    const initializedTrade = { ...trade };

    // Initialize tracking prices
    if (trade.direction === 'LONG') {
      initializedTrade.highestPrice = currentCandle.high;
    } else {
      initializedTrade.lowestPrice = currentCandle.low;
    }

    initializedTrade.isTrailingActive = false;

    this.logger.debug(
      `Initialized trailing stop tracking for ${trade.direction} trade ${trade.id} at ${trade.entryPrice}`
    );

    return initializedTrade;
  }

  /**
   * Get trailing stop statistics for active trades
   * @param trades - Array of active trades
   * @returns Trailing stop statistics
   */
  getTrailingStopStats(trades: ActiveTrade[]): {
    totalTrades: number;
    activeTrailingStops: number;
    averageProfit: number;
    averageTrailingStopDistance: number;
  } {
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        activeTrailingStops: 0,
        averageProfit: 0,
        averageTrailingStopDistance: 0
      };
    }

    const activeTrailingStops = trades.filter(trade => trade.isTrailingActive).length;
    
    const profits = trades.map(trade => {
      // This would need current price to calculate actual profit
      // For now, return 0 as placeholder
      return 0;
    });

    const averageProfit = profits.reduce((sum, profit) => sum + profit, 0) / profits.length;

    const trailingStopDistances = trades
      .filter(trade => trade.trailingStopPrice)
      .map(trade => Math.abs(trade.entryPrice - (trade.trailingStopPrice || 0)));

    const averageTrailingStopDistance = trailingStopDistances.length > 0
      ? trailingStopDistances.reduce((sum, distance) => sum + distance, 0) / trailingStopDistances.length
      : 0;

    return {
      totalTrades: trades.length,
      activeTrailingStops,
      averageProfit,
      averageTrailingStopDistance
    };
  }
}
