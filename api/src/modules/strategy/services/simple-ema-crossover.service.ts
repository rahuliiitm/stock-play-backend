import { Injectable, Logger } from '@nestjs/common';
import { StrategySignal } from './strategy-building-blocks.service';
import { EmaProvider } from '../../indicators/providers/ema.provider';

export interface SimpleEmaCrossoverConfig {
  id: string;
  name: string;
  symbol: string;
  timeframe: string;
  emaFastPeriod: number;
  emaSlowPeriod: number;
  rsiPeriod: number;
  rsiEntryLong: number;
  rsiEntryShort: number;
  capital: number;
  maxLossPct: number;
  positionSize: number;
  maxLots: number;
  pyramidingEnabled: boolean;
  exitMode: string;
  misExitTime: string;
  cncExitTime: string;
}

@Injectable()
export class SimpleEmaCrossoverService {
  private readonly logger = new Logger(SimpleEmaCrossoverService.name);

  constructor(private readonly emaProvider: EmaProvider) {}

  evaluate(
    candles: any[],
    config: SimpleEmaCrossoverConfig,
  ): StrategySignal[] {
    const signals: StrategySignal[] = [];

    if (candles.length < Math.max(config.emaFastPeriod, config.emaSlowPeriod) + 5) {
      this.logger.warn(`Insufficient data: ${candles.length} candles, need at least ${Math.max(config.emaFastPeriod, config.emaSlowPeriod) + 5}`);
      return signals;
    }

    try {
      // Calculate EMAs
      const fastEma = this.emaProvider.calculate(candles, { period: config.emaFastPeriod });
      const slowEma = this.emaProvider.calculate(candles, { period: config.emaSlowPeriod });

      if (!fastEma?.additionalData?.allValues || !slowEma?.additionalData?.allValues) {
        this.logger.warn('Insufficient EMA data for crossover detection');
        return signals;
      }

      const fastValues = fastEma.additionalData.allValues;
      const slowValues = slowEma.additionalData.allValues;

      if (fastValues.length < 2 || slowValues.length < 2) {
        this.logger.warn('Insufficient EMA data for crossover detection');
        return signals;
      }

      const latestCandle = candles[candles.length - 1];
      const currentFast = fastValues[fastValues.length - 1];
      const currentSlow = slowValues[slowValues.length - 1];
      const prevFast = fastValues[fastValues.length - 2];
      const prevSlow = slowValues[slowValues.length - 2];

      // Detect crossovers
      const crossedUp = prevFast <= prevSlow && currentFast > currentSlow;
      const crossedDown = prevFast >= prevSlow && currentFast < currentSlow;

      this.logger.debug(`EMA Crossover Check: Fast=${currentFast.toFixed(2)}, Slow=${currentSlow.toFixed(2)}, CrossedUp=${crossedUp}, CrossedDown=${crossedDown}`);

      // Generate signals based on crossovers
      if (crossedUp) {
        signals.push({
          type: 'ENTRY',
          strength: 100,
          confidence: 100,
          timestamp: latestCandle.timestamp,
          data: {
            price: latestCandle.close,
            symbol: config.symbol,
            timeframe: config.timeframe,
            diagnostics: {
              fastEma: currentFast,
              slowEma: currentSlow,
              prevFastEma: prevFast,
              prevSlowEma: prevSlow,
              crossedUp: true,
              crossedDown: false,
            },
          },
        });
        this.logger.log(`🟢 LONG signal generated: Fast EMA (${currentFast.toFixed(2)}) crossed above Slow EMA (${currentSlow.toFixed(2)})`);
      }

      if (crossedDown) {
        signals.push({
          type: 'ENTRY',
          strength: 100,
          confidence: 100,
          timestamp: latestCandle.timestamp,
          data: {
            price: latestCandle.close,
            symbol: config.symbol,
            timeframe: config.timeframe,
            diagnostics: {
              fastEma: currentFast,
              slowEma: currentSlow,
              prevFastEma: prevFast,
              prevSlowEma: prevSlow,
              crossedUp: false,
              crossedDown: true,
            },
          },
        });
        this.logger.log(`🔴 SHORT signal generated: Fast EMA (${currentFast.toFixed(2)}) crossed below Slow EMA (${currentSlow.toFixed(2)})`);
      }

      // Generate exit signals on opposite crossovers
      if (crossedDown) {
        signals.push({
          type: 'EXIT',
          strength: 100,
          confidence: 100,
          timestamp: latestCandle.timestamp,
          data: {
            price: latestCandle.close,
            symbol: config.symbol,
            timeframe: config.timeframe,
            diagnostics: {
              fastEma: currentFast,
              slowEma: currentSlow,
              prevFastEma: prevFast,
              prevSlowEma: prevSlow,
              crossedUp: false,
              crossedDown: true,
            },
          },
        });
        this.logger.log(`🟡 LONG exit signal generated: Fast EMA crossed below Slow EMA`);
      }

      if (crossedUp) {
        signals.push({
          type: 'EXIT',
          strength: 100,
          confidence: 100,
          timestamp: latestCandle.timestamp,
          data: {
            price: latestCandle.close,
            symbol: config.symbol,
            timeframe: config.timeframe,
            diagnostics: {
              fastEma: currentFast,
              slowEma: currentSlow,
              prevFastEma: prevFast,
              prevSlowEma: prevSlow,
              crossedUp: true,
              crossedDown: false,
            },
          },
        });
        this.logger.log(`🟡 SHORT exit signal generated: Fast EMA crossed above Slow EMA`);
      }

      this.logger.debug(`Generated ${signals.length} signals for ${config.symbol}`);

    } catch (error) {
      this.logger.error(`Error evaluating simple EMA crossover strategy: ${error.message}`);
    }

    return signals;
  }
}
