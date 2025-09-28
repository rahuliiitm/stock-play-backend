import {
  IndicatorProvider,
  IndicatorResult,
} from '../indicator-provider.interface';
import { Candle } from '../../../lib/market-data-sdk/models';
import { supertrend } from 'supertrend';

export class SupertrendProvider implements IndicatorProvider {
  name = 'SUPERTREND';
  description =
    'Supertrend - Trend following indicator that combines ATR and price action to identify trend direction and potential reversal points';
  requiredParameters = ['period', 'multiplier'];
  optionalParameters = [];
  minDataPoints = 14;

  calculate(
    candles: Candle[],
    parameters: Record<string, any>,
  ): IndicatorResult | null {
    if (candles.length < this.minDataPoints) {
      return null;
    }

    const period = parameters.period || 10;
    const multiplier = parameters.multiplier || 3;

    // Extract OHLC data as array of objects
    const initialArray = candles.map((candle) => ({
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    try {
      // Calculate Supertrend using the library
      const supertrendData = supertrend({
        initialArray,
        period: period,
        multiplier: multiplier,
      });

      if (!supertrendData || supertrendData.length === 0) {
        return null;
      }

      const latestSupertrend = supertrendData[supertrendData.length - 1];
      const timestamp = candles[candles.length - 1].time;

      // Determine trend direction based on current price vs Supertrend
      const currentPrice = candles[candles.length - 1].close;
      const trendDirection =
        currentPrice > latestSupertrend ? 'UPTREND' : 'DOWNTREND';

      // Calculate signal strength (distance from Supertrend)
      const signalStrength =
        (Math.abs(currentPrice - latestSupertrend) / latestSupertrend) * 100;

      return {
        value: latestSupertrend,
        additionalData: {
          trendDirection,
          signalStrength: Number(signalStrength.toFixed(4)),
          period,
          multiplier,
          currentPrice,
          // Include last few Supertrend values for trend analysis
          recentValues: supertrendData.slice(-10),
          // Signal generation logic
          signal: this.generateSignal(
            currentPrice,
            latestSupertrend,
            trendDirection,
            signalStrength,
          ),
          allValues: supertrendData,
        },
        timestamp: new Date(timestamp),
      };
    } catch (error) {
      console.error('Supertrend calculation error:', error);
      return null;
    }
  }

  private generateSignal(
    currentPrice: number,
    supertrendValue: number,
    trendDirection: string,
    signalStrength: number,
  ): 'BUY' | 'SELL' | 'HOLD' {
    // Basic Supertrend signals:
    // - BUY when price crosses above Supertrend (bullish reversal)
    // - SELL when price crosses below Supertrend (bearish reversal)
    // - HOLD when price is above/below Supertrend (trend continuation)

    const priceVsSupertrend = currentPrice - supertrendValue;

    if (trendDirection === 'UPTREND' && priceVsSupertrend > 0) {
      return 'BUY';
    } else if (trendDirection === 'DOWNTREND' && priceVsSupertrend < 0) {
      return 'SELL';
    }

    return 'HOLD';
  }
}
