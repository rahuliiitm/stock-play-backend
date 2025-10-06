import {
  IndicatorProvider,
  IndicatorResult,
  TechnicalIndicatorInput,
} from '../indicator-provider.interface';
import { Candle } from '../../../lib/market-data-sdk/models';
import { EMA } from 'technicalindicators';

export class DemaProvider implements IndicatorProvider {
  name = 'DEMA';
  description =
    'Double Exponential Moving Average - Reduces lag compared to regular EMA by using a double-smoothed approach';
  requiredParameters = ['period'];
  optionalParameters = [];
  minDataPoints = 20;

  calculate(
    candles: Candle[],
    parameters: Record<string, any>,
  ): IndicatorResult | null {
    if (candles.length < this.minDataPoints) {
      return null;
    }

    const period = parameters.period || 20;

    // Convert candles to technical indicators input format
    const input: TechnicalIndicatorInput = {
      close: candles.map((c) => c.close),
    };

    try {
      // Calculate first EMA
      const firstEMA = EMA.calculate({
        period: period,
        values: input.close,
      });

      if (firstEMA.length === 0) {
        return null;
      }

      // Calculate second EMA (EMA of the first EMA)
      const secondEMA = EMA.calculate({
        period: period,
        values: firstEMA,
      });

      if (secondEMA.length === 0) {
        return null;
      }

      // Calculate DEMA = 2 * EMA - EMA(EMA)
      const dema: number[] = [];
      const minLength = Math.min(firstEMA.length, secondEMA.length);

      for (let i = 0; i < minLength; i++) {
        const demaValue = 2 * firstEMA[i] - secondEMA[i];
        dema.push(demaValue);
      }

      if (dema.length === 0) {
        return null;
      }

      const latestDema = dema[dema.length - 1];
      const timestamp = candles[candles.length - 1].time;
      const currentPrice = candles[candles.length - 1].close;

      return {
        value: latestDema,
        additionalData: {
          period,
          dema: latestDema,
          firstEMA: firstEMA[firstEMA.length - 1],
          secondEMA: secondEMA[secondEMA.length - 1],
          currentPrice,
          isAbovePrice: latestDema > currentPrice,
          isBelowPrice: latestDema < currentPrice,
          allValues: dema,
        },
        timestamp: new Date(timestamp),
      };
    } catch (error) {
      console.error('DEMA calculation error:', error);
      return null;
    }
  }
}
